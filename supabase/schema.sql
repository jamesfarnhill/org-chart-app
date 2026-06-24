-- Account Power Map - Supabase schema, security policies, and triggers.
-- Paste this whole file into the Supabase SQL Editor and click Run.
-- It is safe to run more than once.

-- profiles: one row per user, holding their role and display info.
create table if not exists public.profiles (
  id          uuid primary key references auth.users (id) on delete cascade,
  email       text,
  display_name text,
  role        text not null default 'user' check (role in ('user', 'admin')),
  created_at  timestamptz not null default now()
);

alter table public.profiles enable row level security;

-- Helper that checks if the current user is an admin without causing the
-- policies below to recurse (security definer bypasses RLS for this lookup).
create or replace function public.is_admin()
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select exists (
    select 1 from public.profiles where id = auth.uid() and role = 'admin'
  );
$$;

drop policy if exists "read own profile" on public.profiles;
create policy "read own profile" on public.profiles
  for select using (auth.uid() = id);

-- Admins can read every profile (to manage users). There is no admin policy on
-- user_data below, so admins still cannot read anyone else's charts.
drop policy if exists "admins read all profiles" on public.profiles;
create policy "admins read all profiles" on public.profiles
  for select using (public.is_admin());

-- Auto-create a profile (role 'user') whenever an auth user is created.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, email, display_name, role)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data ->> 'display_name', new.email),
    'user'
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- user_data: each user's entire Account Power Map document (one JSON blob).
-- Strict owner-only access gives true per-user isolation (admins included).
create table if not exists public.user_data (
  user_id    uuid primary key references auth.users (id) on delete cascade,
  data       jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

alter table public.user_data enable row level security;

drop policy if exists "own data select" on public.user_data;
create policy "own data select" on public.user_data
  for select using (auth.uid() = user_id);

drop policy if exists "own data insert" on public.user_data;
create policy "own data insert" on public.user_data
  for insert with check (auth.uid() = user_id);

drop policy if exists "own data update" on public.user_data;
create policy "own data update" on public.user_data
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- After running this, create your own user in Authentication > Users, then run:
--   update public.profiles set role = 'admin' where email = 'you@example.com';
-- That one-time step makes you the first admin. Everyone else is created by an
-- admin from inside the app and defaults to 'user'.
