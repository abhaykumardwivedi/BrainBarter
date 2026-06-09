-- ============================================================
-- COMPLETE TOKEN ECONOMY SETUP
-- Run this entire file in Supabase SQL Editor
-- ============================================================

-- 1. CREATE WITHDRAWAL REQUESTS TABLE
-- ============================================================
create table if not exists withdrawal_requests (
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

-- Enable RLS
alter table withdrawal_requests enable row level security;

-- Drop existing policies if they exist
drop policy if exists "Users can read own withdrawal requests" on withdrawal_requests;
drop policy if exists "Users can insert own withdrawal requests" on withdrawal_requests;
drop policy if exists "Admin can manage all withdrawals" on withdrawal_requests;

-- Create policies
create policy "Users can read own withdrawal requests"
  on withdrawal_requests for select using (auth.uid() = user_id);

create policy "Users can insert own withdrawal requests"
  on withdrawal_requests for insert with check (auth.uid() = user_id);

create policy "Admin can manage all withdrawals"
  on withdrawal_requests for all using (
    exists (select 1 from profiles where id = auth.uid() and role = 'admin')
  );

-- 2. ADD ROLE COLUMN TO PROFILES
-- ============================================================
alter table profiles add column if not exists role text default 'user' check (role in ('user', 'admin'));

-- 3. CREATE REFUND FUNCTION
-- ============================================================
create or replace function refund_tokens(
  p_user_id uuid,
  p_amount integer,
  p_reason text
)
returns void as $$
begin
  -- Add tokens back
  update profiles 
  set token_balance = token_balance + p_amount 
  where id = p_user_id;

  -- Log transaction
  insert into token_transactions (user_id, type, amount, reason)
  values (p_user_id, 'earn', p_amount, p_reason);
end;
$$ language plpgsql security definer;

-- 4. SET ADMIN (REPLACE WITH YOUR EMAIL)
-- ============================================================
-- Uncomment and replace with your actual email:
-- update profiles set role = 'admin' where email = 'your_email@example.com';

-- ============================================================
-- SETUP COMPLETE!
-- ============================================================
-- Next steps:
-- 1. Uncomment the last line and add your email to become admin
-- 2. Get Razorpay test key from https://razorpay.com
-- 3. Update Wallet.jsx with your Razorpay key
-- 4. Test the system!
