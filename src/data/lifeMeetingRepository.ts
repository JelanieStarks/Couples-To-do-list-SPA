import type { RealtimeChannel, SupabaseClient } from '@supabase/supabase-js';
import type { LifeMeeting } from '../types';
import { mergeLifeMeeting } from './mergeLifeMeeting';

const TABLE = 'life_meetings';
const COLUMNS = 'id, household_id, title, meeting_date, status, check_in, gratitude, agenda, decisions, action_items, goals, notes, created_by, created_at, updated_at, sync_revision';

interface LifeMeetingRow {
  id: string;
  household_id: string;
  title?: string | null;
  meeting_date: string;
  status: LifeMeeting['status'];
  check_in: LifeMeeting['checkIn'];
  gratitude: LifeMeeting['gratitude'];
  agenda: LifeMeeting['agenda'];
  decisions: LifeMeeting['decisions'];
  action_items?: LifeMeeting['actionItems'];
  goals: LifeMeeting['goals'];
  sync_revision: number;
  notes: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

const fromRow = (row: LifeMeetingRow): LifeMeeting => ({
  id: row.id,
  householdId: row.household_id,
  title: row.title || `Life Meeting � ${row.meeting_date}`,
  meetingDate: row.meeting_date,
  status: row.status,
  checkIn: row.check_in ?? {},
  gratitude: row.gratitude ?? [],
  agenda: row.agenda ?? [],
  decisions: row.decisions ?? [],
  actionItems: row.action_items ?? [],
  goals: row.goals ?? [],
  syncRevision: row.sync_revision,
  notes: row.notes ?? '',
  createdBy: row.created_by ?? '',
  createdAt: row.created_at,
  updatedAt: row.updated_at,
});

const toRow = (meeting: LifeMeeting) => ({
  id: meeting.id,
  household_id: meeting.householdId,
  title: meeting.title?.trim() || `Life Meeting � ${meeting.meetingDate}`,
  meeting_date: meeting.meetingDate,
  status: meeting.status,
  check_in: meeting.checkIn,
  gratitude: meeting.gratitude,
  agenda: meeting.agenda,
  decisions: meeting.decisions,
  action_items: meeting.actionItems,
  goals: meeting.goals ?? [],
  notes: meeting.notes || null,
  created_by: meeting.createdBy,
  created_at: meeting.createdAt,
  updated_at: meeting.updatedAt,
});

export const fetchLifeMeetings = async (
  client: SupabaseClient,
  householdId: string,
): Promise<LifeMeeting[]> => {
  const { data, error } = await client
    .from(TABLE)
    .select(COLUMNS)
    .eq('household_id', householdId)
    .order('meeting_date', { ascending: false });
  if (error) throw new Error(error.message);
  return ((data ?? []) as LifeMeetingRow[]).map(fromRow);
};

export const upsertLifeMeeting = async (
  client: SupabaseClient,
  meeting: LifeMeeting,
  base: LifeMeeting | null,
): Promise<LifeMeeting> => {
  for (let attempt = 0; attempt < 5; attempt++) {
    const lookup = await client.from(TABLE).select(COLUMNS)
      .eq('household_id', meeting.householdId).eq('id', meeting.id).maybeSingle();
    if (lookup.error) throw new Error(lookup.error.message);
    if (!lookup.data) {
      const { data, error } = await client.from(TABLE).insert(toRow(meeting)).select(COLUMNS).single();
      if (error?.code === '23505') continue;
      if (error) throw new Error(error.message);
      return fromRow(data as LifeMeetingRow);
    }
    const current = fromRow(lookup.data as LifeMeetingRow);
    const syncRevision = current.syncRevision!;
    const { id, household_id, created_by: _creator, created_at: _created, ...updates } =
      toRow(mergeLifeMeeting(base, meeting, current));
    const { data, error } = await client.from(TABLE).update({ ...updates, sync_revision: syncRevision + 1 })
      .eq('household_id', household_id).eq('id', id).eq('sync_revision', syncRevision)
      .select(COLUMNS).maybeSingle();
    if (error) throw new Error(error.message);
    if (data) return fromRow(data as LifeMeetingRow);
  }
  throw new Error('Someone else is saving this meeting. Your changes will retry automatically.');
};

export const subscribeToLifeMeetings = (
  client: SupabaseClient,
  householdId: string,
  onChange: () => void,
  onError?: (error: Error) => void,
): (() => void) => {
  let refreshTimer: ReturnType<typeof setTimeout> | null = null;
  const channel: RealtimeChannel = client.channel(`household-life-meetings-${householdId}`);
  channel.on('postgres_changes', {
    event: '*',
    schema: 'public',
    table: TABLE,
    filter: `household_id=eq.${householdId}`,
  }, () => {
    if (refreshTimer) clearTimeout(refreshTimer);
    refreshTimer = setTimeout(onChange, 100);
  });
  channel.subscribe(status => {
    if (status === 'SUBSCRIBED') onChange();
    if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
      onError?.(new Error(`Life Meeting realtime connection ${status.toLowerCase().replace('_', ' ')}`));
    }
  });

  return () => {
    if (refreshTimer) clearTimeout(refreshTimer);
    void client.removeChannel(channel);
  };
};

