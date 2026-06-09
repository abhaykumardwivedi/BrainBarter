-- ============================================================
-- ADDITIONAL HELPERS FOR WITHDRAWAL SYSTEM
-- Run this in Supabase SQL Editor
-- ============================================================

-- Add role column to profiles if not exists
alter table profiles add column if not exists role text default 'user' check (role in ('user', 'admin'));

-- Function to refund tokens (for rejected withdrawals)
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

-- Set yourself as admin (replace with your actual user ID)
-- update profiles set role = 'admin' where email = 'your_email@example.com';
