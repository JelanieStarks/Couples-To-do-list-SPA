-- Enable the household-scoped task sync client added after the MVP foundation.
-- Safe to run more than once.

alter table public.tasks
  add column if not exists client_id text,
  add column if not exists task_data jsonb not null default '{}'::jsonb;

-- Preserve any early rows created before client_id existed.
update public.tasks
set client_id = id::text
where client_id is null;

alter table public.tasks
  alter column client_id set not null;

create unique index if not exists tasks_household_client_id_idx
  on public.tasks(household_id, client_id);

-- Realtime DELETE events need the household/client columns from the old row.
alter table public.tasks replica identity full;
