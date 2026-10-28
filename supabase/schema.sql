create extension if not exists pgcrypto;

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  username text not null unique check (username = lower(username) and username ~ '^[a-z0-9_]{3,32}$'),
  display_name text, height_cm numeric, weight_kg numeric, age int, gender text, activity_level numeric,
  daily_calorie_goal int, daily_step_goal int,
  selected_companion text not null default 'deku' check (selected_companion in ('bakugou','deku')),
  biometric_enabled boolean not null default false, updated_at timestamptz not null default now()
);
create index if not exists profiles_username_idx on public.profiles(username);

create table if not exists public.meal_logs (
  id uuid primary key default gen_random_uuid(), user_id uuid not null references auth.users(id) on delete cascade,
  client_id text not null unique, logged_date date not null,
  meal_type text check (meal_type in ('breakfast','lunch','dinner','snack')), food_name text not null,
  calories numeric not null default 0, protein_g numeric not null default 0, carbs_g numeric not null default 0,
  fat_g numeric not null default 0, portion_multiplier numeric not null default 1, image_url text,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now(), deleted_at timestamptz
);
create index if not exists meal_logs_date_idx on public.meal_logs(user_id, logged_date);

create table if not exists public.daily_steps (
  id uuid primary key default gen_random_uuid(), user_id uuid not null references auth.users(id) on delete cascade,
  logged_date date not null, step_count int not null default 0, distance_meters numeric not null default 0,
  calories_burned numeric not null default 0, active_minutes int not null default 0,
  updated_at timestamptz not null default now(), unique(user_id, logged_date)
);
create index if not exists daily_steps_date_idx on public.daily_steps(user_id, logged_date);

create table if not exists public.activity_sessions (
  id uuid primary key default gen_random_uuid(), user_id uuid not null references auth.users(id) on delete cascade,
  client_id text not null unique, activity_type text check (activity_type in ('walk','run','cycle')),
  start_time timestamptz, end_time timestamptz, duration_sec int, distance_meters numeric, steps int,
  calories_burned numeric, avg_pace_sec_per_km numeric, route_geojson jsonb, created_at timestamptz not null default now()
);

create table if not exists public.user_passkeys (
  id uuid primary key default gen_random_uuid(), user_id uuid not null references auth.users(id) on delete cascade,
  credential_id text not null unique, public_key text not null, counter bigint not null default 0,
  device_name text, created_at timestamptz not null default now()
);

alter table public.profiles enable row level security;
alter table public.meal_logs enable row level security;
alter table public.daily_steps enable row level security;
alter table public.activity_sessions enable row level security;
alter table public.user_passkeys enable row level security;

drop policy if exists profiles_owner on public.profiles;
create policy profiles_owner on public.profiles for all using (auth.uid() = id) with check (auth.uid() = id);
drop policy if exists meal_logs_owner on public.meal_logs;
create policy meal_logs_owner on public.meal_logs for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
drop policy if exists daily_steps_owner on public.daily_steps;
create policy daily_steps_owner on public.daily_steps for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
drop policy if exists activity_sessions_owner on public.activity_sessions;
create policy activity_sessions_owner on public.activity_sessions for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
drop policy if exists user_passkeys_owner on public.user_passkeys;
create policy user_passkeys_owner on public.user_passkeys for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create or replace function public.set_updated_at() returns trigger language plpgsql as $$
begin new.updated_at = now(); return new; end $$;
drop trigger if exists profiles_updated_at on public.profiles;
create trigger profiles_updated_at before update on public.profiles for each row execute function public.set_updated_at();
drop trigger if exists meal_logs_updated_at on public.meal_logs;
create trigger meal_logs_updated_at before update on public.meal_logs for each row execute function public.set_updated_at();
drop trigger if exists daily_steps_updated_at on public.daily_steps;
create trigger daily_steps_updated_at before update on public.daily_steps for each row execute function public.set_updated_at();
