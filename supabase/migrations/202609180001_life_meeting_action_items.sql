-- Add first-class action items to the household life-meeting record.
-- Safe to apply more than once.

alter table public.life_meetings
  add column if not exists action_items jsonb not null default '[]'::jsonb;

alter table public.life_meetings replica identity full;
