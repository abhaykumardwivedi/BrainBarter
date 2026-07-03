-- ============================================================
-- BrainBarter — STUDY PLANNER (persistent, trackable, re-plannable)
-- Safe to re-run (idempotent). Run AFTER COMPLETE_SETUP.sql.
--
-- Upgrades the one-shot Study Planner into a tracked system:
--   • study_plans      — one row per plan a user generates
--   • study_plan_days  — the day-by-day breakdown, each independently trackable
--
-- No SECURITY DEFINER functions are needed here: study plans move no tokens
-- and require no privilege escalation. All writes happen server-side through
-- the Express API (service_role), same as aiController. RLS below is
-- defense-in-depth so a direct client query can only ever see its own rows.
-- ============================================================

-- ============= STUDY PLANS =============
create table if not exists study_plans (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references profiles(id) on delete cascade,
  subject    text not null,
  topic      text,
  total_days integer not null,
  status     text not null default 'active'
             check (status in ('active', 'completed', 'abandoned')),
  created_at timestamptz default now()
);

create index if not exists study_plans_user_id_idx on study_plans (user_id);
-- Fast lookup of a user's single active plan (GET /api/study-plan/active)
create index if not exists study_plans_user_active_idx
  on study_plans (user_id) where status = 'active';

alter table study_plans enable row level security;

-- A user may only ever see / act on their OWN plans.
drop policy if exists "Users read own study plans" on study_plans;
create policy "Users read own study plans" on study_plans
  for select using (auth.uid() = user_id);

drop policy if exists "Users insert own study plans" on study_plans;
create policy "Users insert own study plans" on study_plans
  for insert with check (auth.uid() = user_id);

drop policy if exists "Users update own study plans" on study_plans;
create policy "Users update own study plans" on study_plans
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "Users delete own study plans" on study_plans;
create policy "Users delete own study plans" on study_plans
  for delete using (auth.uid() = user_id);

-- ============= STUDY PLAN DAYS =============
create table if not exists study_plan_days (
  id           uuid primary key default gen_random_uuid(),
  plan_id      uuid not null references study_plans(id) on delete cascade,
  day_number   integer not null,
  goal         text,
  subtopics    text[]  default '{}',
  activities   text[]  default '{}',
  self_check   text,
  status       text not null default 'pending'
               check (status in ('pending', 'done', 'partial', 'skipped')),
  actual_notes text,                       -- nullable: what the student actually did
  completed_at timestamptz,                -- set when status leaves 'pending'
  unique (plan_id, day_number)             -- lets replan cleanly replace pending days
);

create index if not exists study_plan_days_plan_id_idx on study_plan_days (plan_id);

alter table study_plan_days enable row level security;

-- Ownership is indirect: a day belongs to whoever owns its parent plan.
-- Same exists(...) pattern used elsewhere for scoped access.
drop policy if exists "Users read own plan days" on study_plan_days;
create policy "Users read own plan days" on study_plan_days
  for select using (
    exists (select 1 from study_plans p
            where p.id = study_plan_days.plan_id and p.user_id = auth.uid())
  );

drop policy if exists "Users insert own plan days" on study_plan_days;
create policy "Users insert own plan days" on study_plan_days
  for insert with check (
    exists (select 1 from study_plans p
            where p.id = study_plan_days.plan_id and p.user_id = auth.uid())
  );

drop policy if exists "Users update own plan days" on study_plan_days;
create policy "Users update own plan days" on study_plan_days
  for update using (
    exists (select 1 from study_plans p
            where p.id = study_plan_days.plan_id and p.user_id = auth.uid())
  ) with check (
    exists (select 1 from study_plans p
            where p.id = study_plan_days.plan_id and p.user_id = auth.uid())
  );

drop policy if exists "Users delete own plan days" on study_plan_days;
create policy "Users delete own plan days" on study_plan_days
  for delete using (
    exists (select 1 from study_plans p
            where p.id = study_plan_days.plan_id and p.user_id = auth.uid())
  );
