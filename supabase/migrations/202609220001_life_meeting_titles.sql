-- Add optional names for Life Meetings without changing existing records.
alter table public.life_meetings
  add column if not exists title text;