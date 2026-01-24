-- RLS policies for tasks_sync
-- Note: This uses a simple room_id rule. Replace with a membership table when ready.

alter table public.tasks_sync enable row level security;

create policy "read room tasks" on public.tasks_sync
  for select
  using (auth.uid()::text = room_id or room_id like 'pair-%');

create policy "insert room tasks" on public.tasks_sync
  for insert
  with check (auth.uid()::text = room_id or room_id like 'pair-%');

create policy "update room tasks" on public.tasks_sync
  for update
  using (auth.uid()::text = room_id or room_id like 'pair-%')
  with check (auth.uid()::text = room_id or room_id like 'pair-%');

create policy "delete room tasks" on public.tasks_sync
  for delete
  using (auth.uid()::text = room_id or room_id like 'pair-%');

alter table public.routines enable row level security;

create policy "read routines" on public.routines
  for select
  using (auth.uid()::text = owner_id or room_id like 'pair-%');

create policy "insert routines" on public.routines
  for insert
  with check (auth.uid()::text = owner_id or room_id like 'pair-%');

create policy "update routines" on public.routines
  for update
  using (auth.uid()::text = owner_id or room_id like 'pair-%')
  with check (auth.uid()::text = owner_id or room_id like 'pair-%');

create policy "delete routines" on public.routines
  for delete
  using (auth.uid()::text = owner_id or room_id like 'pair-%');
