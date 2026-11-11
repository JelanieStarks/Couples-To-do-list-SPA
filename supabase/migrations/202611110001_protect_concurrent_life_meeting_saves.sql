alter table public.life_meetings
  add column if not exists goals jsonb not null default '[]'::jsonb,
  add column if not exists sync_revision integer not null default 0;

create or replace function public.preserve_life_meeting_on_legacy_save()
returns trigger
language plpgsql
set search_path = ''
as $$
declare
  list_name text;
  old_list jsonb;
  incoming_list jsonb;
  merged_list jsonb;
  item jsonb;
  existing jsonb;
  item_position integer;
  text_key text;
  author_id text := (select auth.uid())::text;
  incoming_check_in jsonb;
  saved_support text;
  incoming_support text;
begin
  if new.sync_revision = old.sync_revision + 1 then
    return new;
  end if;

  -- Older builds submit full snapshots. Keep the current row and accept additions.
  foreach list_name in array array['gratitude', 'agenda', 'decisions', 'action_items'] loop
    old_list := to_jsonb(old) -> list_name;
    incoming_list := to_jsonb(new) -> list_name;
    merged_list := old_list;
    text_key := case when list_name = 'action_items' then 'title' else 'text' end;
    for item in select value from jsonb_array_elements(incoming_list) loop
      select value, (ordinality - 1)::integer into existing, item_position
      from jsonb_array_elements(merged_list) with ordinality
      where value ->> 'id' = item ->> 'id'
      limit 1;
      if not found then
        merged_list := merged_list || jsonb_build_array(item);
      else
        if coalesce(btrim(existing ->> text_key), '') = '' and item ->> text_key is not null then
          existing := jsonb_set(existing, array[text_key], item -> text_key);
        end if;
        if list_name = 'action_items' and existing ->> 'convertedAt' is null and item ->> 'convertedAt' is not null then
          existing := jsonb_set(existing, array['convertedAt'], item -> 'convertedAt');
        end if;
        merged_list := jsonb_set(merged_list, array[item_position::text], existing);
      end if;
    end loop;
    new := jsonb_populate_record(new, jsonb_build_object(list_name, merged_list));
  end loop;

  incoming_check_in := new.check_in -> author_id;
  new.check_in := old.check_in;
  if incoming_check_in is not null and jsonb_typeof(incoming_check_in) = 'object' then
    saved_support := coalesce(old.check_in -> author_id ->> 'supportNeed', '');
    incoming_support := coalesce(incoming_check_in ->> 'supportNeed', '');
    if incoming_support = '' or strpos(saved_support, incoming_support) > 0 then
      incoming_support := saved_support;
    elsif saved_support <> '' and left(incoming_support, length(saved_support)) <> saved_support then
      incoming_support := saved_support || E'\n\n' || incoming_support;
    end if;
    incoming_check_in := jsonb_set(incoming_check_in, array['supportNeed'], to_jsonb(incoming_support));
    new.check_in := jsonb_set(new.check_in, array[author_id], incoming_check_in);
  end if;

  if coalesce(btrim(new.notes), '') = '' or strpos(coalesce(old.notes, ''), new.notes) > 0 then
    new.notes := old.notes;
  elsif coalesce(old.notes, '') <> '' and left(new.notes, length(old.notes)) <> old.notes then
    new.notes := old.notes || E'\n\n' || new.notes;
  end if;
  new.title := old.title;
  new.meeting_date := old.meeting_date;
  new.status := old.status;
  new.goals := old.goals;
  new.sync_revision := old.sync_revision + 1;
  return new;
end;
$$;

revoke execute on function public.preserve_life_meeting_on_legacy_save() from public, anon, authenticated;

create trigger life_meetings_preserve_legacy_save
before update on public.life_meetings
for each row execute function public.preserve_life_meeting_on_legacy_save();
