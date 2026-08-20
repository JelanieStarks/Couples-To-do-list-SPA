-- LEGACY PROTOTYPE ONLY. Do not run for the current app.
-- Use the ordered files in supabase/migrations instead.

create table if not exists public.tasks_sync (
  id text primary key,
  room_id text not null,
  updated_at timestamptz default now(),
  task jsonb not null
);

create index if not exists tasks_sync_room_id_idx on public.tasks_sync(room_id);
create index if not exists tasks_sync_updated_at_idx on public.tasks_sync(updated_at);

create table if not exists public.routines (
  id text primary key,
  owner_id text not null,
  room_id text,
  updated_at timestamptz default now(),
  blocks jsonb not null
);

create index if not exists routines_owner_id_idx on public.routines(owner_id);
create index if not exists routines_room_id_idx on public.routines(room_id);
create index if not exists routines_updated_at_idx on public.routines(updated_at);
