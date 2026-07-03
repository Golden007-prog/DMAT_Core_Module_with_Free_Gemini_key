-- CoreForge cloud schema for Supabase project qnwkcqjkdyvafhqtbkhx
-- Security model: every table is owner-scoped via RLS (auth.uid() = user id).
-- UPDATE policies carry both USING and WITH CHECK so rows can never be
-- reassigned to another user. The signup trigger function is SECURITY DEFINER
-- with a pinned search_path and revoked EXECUTE (it is only ever invoked by
-- the auth.users trigger).

-- ============================== profiles ==============================
create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  display_name text,
  avatar_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.profiles enable row level security;

drop policy if exists "profiles_select_own" on public.profiles;
create policy "profiles_select_own" on public.profiles
  for select to authenticated
  using ((select auth.uid()) = id);

drop policy if exists "profiles_insert_own" on public.profiles;
create policy "profiles_insert_own" on public.profiles
  for insert to authenticated
  with check ((select auth.uid()) = id);

drop policy if exists "profiles_update_own" on public.profiles;
create policy "profiles_update_own" on public.profiles
  for update to authenticated
  using ((select auth.uid()) = id)
  with check ((select auth.uid()) = id);

-- auto-create a profile row for every new user (Google metadata included)
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id, display_name, avatar_url)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'full_name', new.raw_user_meta_data ->> 'name'),
    new.raw_user_meta_data ->> 'avatar_url'
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

revoke execute on function public.handle_new_user() from public, anon, authenticated;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ============================== sessions ==============================
create table if not exists public.sessions (
  id uuid primary key,
  user_id uuid not null references auth.users (id) on delete cascade,
  subtest text not null,
  mode text not null,
  difficulty text not null,
  question_count int not null,
  accuracy real,
  created_at timestamptz not null,
  payload jsonb not null
);

create index if not exists sessions_user_created_idx
  on public.sessions (user_id, created_at desc);

alter table public.sessions enable row level security;

drop policy if exists "sessions_select_own" on public.sessions;
create policy "sessions_select_own" on public.sessions
  for select to authenticated
  using ((select auth.uid()) = user_id);

drop policy if exists "sessions_insert_own" on public.sessions;
create policy "sessions_insert_own" on public.sessions
  for insert to authenticated
  with check ((select auth.uid()) = user_id);

drop policy if exists "sessions_update_own" on public.sessions;
create policy "sessions_update_own" on public.sessions
  for update to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

drop policy if exists "sessions_delete_own" on public.sessions;
create policy "sessions_delete_own" on public.sessions
  for delete to authenticated
  using ((select auth.uid()) = user_id);

-- ============================ user_settings ===========================
create table if not exists public.user_settings (
  user_id uuid primary key references auth.users (id) on delete cascade,
  payload jsonb not null,
  updated_at timestamptz not null default now()
);

alter table public.user_settings enable row level security;

drop policy if exists "user_settings_select_own" on public.user_settings;
create policy "user_settings_select_own" on public.user_settings
  for select to authenticated
  using ((select auth.uid()) = user_id);

drop policy if exists "user_settings_insert_own" on public.user_settings;
create policy "user_settings_insert_own" on public.user_settings
  for insert to authenticated
  with check ((select auth.uid()) = user_id);

drop policy if exists "user_settings_update_own" on public.user_settings;
create policy "user_settings_update_own" on public.user_settings
  for update to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

drop policy if exists "user_settings_delete_own" on public.user_settings;
create policy "user_settings_delete_own" on public.user_settings
  for delete to authenticated
  using ((select auth.uid()) = user_id);

-- =========================== generated_sets ===========================
create table if not exists public.generated_sets (
  user_id uuid not null references auth.users (id) on delete cascade,
  cache_key text not null,
  questions jsonb not null,
  source text not null default 'deterministic',
  created_at timestamptz not null default now(),
  primary key (user_id, cache_key)
);

alter table public.generated_sets enable row level security;

drop policy if exists "generated_sets_select_own" on public.generated_sets;
create policy "generated_sets_select_own" on public.generated_sets
  for select to authenticated
  using ((select auth.uid()) = user_id);

drop policy if exists "generated_sets_insert_own" on public.generated_sets;
create policy "generated_sets_insert_own" on public.generated_sets
  for insert to authenticated
  with check ((select auth.uid()) = user_id);

drop policy if exists "generated_sets_update_own" on public.generated_sets;
create policy "generated_sets_update_own" on public.generated_sets
  for update to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

drop policy if exists "generated_sets_delete_own" on public.generated_sets;
create policy "generated_sets_delete_own" on public.generated_sets
  for delete to authenticated
  using ((select auth.uid()) = user_id);

-- ============================== grants ================================
-- RLS decides row visibility; these grant table access to signed-in users
-- only. anon gets nothing.
grant usage on schema public to authenticated;
grant select, insert, update, delete on public.profiles to authenticated;
grant select, insert, update, delete on public.sessions to authenticated;
grant select, insert, update, delete on public.user_settings to authenticated;
grant select, insert, update, delete on public.generated_sets to authenticated;
