-- ============================================================
-- BrainBarter — COMPLETE DATABASE FIX
-- Paste this entire file into the Supabase SQL editor and run.
-- It is fully idempotent — safe to run multiple times.
-- ============================================================

-- ============= EXTENSIONS =============
create extension if not exists "uuid-ossp";
create extension if not exists "vector";
create extension if not exists "pg_trgm";

-- ============= EMAIL VERIFICATION CODES =============
create table if not exists email_verification_codes (
  email      text primary key,
  code       text not null,
  expires_at timestamptz not null,
  created_at timestamptz default now()
);
alter table email_verification_codes enable row level security;
drop policy if exists "No client access to verification codes" on email_verification_codes;
create policy "No client access to verification codes" on email_verification_codes
  for all using (false);

-- ============= SUBJECTS =============
create table if not exists subjects (
  id        uuid primary key default gen_random_uuid(),
  name      text not null unique,
  semester  integer,
  created_at timestamptz default now()
);
alter table subjects enable row level security;
drop policy if exists "Anyone can read subjects" on subjects;
create policy "Anyone can read subjects" on subjects for select using (true);

-- Seed common subjects
insert into subjects (name, semester) values
  ('Mathematics', 1), ('Physics', 1), ('Chemistry', 1),
  ('English', 1), ('Computer Science', 2), ('Data Structures', 2),
  ('Algorithms', 3), ('Database Management', 3), ('Operating Systems', 4),
  ('Computer Networks', 4), ('Software Engineering', 5),
  ('Artificial Intelligence', 5), ('Machine Learning', 6),
  ('Web Development', 6), ('System Design', 7), ('Compiler Design', 7),
  ('Digital Electronics', 3), ('Microprocessors', 4),
  ('Automata Theory', 5), ('Object Oriented Programming', 2)
on conflict (name) do nothing;

-- ============= UNITS (for nested progress tracking) =============
create table if not exists units (
  id         uuid primary key default gen_random_uuid(),
  subject_id uuid references subjects(id) on delete cascade,
  name       text not null,
  created_at timestamptz default now()
);
alter table units enable row level security;
drop policy if exists "Anyone can read units" on units;
create policy "Anyone can read units" on units for select using (true);

-- ============= TOPICS =============
create table if not exists topics (
  id         uuid primary key default gen_random_uuid(),
  unit_id    uuid references units(id) on delete cascade,
  name       text not null,
  created_at timestamptz default now()
);
alter table topics enable row level security;
drop policy if exists "Anyone can read topics" on topics;
create policy "Anyone can read topics" on topics for select using (true);

-- ============= PROFILES =============
create table if not exists profiles (
  id            uuid primary key references auth.users(id) on delete cascade,
  username      text,
  email         text,
  bio           text,
  avatar_url    text,
  token_balance integer default 50,
  is_verified   boolean default false,
  role          text default 'user' check (role in ('user', 'creator', 'admin')),
  created_at    timestamptz default now()
);
alter table profiles enable row level security;
drop policy if exists "Anyone can read profiles" on profiles;
create policy "Anyone can read profiles" on profiles for select using (true);

drop policy if exists "Users can insert own profile" on profiles;
create policy "Users can insert own profile" on profiles
  for insert with check (auth.uid() = id);

drop policy if exists "Users can update own profile" on profiles;
create policy "Users can update own profile" on profiles
  for update using (auth.uid() = id)
  with check (
    auth.uid() = id
    and token_balance = (select token_balance from profiles where id = auth.uid())
    and role = (select role from profiles where id = auth.uid())
  );

-- ============= CONTENT =============
create table if not exists content (
  id            uuid primary key default gen_random_uuid(),
  creator_id    uuid references profiles(id) on delete cascade,
  title         text not null,
  description   text,
  type          text not null check (type in ('video', 'notes')),
  file_url      text not null,
  thumbnail_url text,
  token_cost    integer default 20,
  difficulty    text default 'medium' check (difficulty in ('beginner', 'medium', 'advanced')),
  tags          text[] default '{}',
  is_published  boolean default false,
  views         integer default 0,
  subject_id    uuid references subjects(id) on delete set null,
  subject_name  text,
  topic_name    text,
  topic_id      uuid references topics(id) on delete set null,
  created_at    timestamptz default now()
);
alter table content enable row level security;

drop policy if exists "Anyone can read published content" on content;
create policy "Anyone can read published content" on content
  for select using (is_published = true or creator_id = auth.uid() or
    exists (select 1 from profiles where id = auth.uid() and role = 'admin'));

drop policy if exists "Creators can insert content" on content;
create policy "Creators can insert content" on content
  for insert with check (auth.uid() = creator_id);

drop policy if exists "Creators can update own content" on content;
create policy "Creators can update own content" on content
  for update using (auth.uid() = creator_id or
    exists (select 1 from profiles where id = auth.uid() and role = 'admin'));

drop policy if exists "Creators can delete own content" on content;
create policy "Creators can delete own content" on content
  for delete using (auth.uid() = creator_id or
    exists (select 1 from profiles where id = auth.uid() and role = 'admin'));

-- Missing columns guard
do $$ begin
  begin alter table content add column subject_name text; exception when duplicate_column then null; end;
  begin alter table content add column topic_name text; exception when duplicate_column then null; end;
  begin alter table content add column subject_id uuid references subjects(id) on delete set null; exception when duplicate_column then null; end;
  begin alter table content add column topic_id uuid references topics(id) on delete set null; exception when duplicate_column then null; end;
  begin alter table content add column views integer default 0; exception when duplicate_column then null; end;
end $$;

-- ============= UNLOCKS =============
create table if not exists unlocks (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid references profiles(id) on delete cascade,
  content_id uuid references content(id) on delete cascade,
  created_at timestamptz default now(),
  unique (user_id, content_id)
);
alter table unlocks enable row level security;
drop policy if exists "Users manage own unlocks" on unlocks;
create policy "Users manage own unlocks" on unlocks
  for all using (auth.uid() = user_id);

-- ============= UNLOCK CONTENT FUNCTION =============
-- Atomically deducts tokens and records the unlock
create or replace function unlock_content(p_content_id uuid)
returns void as $$
declare
  v_user    uuid := auth.uid();
  v_cost    integer;
  v_bal     integer;
  v_creator uuid;
begin
  if v_user is null then raise exception 'Not authenticated'; end if;

  select token_cost, creator_id into v_cost, v_creator
  from content where id = p_content_id and is_published = true;

  if not found then raise exception 'Content not found'; end if;
  if v_creator = v_user then raise exception 'Cannot unlock your own content'; end if;

  -- Already unlocked?
  if exists (select 1 from unlocks where user_id = v_user and content_id = p_content_id) then
    return;
  end if;

  select token_balance into v_bal from profiles where id = v_user;
  if v_bal < v_cost then raise exception 'Insufficient tokens'; end if;

  -- Deduct from buyer
  update profiles set token_balance = token_balance - v_cost where id = v_user;

  -- Credit to creator (70% of cost)
  update profiles set token_balance = token_balance + floor(v_cost * 0.7)::int where id = v_creator;

  insert into unlocks (user_id, content_id) values (v_user, p_content_id);

  insert into token_transactions (user_id, type, amount, reason, ref_id)
  values (v_user, 'spend', v_cost, 'Unlocked content', p_content_id);

  insert into token_transactions (user_id, type, amount, reason, ref_id)
  values (v_creator, 'earn', floor(v_cost * 0.7)::int, 'Content unlocked by learner', p_content_id);
end;
$$ language plpgsql security definer;
grant execute on function unlock_content(uuid) to authenticated;

-- ============= BOOKMARKS =============
create table if not exists bookmarks (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid references profiles(id) on delete cascade,
  content_id uuid references content(id) on delete cascade,
  created_at timestamptz default now(),
  unique (user_id, content_id)
);
alter table bookmarks enable row level security;
drop policy if exists "Users manage own bookmarks" on bookmarks;
create policy "Users manage own bookmarks" on bookmarks
  for all using (auth.uid() = user_id);

-- ============= RATINGS =============
create table if not exists ratings (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid references profiles(id) on delete cascade,
  content_id uuid references content(id) on delete cascade,
  stars      integer not null check (stars between 1 and 5),
  created_at timestamptz default now(),
  unique (user_id, content_id)
);
alter table ratings enable row level security;
drop policy if exists "Users manage own ratings" on ratings;
create policy "Users manage own ratings" on ratings
  for all using (auth.uid() = user_id);
drop policy if exists "Anyone can read ratings" on ratings;
create policy "Anyone can read ratings" on ratings for select using (true);

-- ============= PROGRESS =============
create table if not exists progress (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid references profiles(id) on delete cascade,
  topic_id     uuid references topics(id) on delete cascade,
  completed_at timestamptz,
  created_at   timestamptz default now(),
  unique (user_id, topic_id)
);
alter table progress enable row level security;
drop policy if exists "Users manage own progress" on progress;
create policy "Users manage own progress" on progress
  for all using (auth.uid() = user_id);

-- ============= REPORTS =============
create table if not exists reports (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid references profiles(id) on delete set null,
  content_id uuid references content(id) on delete cascade,
  reason     text not null,
  status     text default 'pending' check (status in ('pending', 'reviewed', 'dismissed')),
  created_at timestamptz default now()
);
alter table reports enable row level security;
drop policy if exists "Users can insert reports" on reports;
create policy "Users can insert reports" on reports
  for insert with check (auth.uid() = user_id);
drop policy if exists "Admins manage reports" on reports;
create policy "Admins manage reports" on reports
  for all using (
    exists (select 1 from profiles where id = auth.uid() and role = 'admin')
  );

-- ============= TOKEN TRANSACTIONS =============
create table if not exists token_transactions (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid references profiles(id) on delete cascade,
  type       text not null check (type in ('earn', 'spend')),
  amount     integer not null,
  reason     text,
  ref_id     uuid,
  created_at timestamptz default now()
);
alter table token_transactions enable row level security;
drop policy if exists "Users read own transactions" on token_transactions;
create policy "Users read own transactions" on token_transactions
  for select using (auth.uid() = user_id);
drop policy if exists "Service role inserts transactions" on token_transactions;
create policy "Service role inserts transactions" on token_transactions
  for insert with check (true);
drop policy if exists "Admins read all transactions" on token_transactions;
create policy "Admins read all transactions" on token_transactions
  for select using (
    exists (select 1 from profiles where id = auth.uid() and role = 'admin')
  );

-- ============= PURCHASES =============
create table if not exists purchases (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid references profiles(id) on delete cascade,
  payment_id text unique not null,
  tokens     integer not null,
  inr        text,
  created_at timestamptz default now()
);
alter table purchases enable row level security;
drop policy if exists "Users read own purchases" on purchases;
create policy "Users read own purchases" on purchases
  for select using (auth.uid() = user_id);

-- ============= WITHDRAWAL REQUESTS =============
create table if not exists withdrawal_requests (
  id              uuid primary key default gen_random_uuid(),
  user_id         uuid references profiles(id) on delete cascade,
  tokens_amount   integer not null,
  inr_amount      numeric not null,
  method          text not null check (method in ('upi', 'bank')),
  upi_id          text,
  bank_name       text,
  account_number  text,
  ifsc_code       text,
  account_holder  text,
  status          text default 'pending' check (status in ('pending', 'approved', 'rejected')),
  created_at      timestamptz default now()
);
alter table withdrawal_requests enable row level security;
drop policy if exists "Users manage own withdrawals" on withdrawal_requests;
create policy "Users manage own withdrawals" on withdrawal_requests
  for select using (auth.uid() = user_id);
drop policy if exists "Admins manage all withdrawals" on withdrawal_requests;
create policy "Admins manage all withdrawals" on withdrawal_requests
  for all using (
    exists (select 1 from profiles where id = auth.uid() and role = 'admin')
  );

-- ============= FEEDBACK =============
create table if not exists feedback (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid references profiles(id) on delete set null,
  category   text not null default 'Other',
  message    text not null,
  status     text not null default 'new' check (status in ('new', 'reviewed', 'done')),
  created_at timestamptz default now()
);
alter table feedback enable row level security;
drop policy if exists "Anyone can submit feedback" on feedback;
create policy "Anyone can submit feedback" on feedback
  for insert with check (true);
drop policy if exists "Users read own feedback" on feedback;
create policy "Users read own feedback" on feedback
  for select using (auth.uid() = user_id);
drop policy if exists "Admins manage feedback" on feedback;
create policy "Admins manage feedback" on feedback
  for all using (
    exists (select 1 from profiles where id = auth.uid() and role = 'admin')
  );

-- ============= CONTENT CHUNKS (RAG / AI Tutor) =============
create table if not exists content_chunks (
  id          bigserial primary key,
  content_id  uuid references content(id) on delete cascade,
  chunk_index int not null,
  chunk_text  text not null,
  embedding   vector(768),
  created_at  timestamptz default now()
);
alter table content_chunks enable row level security;
drop policy if exists "No client access to chunks" on content_chunks;
create policy "No client access to chunks" on content_chunks
  for all using (false);
create index if not exists content_chunks_content_id_idx on content_chunks (content_id);
create index if not exists content_chunks_embedding_idx
  on content_chunks using ivfflat (embedding vector_cosine_ops) with (lists = 100);

-- ============= AUTO-CREATE PROFILE ON SIGNUP =============
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
create or replace function credit_purchase(
  p_user_id uuid, p_tokens integer, p_inr text, p_payment_id text
) returns integer as $$
declare v_balance integer;
begin
  if exists (select 1 from purchases where payment_id = p_payment_id) then
    select token_balance into v_balance from profiles where id = p_user_id;
    return v_balance;
  end if;
  insert into purchases (user_id, payment_id, tokens, inr)
  values (p_user_id, p_payment_id, p_tokens, p_inr);
  update profiles set token_balance = token_balance + p_tokens
  where id = p_user_id returning token_balance into v_balance;
  insert into token_transactions (user_id, type, amount, reason)
  values (p_user_id, 'earn', p_tokens, 'Token purchase: ₹' || coalesce(p_inr, ''));
  return v_balance;
end;
$$ language plpgsql security definer;
grant execute on function credit_purchase(uuid, integer, text, text) to authenticated, service_role;

-- ============= ATOMIC WITHDRAWAL =============
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

-- ============= RATE CONTENT (anti-self-rating) =============
create or replace function rate_content(p_content_id uuid, p_stars integer)
returns void as $$
declare v_user uuid := auth.uid(); v_already boolean; v_creator uuid;
begin
  if v_user is null then raise exception 'Not authenticated'; end if;
  if p_stars < 1 or p_stars > 5 then raise exception 'Stars must be 1-5'; end if;
  select creator_id into v_creator from content where id = p_content_id;
  select exists (select 1 from ratings where user_id = v_user and content_id = p_content_id) into v_already;
  insert into ratings (user_id, content_id, stars) values (v_user, p_content_id, p_stars)
    on conflict (user_id, content_id) do update set stars = excluded.stars;
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

-- ============= REFUND TOKENS (admin: rejection of withdrawal) =============
create or replace function refund_tokens(p_user_id uuid, p_tokens integer)
returns void as $$
begin
  update profiles set token_balance = token_balance + p_tokens where id = p_user_id;
  insert into token_transactions (user_id, type, amount, reason)
  values (p_user_id, 'earn', p_tokens, 'Withdrawal request rejected — tokens refunded');
end;
$$ language plpgsql security definer;
grant execute on function refund_tokens(uuid, integer) to authenticated, service_role;

-- ============= SEMANTIC SEARCH FUNCTION =============
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

-- ============= STORAGE: content bucket =============
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'content', 'content', true,
  52428800,  -- 50 MB hard limit
  array[
    'video/mp4', 'video/webm', 'video/ogg', 'video/quicktime',
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'image/jpeg', 'image/png', 'image/webp', 'image/gif'
  ]
)
on conflict (id) do update set
  public = true,
  file_size_limit = 52428800;

-- Storage RLS: authenticated users upload only inside their own user-id folder
drop policy if exists "Users upload to own folder" on storage.objects;
create policy "Users upload to own folder" on storage.objects
  for insert with check (
    bucket_id = 'content'
    and auth.uid()::text = (storage.foldername(name))[1]
  );

-- Anyone can read/download public content files
drop policy if exists "Public read content files" on storage.objects;
create policy "Public read content files" on storage.objects
  for select using (bucket_id = 'content');

-- Users can delete only their own files
drop policy if exists "Users delete own files" on storage.objects;
create policy "Users delete own files" on storage.objects
  for delete using (
    bucket_id = 'content'
    and auth.uid()::text = (storage.foldername(name))[1]
  );

-- ============= AVATARS BUCKET (for profile pictures) =============
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'avatars', 'avatars', true,
  5242880,  -- 5 MB
  array['image/jpeg', 'image/png', 'image/webp', 'image/gif']
)
on conflict (id) do update set public = true, file_size_limit = 5242880;

drop policy if exists "Users upload own avatar" on storage.objects;
create policy "Users upload own avatar" on storage.objects
  for insert with check (
    bucket_id = 'avatars'
    and auth.uid()::text = (storage.foldername(name))[1]
  );

drop policy if exists "Public read avatars" on storage.objects;
create policy "Public read avatars" on storage.objects
  for select using (bucket_id = 'avatars');

drop policy if exists "Users update own avatar" on storage.objects;
create policy "Users update own avatar" on storage.objects
  for update using (
    bucket_id = 'avatars'
    and auth.uid()::text = (storage.foldername(name))[1]
  );

drop policy if exists "Users delete own avatar" on storage.objects;
create policy "Users delete own avatar" on storage.objects
  for delete using (
    bucket_id = 'avatars'
    and auth.uid()::text = (storage.foldername(name))[1]
  );

-- ============= INDEXES FOR PERFORMANCE =============
create index if not exists content_creator_idx on content (creator_id);
create index if not exists content_subject_idx on content (subject_id);
create index if not exists content_published_idx on content (is_published);
create index if not exists unlocks_user_idx on unlocks (user_id);
create index if not exists unlocks_content_idx on unlocks (content_id);
create index if not exists bookmarks_user_idx on bookmarks (user_id);
create index if not exists ratings_content_idx on ratings (content_id);
create index if not exists token_tx_user_idx on token_transactions (user_id);
create index if not exists token_tx_created_idx on token_transactions (created_at desc);
create index if not exists withdrawal_user_idx on withdrawal_requests (user_id);
create index if not exists reports_content_idx on reports (content_id);
create index if not exists progress_user_idx on progress (user_id);

-- ============= MAKE ADMIN ACCOUNT =============
-- Change this email to yours if needed
update profiles set role = 'admin'
where id = (select id from auth.users where email = 'brainbarter01@gmail.com');

-- ============= DONE =============
-- All tables, policies, functions, triggers, storage buckets and indexes are set up.
