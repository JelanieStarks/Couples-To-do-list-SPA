-- LEGACY PROTOTYPE ONLY. These room-id policies are not safe for production.
-- Use the household policies in supabase/migrations instead.

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
