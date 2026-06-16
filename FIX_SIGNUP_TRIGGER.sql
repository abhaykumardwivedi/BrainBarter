-- ============================================================================
-- FIX: "Database error creating new user" on signup
-- Cause: the on_auth_user_created trigger -> handle_new_user() throws, which
-- rolls back the whole auth.users insert. This makes the trigger resilient
-- (never blocks signup) and logs the real error so it's visible in Postgres logs.
-- Run this in the Supabase SQL Editor.
-- ============================================================================

-- 1) DIAGNOSTIC — see every trigger currently on auth.users (run & read output)
select tgname as trigger_name,
       pg_get_triggerdef(oid) as definition
from pg_trigger
where tgrelid = 'auth.users'::regclass
  and not tgisinternal;

-- 2) Make sure profiles has the columns the trigger writes (safe if already there)
alter table public.profiles add column if not exists email         text;
alter table public.profiles add column if not exists username      text;
alter table public.profiles add column if not exists token_balance integer default 50;

-- 3) Resilient trigger function: insert the profile, but NEVER let a failure
--    roll back the signup. The real error is logged as a warning.
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
    coalesce(new.raw_user_meta_data->>'username', split_part(new.email, '@', 1)),
    50
  )
  on conflict (id) do nothing;
  return new;
exception
  when others then
    raise warning 'handle_new_user failed for %: %', new.id, sqlerrm;
    return new;  -- signup proceeds regardless
end;
$$;

-- 4) Re-bind the trigger
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- 5) Grant the function owner the rights it needs (security definer runs as owner)
grant usage on schema public to postgres, service_role;
grant all on public.profiles to postgres, service_role;
