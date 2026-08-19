-- Couples To-Do MVP foundation
-- Safe to apply to a new Supabase project. The legacy tasks_sync/routines tables
-- are not used by the MVP and should be migrated separately if they contain data.

create extension if not exists pgcrypto;

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text not null check (char_length(display_name) between 1 and 80),
  color text not null default '#ec4899',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.households (
  id uuid primary key default gen_random_uuid(),
  name text not null default 'Our Home' check (char_length(name) between 1 and 80),
  invite_code text not null unique,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.household_members (
  household_id uuid not null references public.households(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  joined_at timestamptz not null default now(),
  primary key (household_id, user_id),
  unique (user_id)
);

create table if not exists public.tasks (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references public.households(id) on delete cascade,
  title text not null check (char_length(title) between 1 and 240),
  description text,
  priority text not null default 'C1' check (priority in ('A1','A2','A3','B1','B2','B3','C1','C2','C3','D')),
  assignment text not null default 'me' check (assignment in ('me','partner','both')),
  color text not null default '#8b5cf6',
  sort_order integer not null default 0,
  completed boolean not null default false,
  created_by uuid references auth.users(id) on delete set null,
  assigned_to uuid references auth.users(id) on delete set null,
  scheduled_date date,
  scheduled_time time,
  repeat_rule text check (repeat_rule is null or repeat_rule = 'daily'),
  completed_at timestamptz,
  deleted_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists tasks_household_date_idx
  on public.tasks(household_id, scheduled_date);
create index if not exists tasks_household_updated_idx
  on public.tasks(household_id, updated_at desc);

create table if not exists public.life_meetings (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references public.households(id) on delete cascade,
  meeting_date date not null default current_date,
  status text not null default 'draft' check (status in ('draft','active','completed')),
  check_in jsonb not null default '{}'::jsonb,
  gratitude jsonb not null default '[]'::jsonb,
  agenda jsonb not null default '[]'::jsonb,
  decisions jsonb not null default '[]'::jsonb,
  notes text,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists life_meetings_household_date_idx
  on public.life_meetings(household_id, meeting_date desc);

create or replace function public.generate_household_invite_code()
returns text
language plpgsql
set search_path = ''
as $$
declare
  alphabet constant text := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  candidate text;
  i integer;
begin
  loop
    candidate := '';
    for i in 1..8 loop
      candidate := candidate || substr(alphabet, 1 + floor(random() * length(alphabet))::integer, 1);
    end loop;
    exit when not exists (
      select 1 from public.households where invite_code = candidate
    );
  end loop;
  return candidate;
end;
$$;

create or replace function public.is_household_member(target_household uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.household_members
    where household_id = target_household
      and user_id = auth.uid()
  );
$$;

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  new_household_id uuid;
  requested_name text;
begin
  requested_name := left(coalesce(nullif(trim(new.raw_user_meta_data ->> 'display_name'), ''), split_part(new.email, '@', 1), 'New member'), 80);

  insert into public.profiles(id, display_name)
  values (new.id, requested_name);

  insert into public.households(name, invite_code, created_by)
  values ('Our Home', public.generate_household_invite_code(), new.id)
  returning id into new_household_id;

  insert into public.household_members(household_id, user_id)
  values (new_household_id, new.id);

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

create or replace function public.join_household_by_code(requested_code text)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  target_household uuid;
  current_household uuid;
  current_member_count integer;
  target_member_count integer;
begin
  if auth.uid() is null then
    raise exception 'Authentication required';
  end if;

  select id into target_household
  from public.households
  where invite_code = upper(trim(requested_code))
  for update;

  if target_household is null then
    raise exception 'Invite code not found';
  end if;

  select household_id into current_household
  from public.household_members
  where user_id = auth.uid();

  if current_household = target_household then
    return target_household;
  end if;

  select count(*) into target_member_count
  from public.household_members
  where household_id = target_household;

  if target_member_count >= 2 then
    raise exception 'This household already has two members';
  end if;

  select count(*) into current_member_count
  from public.household_members
  where household_id = current_household;

  if current_member_count > 1 then
    raise exception 'Leave your current shared household before joining another';
  end if;

  delete from public.household_members where user_id = auth.uid();
  insert into public.household_members(household_id, user_id)
  values (target_household, auth.uid());

  if current_household is not null then
    delete from public.households
    where id = current_household
      and created_by = auth.uid()
      and not exists (
        select 1 from public.household_members where household_id = current_household
      );
  end if;

  return target_household;
end;
$$;

create or replace function public.leave_household()
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  current_household uuid;
  new_household uuid;
  member_count integer;
begin
  if auth.uid() is null then
    raise exception 'Authentication required';
  end if;

  select household_id into current_household
  from public.household_members
  where user_id = auth.uid();

  if current_household is null then
    raise exception 'Household membership not found';
  end if;

  select count(*) into member_count
  from public.household_members
  where household_id = current_household;

  if member_count < 2 then
    return current_household;
  end if;

  delete from public.household_members where user_id = auth.uid();

  insert into public.households(name, invite_code, created_by)
  values ('Our Home', public.generate_household_invite_code(), auth.uid())
  returning id into new_household;

  insert into public.household_members(household_id, user_id)
  values (new_household, auth.uid());

  return new_household;
end;
$$;

create or replace function public.touch_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists profiles_touch_updated_at on public.profiles;
create trigger profiles_touch_updated_at before update on public.profiles
for each row execute function public.touch_updated_at();
drop trigger if exists households_touch_updated_at on public.households;
create trigger households_touch_updated_at before update on public.households
for each row execute function public.touch_updated_at();
drop trigger if exists tasks_touch_updated_at on public.tasks;
create trigger tasks_touch_updated_at before update on public.tasks
for each row execute function public.touch_updated_at();
drop trigger if exists life_meetings_touch_updated_at on public.life_meetings;
create trigger life_meetings_touch_updated_at before update on public.life_meetings
for each row execute function public.touch_updated_at();

alter table public.profiles enable row level security;
alter table public.households enable row level security;
alter table public.household_members enable row level security;
alter table public.tasks enable row level security;
alter table public.life_meetings enable row level security;

create policy "profiles visible to household members" on public.profiles
for select using (
  id = auth.uid()
  or exists (
    select 1
    from public.household_members mine
    join public.household_members theirs on theirs.household_id = mine.household_id
    where mine.user_id = auth.uid() and theirs.user_id = profiles.id
  )
);
create policy "users update their profile" on public.profiles
for update using (id = auth.uid()) with check (id = auth.uid());

create policy "members read household" on public.households
for select using (public.is_household_member(id));
create policy "members update household" on public.households
for update using (public.is_household_member(id)) with check (public.is_household_member(id));

create policy "members read membership" on public.household_members
for select using (public.is_household_member(household_id));

create policy "members read tasks" on public.tasks
for select using (public.is_household_member(household_id));
create policy "members create tasks" on public.tasks
for insert with check (public.is_household_member(household_id) and created_by = auth.uid());
create policy "members update tasks" on public.tasks
for update using (public.is_household_member(household_id))
with check (public.is_household_member(household_id));
create policy "members delete tasks" on public.tasks
for delete using (public.is_household_member(household_id));

create policy "members read meetings" on public.life_meetings
for select using (public.is_household_member(household_id));
create policy "members create meetings" on public.life_meetings
for insert with check (public.is_household_member(household_id) and created_by = auth.uid());
create policy "members update meetings" on public.life_meetings
for update using (public.is_household_member(household_id))
with check (public.is_household_member(household_id));
create policy "members delete meetings" on public.life_meetings
for delete using (public.is_household_member(household_id));

revoke all on function public.join_household_by_code(text) from public;
revoke all on function public.leave_household() from public;
revoke all on function public.is_household_member(uuid) from public;
grant execute on function public.join_household_by_code(text) to authenticated;
grant execute on function public.leave_household() to authenticated;
grant execute on function public.is_household_member(uuid) to authenticated;

do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'tasks'
  ) then
    alter publication supabase_realtime add table public.tasks;
  end if;
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'life_meetings'
  ) then
    alter publication supabase_realtime add table public.life_meetings;
  end if;
end $$;

-- Disable the unsafe legacy policies if those earlier tables exist.
do $$
begin
  if to_regclass('public.tasks_sync') is not null then
    drop policy if exists "read room tasks" on public.tasks_sync;
    drop policy if exists "insert room tasks" on public.tasks_sync;
    drop policy if exists "update room tasks" on public.tasks_sync;
    drop policy if exists "delete room tasks" on public.tasks_sync;
  end if;
  if to_regclass('public.routines') is not null then
    drop policy if exists "read routines" on public.routines;
    drop policy if exists "insert routines" on public.routines;
    drop policy if exists "update routines" on public.routines;
    drop policy if exists "delete routines" on public.routines;
  end if;
end $$;
