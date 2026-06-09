-- ============================================================
-- WITHDRAWAL REQUESTS TABLE
-- Run this in Supabase SQL Editor
-- ============================================================

create table withdrawal_requests (
  id              uuid primary key default gen_random_uuid(),
  user_id         uuid references profiles(id) on delete cascade,
  tokens_amount   integer not null,
  inr_amount      decimal(10,2) not null,
  method          text check (method in ('bank','upi')),
  bank_name       text,
  account_number  text,
  ifsc_code       text,
  account_holder  text,
  upi_id          text,
  status          text default 'pending' check (status in ('pending','approved','rejected')),
  admin_note      text,
  transaction_id  text,
  created_at      timestamptz default now(),
  processed_at    timestamptz
);

-- RLS
alter table withdrawal_requests enable row level security;

create policy "Users can read own withdrawal requests"
  on withdrawal_requests for select using (auth.uid() = user_id);

create policy "Users can insert own withdrawal requests"
  on withdrawal_requests for insert with check (auth.uid() = user_id);

-- Admin can see all (you'll need admin role check later)
create policy "Admin can manage all withdrawals"
  on withdrawal_requests for all using (
    auth.uid() in (select id from profiles where role = 'admin')
  );
