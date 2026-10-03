-- LEGACY PROTOTYPE ONLY. Current task realtime uses Postgres Changes configured
-- by the ordered files in supabase/migrations.

create or replace function public.broadcast_tasks_sync_changes()
returns trigger as $$
begin
  perform realtime.broadcast_changes(
    'public',
    'tasks_sync',
    tg_op,
    new,
    old
  );
  return case when tg_op = 'DELETE' then old else new end;
end;
$$ language plpgsql security definer;

create trigger tasks_sync_realtime
after insert or update or delete on public.tasks_sync
for each row execute function public.broadcast_tasks_sync_changes();

create or replace function public.broadcast_routines_changes()
returns trigger as $$
begin
  perform realtime.broadcast_changes(
    'public',
    'routines',
    tg_op,
    new,
    old
  );
  return case when tg_op = 'DELETE' then old else new end;
end;
$$ language plpgsql security definer;

create trigger routines_realtime
after insert or update or delete on public.routines
for each row execute function public.broadcast_routines_changes();
