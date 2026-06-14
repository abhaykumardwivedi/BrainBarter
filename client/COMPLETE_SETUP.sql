-- ============================================================
-- BrainBarter — COMPLETE / AUTHORITATIVE SETUP
-- Safe to re-run (idempotent). Captures everything the live DB
-- needs that was previously created by hand and never committed:
--   • profiles table + auto-create trigger (50 starter tokens)
--   • secure profiles RLS (blocks client token_balance/role edits)
--   • credit_purchase  (token purchase — REQUIRED by payment flow)
--   • request_withdrawal, rate_content (run in-session, now versioned)
--   • increment_views
--   • email_verification_codes (survives server restarts; used by authController)
-- Run AFTER supabase_schema.sql.  Run order does not matter much
-- because every statement is guarded with if-not-exists / replace.
-- ============================================================

-- ============= EMAIL VERIFICATION CODES =============
-- Replaces in-memory Map in authController — survives server cold-starts.
-- authController upserts on email (one pending code per address at a time).
-- verifyCode deletes on success; row is also auto-deleted after 10 minutes
-- by a scheduled job or by the next upsert (TTL enforced in application logic).
create table if not exists email_verification_codes (
  email      text primary key,
  code       text not null,
  expires_at timestamptz not null,
  created_at timestamptz default now()
);

-- Only the server (service_role) touches this table — no RLS needed for clients
alter table email_verification_codes enable row level security;
drop policy if exists "No client access to verification codes" on email_verification_codes;
create policy "No client access to verification codes" on email_verification_codes
  for all using (false); -- blocks all client access; service_role bypasses RLS

-- ============= PROFILES (the table everything references) =============
create table if not exists profiles (
  id            uuid primary key references auth.users(id) on delete cascade,
  username      text,
  email         text,
  bio           text,
  avatar_url    text,
  token_balance integer default 50,
  is_verified   boolean default false,
  role          text    default 'user' check (role in ('user','admin')),
  created_at    timestamptz default now()
);

alter table profiles enable row level security;

-- public read (leaderboard, creator names, admin lists)
drop policy if exists "Anyone can read profiles" on profiles;
create policy "Anyone can read profiles" on profiles for select using (true);

-- secure update: a user may edit their OWN row, but may NOT change
-- their token_balance or role from the client. Those only move via
-- the SECURITY DEFINER functions below.
drop policy if exists "Users can update own profile" on profiles;
create policy "Users can update own profile" on profiles
  for update using (auth.uid() = id)
  with check (
    auth.uid() = id
    and token_balance = (select token_balance from profiles where id = auth.uid())
    and role          = (select role          from profiles where id = auth.uid())
  );

-- ============= AUTO-CREATE PROFILE ON SIGNUP (50 tokens) =============
create or replace function handle_new_user()
returns trigger as $$
begin
  insert into profiles (id, email, username, token_balance)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'username', split_part(new.email, '@', 1)),
    50
  )
  on conflict (id) do nothing;
  return new;
end;
$$ language plpgsql security definer;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function handle_new_user();

-- ============= TOKEN PURCHASE (idempotent) =============
-- Called by server/controllers/paymentController.js AFTER it verifies the
-- Razorpay signature. Idempotent on payment_id so a retried/duplicated
-- verify call can never credit tokens twice. Returns the new balance.
create table if not exists purchases (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid references profiles(id) on delete cascade,
  payment_id text unique not null,
  tokens     integer not null,
  inr        text,
  created_at timestamptz default now()
);

create or replace function credit_purchase(
  p_user_id uuid, p_tokens integer, p_inr text, p_payment_id text
) returns integer as $$
declare v_balance integer;
begin
  -- Already credited this payment? Return current balance, do nothing else.
  if exists (select 1 from purchases where payment_id = p_payment_id) then
    select token_balance into v_balance from profiles where id = p_user_id;
    return v_balance;
  end if;

  insert into purchases (user_id, payment_id, tokens, inr)
  values (p_user_id, p_payment_id, p_tokens, p_inr);

  update profiles set token_balance = token_balance + p_tokens
  where id = p_user_id
  returning token_balance into v_balance;

  insert into token_transactions (user_id, type, amount, reason)
  values (p_user_id, 'earn', p_tokens, 'Token purchase: ₹' || coalesce(p_inr, ''));

  return v_balance;
end;
$$ language plpgsql security definer;
grant execute on function credit_purchase(uuid, integer, text, text) to authenticated, service_role;

-- ============= ATOMIC, SAFE WITHDRAWAL =============
create or replace function request_withdrawal(
  p_tokens integer, p_method text, p_inr numeric,
  p_upi text default null, p_bank_name text default null,
  p_account text default null, p_ifsc text default null, p_holder text default null
) returns void as $$
declare v_user uuid := auth.uid(); v_bal integer;
begin
  if v_user is null then raise exception 'Not authenticated'; end if;
  select token_balance into v_bal from profiles where id = v_user;
  if v_bal < p_tokens then raise exception 'Insufficient token balance'; end if;
  if p_tokens < 625 then raise exception 'Minimum withdrawal is 625 tokens'; end if;

  update profiles set token_balance = token_balance - p_tokens where id = v_user;

  insert into withdrawal_requests
    (user_id, tokens_amount, inr_amount, method, upi_id, bank_name, account_number, ifsc_code, account_holder)
  values (v_user, p_tokens, p_inr, p_method, p_upi, p_bank_name, p_account, p_ifsc, p_holder);

  insert into token_transactions (user_id, type, amount, reason)
  values (v_user, 'spend', p_tokens, 'Withdrawal request: ₹' || p_inr);
end;
$$ language plpgsql security definer;
grant execute on function request_withdrawal(integer,text,numeric,text,text,text,text,text) to authenticated;

-- ============= RATE CONTENT (blocks self-rating token farm) =============
create or replace function rate_content(p_content_id uuid, p_stars integer)
returns void as $$
declare v_user uuid := auth.uid(); v_already boolean; v_creator uuid;
begin
  if v_user is null then raise exception 'Not authenticated'; end if;
  if p_stars < 1 or p_stars > 5 then raise exception 'Stars must be between 1 and 5'; end if;
  select creator_id into v_creator from content where id = p_content_id;
  select exists (select 1 from ratings where user_id = v_user and content_id = p_content_id) into v_already;
  insert into ratings (user_id, content_id, stars) values (v_user, p_content_id, p_stars)
    on conflict (user_id, content_id) do update set stars = excluded.stars;
  -- award +2 only on first rating AND only if not rating your own upload
  if not v_already and v_creator <> v_user then
    update profiles set token_balance = token_balance + 2 where id = v_user;
    insert into token_transactions (user_id, type, amount, reason, ref_id)
    values (v_user, 'earn', 2, 'Rated content', p_content_id);
  end if;
end;
$$ language plpgsql security definer;
grant execute on function rate_content(uuid, integer) to authenticated;

-- ============= VIEW COUNTER =============
create or replace function increment_views(content_id uuid) returns void as $$
  update content set views = coalesce(views, 0) + 1 where id = content_id;
$$ language sql security definer;
grant execute on function increment_views(uuid) to anon, authenticated;

-- ============= USER FEEDBACK =============
-- Floating "Feedback" button (client) inserts here. Admin Panel reads it.
create table if not exists feedback (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid references profiles(id) on delete set null,
  category   text not null default 'Other',
  message    text not null,
  status     text not null default 'new' check (status in ('new', 'reviewed', 'done')),
  created_at timestamptz default now()
);

alter table feedback enable row level security;

-- Anyone (logged in or anonymous) may submit feedback
drop policy if exists "Anyone can submit feedback" on feedback;
create policy "Anyone can submit feedback" on feedback
  for insert with check (true);

-- A user can read their own submissions
drop policy if exists "Users read own feedback" on feedback;
create policy "Users read own feedback" on feedback
  for select using (auth.uid() = user_id);

-- Admins can read/update all feedback (Admin Panel)
drop policy if exists "Admins manage feedback" on feedback;
create policy "Admins manage feedback" on feedback
  for all using (
    exists (select 1 from profiles where id = auth.uid() and role = 'admin')
  );

-- ============= RAG: VECTOR SEARCH OVER UPLOADED CONTENT =============
-- The AI tutor answers grounded in the actual text of uploaded notes/PDFs.
-- On upload, the server extracts text, splits it into chunks, embeds each
-- chunk (Gemini text-embedding-004, 768-dim) and stores it here. At query
-- time it embeds the student's question and finds the closest chunks.
create extension if not exists vector;

create table if not exists content_chunks (
  id          bigserial primary key,
  content_id  uuid references content(id) on delete cascade,
  chunk_index int  not null,
  chunk_text  text not null,
  embedding   vector(768),
  created_at  timestamptz default now()
);

create index if not exists content_chunks_content_id_idx
  on content_chunks (content_id);
-- Approximate-nearest-neighbour index for fast cosine similarity search
create index if not exists content_chunks_embedding_idx
  on content_chunks using ivfflat (embedding vector_cosine_ops) with (lists = 100);

-- Only the server (service_role) reads/writes chunks; clients go through the API
alter table content_chunks enable row level security;
drop policy if exists "No client access to chunks" on content_chunks;
create policy "No client access to chunks" on content_chunks
  for all using (false);

-- Semantic search: closest chunks of ONE content item to a query embedding.
-- similarity = 1 - cosine_distance (higher = more relevant).
create or replace function match_content_chunks(
  p_content_id uuid,
  query_embedding vector(768),
  match_count int default 6
)
returns table (chunk_text text, chunk_index int, similarity float)
language sql stable as $$
  select chunk_text,
         chunk_index,
         1 - (embedding <=> query_embedding) as similarity
  from content_chunks
  where content_id = p_content_id
  order by embedding <=> query_embedding
  limit match_count;
$$;
grant execute on function match_content_chunks(uuid, vector, int) to service_role, authenticated;

-- ============= MAKE brainbarter01@gmail.com ADMIN =============
update profiles set role = 'admin'
where id = (select id from auth.users where email = 'brainbarter01@gmail.com');
