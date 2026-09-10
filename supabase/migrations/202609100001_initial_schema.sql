create extension if not exists pgcrypto;

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text not null default '学习者' check (char_length(display_name) between 1 and 40),
  timezone text not null default 'Asia/Shanghai',
  focus_minutes integer not null default 25 check (focus_minutes between 1 and 180),
  short_break_minutes integer not null default 5 check (short_break_minutes between 1 and 60),
  long_break_minutes integer not null default 15 check (long_break_minutes between 1 and 120),
  long_break_every integer not null default 4 check (long_break_every between 1 and 12),
  background_path text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.tasks (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null check (char_length(title) between 1 and 120),
  estimated_pomodoros integer not null default 1 check (estimated_pomodoros between 1 and 99),
  completed_pomodoros integer not null default 0 check (completed_pomodoros >= 0),
  is_completed boolean not null default false,
  position integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists tasks_user_position_idx on public.tasks(user_id, position, created_at);

create table if not exists public.music_tracks (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null check (char_length(title) between 1 and 200),
  storage_path text not null unique,
  sort_order integer not null default 0,
  duration_seconds integer check (duration_seconds is null or duration_seconds >= 0),
  created_at timestamptz not null default now()
);

create index if not exists music_tracks_user_order_idx on public.music_tracks(user_id, sort_order, created_at);

create table if not exists public.study_sessions (
  id uuid primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  task_id uuid references public.tasks(id) on delete set null,
  duration_seconds integer not null check (duration_seconds between 1 and 86400),
  completed_at timestamptz not null,
  local_date date not null,
  timezone text not null,
  created_at timestamptz not null default now()
);

create index if not exists study_sessions_user_completed_idx on public.study_sessions(user_id, completed_at desc);
create index if not exists study_sessions_user_date_idx on public.study_sessions(user_id, local_date);

create or replace function public.touch_updated_at()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists profiles_touch_updated_at on public.profiles;
create trigger profiles_touch_updated_at
before update on public.profiles
for each row execute function public.touch_updated_at();

drop trigger if exists tasks_touch_updated_at on public.tasks;
create trigger tasks_touch_updated_at
before update on public.tasks
for each row execute function public.touch_updated_at();

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, display_name)
  values (
    new.id,
    coalesce(nullif(new.raw_user_meta_data ->> 'display_name', ''), '学习者')
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row execute function public.handle_new_user();

alter table public.profiles enable row level security;
alter table public.tasks enable row level security;
alter table public.music_tracks enable row level security;
alter table public.study_sessions enable row level security;

drop policy if exists "Users can view own profile" on public.profiles;
create policy "Users can view own profile" on public.profiles
for select using (auth.uid() = id);

drop policy if exists "Users can insert own profile" on public.profiles;
create policy "Users can insert own profile" on public.profiles
for insert with check (auth.uid() = id);

drop policy if exists "Users can update own profile" on public.profiles;
create policy "Users can update own profile" on public.profiles
for update using (auth.uid() = id) with check (auth.uid() = id);

drop policy if exists "Users can view own tasks" on public.tasks;
create policy "Users can view own tasks" on public.tasks
for select using (auth.uid() = user_id);

drop policy if exists "Users can create own tasks" on public.tasks;
create policy "Users can create own tasks" on public.tasks
for insert with check (auth.uid() = user_id);

drop policy if exists "Users can update own tasks" on public.tasks;
create policy "Users can update own tasks" on public.tasks
for update using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "Users can delete own tasks" on public.tasks;
create policy "Users can delete own tasks" on public.tasks
for delete using (auth.uid() = user_id);

drop policy if exists "Users can view own music" on public.music_tracks;
create policy "Users can view own music" on public.music_tracks
for select using (auth.uid() = user_id);

drop policy if exists "Users can create own music" on public.music_tracks;
create policy "Users can create own music" on public.music_tracks
for insert with check (auth.uid() = user_id);

drop policy if exists "Users can update own music" on public.music_tracks;
create policy "Users can update own music" on public.music_tracks
for update using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "Users can delete own music" on public.music_tracks;
create policy "Users can delete own music" on public.music_tracks
for delete using (auth.uid() = user_id);

drop policy if exists "Users can view own sessions" on public.study_sessions;
create policy "Users can view own sessions" on public.study_sessions
for select using (auth.uid() = user_id);

drop policy if exists "Users can create own sessions" on public.study_sessions;
create policy "Users can create own sessions" on public.study_sessions
for insert with check (auth.uid() = user_id);

drop policy if exists "Users can delete own sessions" on public.study_sessions;
create policy "Users can delete own sessions" on public.study_sessions
for delete using (auth.uid() = user_id);

create or replace function public.complete_focus_session(
  p_session_id uuid,
  p_task_id uuid,
  p_duration_seconds integer,
  p_completed_at timestamptz,
  p_timezone text
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user uuid := auth.uid();
  v_inserted boolean := false;
begin
  if v_user is null then
    raise exception 'Not authenticated';
  end if;

  insert into public.study_sessions (
    id,
    user_id,
    task_id,
    duration_seconds,
    completed_at,
    local_date,
    timezone
  )
  values (
    p_session_id,
    v_user,
    p_task_id,
    p_duration_seconds,
    p_completed_at,
    (p_completed_at at time zone p_timezone)::date,
    p_timezone
  )
  on conflict (id) do nothing
  returning true into v_inserted;

  if coalesce(v_inserted, false) and p_task_id is not null then
    update public.tasks
    set completed_pomodoros = completed_pomodoros + 1
    where id = p_task_id and user_id = v_user;
  end if;
end;
$$;

revoke all on function public.complete_focus_session(uuid, uuid, integer, timestamptz, text) from public;
grant execute on function public.complete_focus_session(uuid, uuid, integer, timestamptz, text) to authenticated;

create or replace function public.get_study_stats(p_timezone text default 'Asia/Shanghai')
returns jsonb
language plpgsql
stable
security invoker
set search_path = public
as $$
declare
  v_user uuid := auth.uid();
  v_today date;
  v_total_seconds bigint := 0;
  v_today_seconds bigint := 0;
  v_week_seconds bigint := 0;
  v_completed_pomodoros bigint := 0;
  v_trend jsonb := '[]'::jsonb;
begin
  if v_user is null then
    raise exception 'Not authenticated';
  end if;

  v_today := (now() at time zone p_timezone)::date;

  select
    coalesce(sum(duration_seconds), 0),
    coalesce(sum(duration_seconds) filter (where local_date = v_today), 0),
    coalesce(sum(duration_seconds) filter (where local_date >= date_trunc('week', v_today)::date), 0),
    count(*)
  into v_total_seconds, v_today_seconds, v_week_seconds, v_completed_pomodoros
  from public.study_sessions
  where user_id = v_user;

  select coalesce(
    jsonb_agg(
      jsonb_build_object(
        'date', to_char(day::date, 'YYYY-MM-DD'),
        'seconds', coalesce(day_stats.total_seconds, 0)
      )
      order by day
    ),
    '[]'::jsonb
  )
  into v_trend
  from generate_series(v_today - 6, v_today, interval '1 day') as day
  left join (
    select local_date, sum(duration_seconds) as total_seconds
    from public.study_sessions
    where user_id = v_user and local_date >= v_today - 6
    group by local_date
  ) as day_stats on day_stats.local_date = day::date;

  return jsonb_build_object(
    'total_seconds', v_total_seconds,
    'today_seconds', v_today_seconds,
    'week_seconds', v_week_seconds,
    'completed_pomodoros', v_completed_pomodoros,
    'trend', v_trend
  );
end;
$$;

revoke all on function public.get_study_stats(text) from public;
grant execute on function public.get_study_stats(text) to authenticated;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values
  ('backgrounds', 'backgrounds', false, 10485760, array['image/jpeg', 'image/png', 'image/webp']),
  ('music', 'music', false, 20971520, array['audio/mpeg', 'audio/mp3', 'audio/mp4', 'audio/x-m4a', 'audio/wav', 'audio/x-wav', 'audio/ogg'])
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "Users can view own background objects" on storage.objects;
create policy "Users can view own background objects" on storage.objects
for select to authenticated
using (bucket_id = 'backgrounds' and (storage.foldername(name))[1] = auth.uid()::text);

drop policy if exists "Users can upload own background objects" on storage.objects;
create policy "Users can upload own background objects" on storage.objects
for insert to authenticated
with check (bucket_id = 'backgrounds' and (storage.foldername(name))[1] = auth.uid()::text);

drop policy if exists "Users can update own background objects" on storage.objects;
create policy "Users can update own background objects" on storage.objects
for update to authenticated
using (bucket_id = 'backgrounds' and (storage.foldername(name))[1] = auth.uid()::text)
with check (bucket_id = 'backgrounds' and (storage.foldername(name))[1] = auth.uid()::text);

drop policy if exists "Users can delete own background objects" on storage.objects;
create policy "Users can delete own background objects" on storage.objects
for delete to authenticated
using (bucket_id = 'backgrounds' and (storage.foldername(name))[1] = auth.uid()::text);

drop policy if exists "Users can view own music objects" on storage.objects;
create policy "Users can view own music objects" on storage.objects
for select to authenticated
using (bucket_id = 'music' and (storage.foldername(name))[1] = auth.uid()::text);

drop policy if exists "Users can upload own music objects" on storage.objects;
create policy "Users can upload own music objects" on storage.objects
for insert to authenticated
with check (bucket_id = 'music' and (storage.foldername(name))[1] = auth.uid()::text);

drop policy if exists "Users can update own music objects" on storage.objects;
create policy "Users can update own music objects" on storage.objects
for update to authenticated
using (bucket_id = 'music' and (storage.foldername(name))[1] = auth.uid()::text)
with check (bucket_id = 'music' and (storage.foldername(name))[1] = auth.uid()::text);

drop policy if exists "Users can delete own music objects" on storage.objects;
create policy "Users can delete own music objects" on storage.objects
for delete to authenticated
using (bucket_id = 'music' and (storage.foldername(name))[1] = auth.uid()::text);
