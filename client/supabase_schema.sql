-- ============================================================
-- BrainBarter — Full Database Schema
-- Run this in Supabase SQL Editor
-- ============================================================

-- SUBJECTS
create table subjects (
  id         uuid primary key default gen_random_uuid(),
  name       text unique not null,
  code       text unique not null,
  semester   integer,
  created_at timestamptz default now()
);

-- UNITS
create table units (
  id         uuid primary key default gen_random_uuid(),
  subject_id uuid references subjects(id) on delete cascade,
  name       text not null,
  order_no   integer default 1
);

-- TOPICS
create table topics (
  id       uuid primary key default gen_random_uuid(),
  unit_id  uuid references units(id) on delete cascade,
  name     text not null,
  order_no integer default 1
);

-- CONTENT
create table content (
  id            uuid primary key default gen_random_uuid(),
  creator_id    uuid references profiles(id) on delete cascade,
  topic_id      uuid references topics(id) on delete set null,
  title         text not null,
  description   text,
  type          text check (type in ('video','notes')),
  file_url      text not null,
  thumbnail_url text,
  token_cost    integer default 5,
  difficulty    text check (difficulty in ('beginner','medium','advanced')),
  tags          text[],
  is_published  boolean default false,
  views         integer default 0,
  created_at    timestamptz default now()
);

-- UNLOCKS
create table unlocks (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid references profiles(id) on delete cascade,
  content_id   uuid references content(id) on delete cascade,
  tokens_spent integer,
  unlocked_at  timestamptz default now(),
  unique(user_id, content_id)
);

-- TOKEN TRANSACTIONS
create table token_transactions (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid references profiles(id) on delete cascade,
  type       text check (type in ('earn','spend')),
  amount     integer,
  reason     text,
  ref_id     uuid,
  created_at timestamptz default now()
);

-- RATINGS
create table ratings (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid references profiles(id) on delete cascade,
  content_id uuid references content(id) on delete cascade,
  stars      integer check (stars between 1 and 5),
  review     text,
  created_at timestamptz default now(),
  unique(user_id, content_id)
);

-- BOOKMARKS
create table bookmarks (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid references profiles(id) on delete cascade,
  content_id uuid references content(id) on delete cascade,
  created_at timestamptz default now(),
  unique(user_id, content_id)
);

-- PROGRESS
create table progress (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid references profiles(id) on delete cascade,
  topic_id     uuid references topics(id) on delete cascade,
  content_ids  uuid[],
  completed_at timestamptz,
  unique(user_id, topic_id)
);

-- MOCK TESTS
create table mock_tests (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid references profiles(id) on delete cascade,
  topic_id   uuid references topics(id) on delete set null,
  type       text,
  questions  jsonb,
  score      integer,
  created_at timestamptz default now()
);

-- REPORTS
create table reports (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid references profiles(id) on delete cascade,
  content_id uuid references content(id) on delete cascade,
  reason     text,
  status     text default 'pending',
  created_at timestamptz default now()
);

-- AI LOGS
create table ai_logs (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid references profiles(id) on delete cascade,
  content_id uuid references content(id) on delete set null,
  task_type  text,
  prompt     text,
  response   text,
  created_at timestamptz default now()
);

-- PYQS
create table pyqs (
  id         uuid primary key default gen_random_uuid(),
  subject_id uuid references subjects(id) on delete cascade,
  year       integer,
  file_url   text,
  text_dump  text,
  created_at timestamptz default now()
);

-- ============================================================
-- ENABLE RLS ON ALL TABLES
-- ============================================================
alter table subjects          enable row level security;
alter table units             enable row level security;
alter table topics            enable row level security;
alter table content           enable row level security;
alter table unlocks           enable row level security;
alter table token_transactions enable row level security;
alter table ratings           enable row level security;
alter table bookmarks         enable row level security;
alter table progress          enable row level security;
alter table mock_tests        enable row level security;
alter table reports           enable row level security;
alter table ai_logs           enable row level security;
alter table pyqs              enable row level security;

-- ============================================================
-- RLS POLICIES
-- ============================================================

-- subjects / units / topics — public read, admin write
create policy "Anyone can read subjects" on subjects for select using (true);
create policy "Anyone can read units"    on units    for select using (true);
create policy "Anyone can read topics"   on topics   for select using (true);

-- content — public read published, creator manages own
create policy "Anyone can read published content"
  on content for select using (is_published = true);
create policy "Creators can manage own content"
  on content for all using (auth.uid() = creator_id);

-- unlocks — user manages own
create policy "Users can read own unlocks"
  on unlocks for select using (auth.uid() = user_id);
create policy "Users can insert own unlocks"
  on unlocks for insert with check (auth.uid() = user_id);

-- token_transactions — user reads own
create policy "Users can read own transactions"
  on token_transactions for select using (auth.uid() = user_id);
create policy "Users can insert own transactions"
  on token_transactions for insert with check (auth.uid() = user_id);

-- ratings — public read, user manages own
create policy "Anyone can read ratings"
  on ratings for select using (true);
create policy "Users can manage own ratings"
  on ratings for all using (auth.uid() = user_id);

-- bookmarks — user manages own
create policy "Users can manage own bookmarks"
  on bookmarks for all using (auth.uid() = user_id);

-- progress — user manages own
create policy "Users can manage own progress"
  on progress for all using (auth.uid() = user_id);

-- mock_tests — user manages own
create policy "Users can manage own mock tests"
  on mock_tests for all using (auth.uid() = user_id);

-- reports — user inserts, public read for admin
create policy "Users can insert reports"
  on reports for insert with check (auth.uid() = user_id);
create policy "Users can read own reports"
  on reports for select using (auth.uid() = user_id);

-- ai_logs — user manages own
create policy "Users can manage own ai logs"
  on ai_logs for all using (auth.uid() = user_id);

-- pyqs — public read
create policy "Anyone can read pyqs"
  on pyqs for select using (true);

-- ============================================================
-- TOKEN TRANSFER FUNCTION (atomic unlock)
-- ============================================================
create or replace function unlock_content(
  p_user_id    uuid,
  p_content_id uuid,
  p_cost       integer,
  p_creator_id uuid
)
returns void as $$
begin
  -- Check balance
  if (select token_balance from profiles where id = p_user_id) < p_cost then
    raise exception 'Insufficient tokens';
  end if;

  -- Deduct from learner
  update profiles set token_balance = token_balance - p_cost where id = p_user_id;

  -- Credit to creator
  update profiles set token_balance = token_balance + p_cost where id = p_creator_id;

  -- Insert unlock record
  insert into unlocks (user_id, content_id, tokens_spent)
  values (p_user_id, p_content_id, p_cost);

  -- Insert transactions
  insert into token_transactions (user_id, type, amount, reason, ref_id)
  values
    (p_user_id,    'spend', p_cost, 'Content unlocked', p_content_id),
    (p_creator_id, 'earn',  p_cost, 'Content unlocked by learner', p_content_id);
end;
$$ language plpgsql security definer;

-- ============================================================
-- SEED: Sample subjects, units, topics
-- ============================================================
insert into subjects (name, code, semester) values
  ('Database Management Systems', 'CS301', 5),
  ('Operating Systems',           'CS302', 5),
  ('Computer Networks',           'CS303', 6),
  ('Data Structures & Algorithms','CS201', 3),
  ('Software Engineering',        'CS401', 7),
  ('Theory of Computation',       'CS402', 6);
