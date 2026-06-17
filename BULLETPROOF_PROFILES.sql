-- ============================================================================
-- BULLETPROOF PROFILE CREATION — run ONCE in the Supabase SQL Editor.
-- Guarantees every new AND existing user has a profile with 50 tokens and a
-- username. Idempotent: safe to run multiple times.
-- ============================================================================

-- LAYER 0 — Ensure every column the app expects exists (schema can drift from
-- the original setup script; this is the fix for "column email does not exist").
alter table public.profiles add column if not exists email         text;
alter table public.profiles add column if not exists username      text;
alter table public.profiles add column if not exists bio           text;
alter table public.profiles add column if not exists avatar_url    text;
alter table public.profiles add column if not exists token_balance integer default 50;
alter table public.profiles add column if not exists is_verified   boolean default false;
alter table public.profiles add column if not exists role          text default 'user';

-- LAYER 1 — Column defaults: even a bare/partial insert gets correct values,
-- so a profile can never exist with NULL/0 tokens or no role by accident.
alter table public.profiles alter column token_balance set default 50;
alter table public.profiles alter column role          set default 'user';

-- LAYER 2 — Reliable trigger that auto-creates the profile on every signup.
-- security definer + explicit search_path so it works from the auth schema;
-- on-conflict-do-update so it self-heals; exception handler is a safety net
-- only (the insert is now bulletproof) and logs the real cause if it ever trips.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, email, username, token_balance)
  values (
    new.id,
    new.email,
    coalesce(nullif(new.raw_user_meta_data->>'username', ''), split_part(new.email, '@', 1)),
    50
  )
  on conflict (id) do update
    set email    = coalesce(public.profiles.email, excluded.email),
        username = coalesce(nullif(public.profiles.username, ''), excluded.username),
        token_balance = case when public.profiles.token_balance is null
                             then 50 else public.profiles.token_balance end;
  return new;
exception when others then
  raise warning 'handle_new_user failed for %: %', new.id, sqlerrm;
  return new;  -- never block signup
end;
$$;

-- Ownership + grants so the SECURITY DEFINER function has full rights.
alter function public.handle_new_user() owner to postgres;
grant usage on schema public to postgres, authenticated, service_role, anon;
grant select, insert, update on public.profiles to postgres, authenticated, service_role;

-- (Re)bind the trigger.
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- LAYER 3 — Backfill: repair EVERY existing user who is missing a profile or
-- has bad data (this fixes all currently-broken accounts in one shot).
-- NOTE: this resets token_balance 0/NULL -> 50. Fine pre-launch; if you have
-- real users who legitimately spent down to 0, remove the token_balance line.
insert into public.profiles (id, email, username, token_balance)
select u.id, u.email,
       coalesce(nullif(u.raw_user_meta_data->>'username', ''), split_part(u.email, '@', 1)),
       50
from auth.users u
on conflict (id) do update
  set token_balance = case when public.profiles.token_balance is null or public.profiles.token_balance = 0
                           then 50 else public.profiles.token_balance end,
      username = coalesce(nullif(public.profiles.username, ''), excluded.username),
      email    = coalesce(public.profiles.email, excluded.email);

-- LAYER 4 — Verification: this MUST return 0 rows. Any row = a user with no
-- profile (run the backfill again / investigate).
select u.id, u.email, 'MISSING PROFILE' as problem
from auth.users u
left join public.profiles p on p.id = u.id
where p.id is null
union all
select p.id, p.email, 'BAD TOKEN/USERNAME' as problem
from public.profiles p
where p.token_balance is null or p.username is null or p.username = '';
