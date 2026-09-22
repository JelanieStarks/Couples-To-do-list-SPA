import type { RealtimeChannel, SupabaseClient } from '@supabase/supabase-js';
import type { LifeMeeting } from '../types';

const TABLE = 'life_meetings';

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
  notes: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

const fromRow = (row: LifeMeetingRow): LifeMeeting => ({
  id: row.id,
  householdId: row.household_id,
  title: row.title || `Life Meeting · ${row.meeting_date}`,
  meetingDate: row.meeting_date,
  status: row.status,
  checkIn: row.check_in ?? {},
  gratitude: row.gratitude ?? [],
  agenda: row.agenda ?? [],
  decisions: row.decisions ?? [],
  actionItems: row.action_items ?? [],
  notes: row.notes ?? '',
  createdBy: row.created_by ?? '',
  createdAt: row.created_at,
  updatedAt: row.updated_at,
});

const toRow = (meeting: LifeMeeting) => ({
  id: meeting.id,
  household_id: meeting.householdId,
  title: meeting.title?.trim() || `Life Meeting · ${meeting.meetingDate}`,
  meeting_date: meeting.meetingDate,
  status: meeting.status,
  check_in: meeting.checkIn,
  gratitude: meeting.gratitude,
  agenda: meeting.agenda,
  decisions: meeting.decisions,
  action_items: meeting.actionItems,
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
    .select('id, household_id, title, meeting_date, status, check_in, gratitude, agenda, decisions, action_items, notes, created_by, created_at, updated_at')
    .eq('household_id', householdId)
    .order('meeting_date', { ascending: false });
  if (error) throw new Error(error.message);
  return ((data ?? []) as LifeMeetingRow[]).map(fromRow);
};

export const upsertLifeMeeting = async (
  client: SupabaseClient,
  meeting: LifeMeeting,
): Promise<LifeMeeting> => {
  const { data, error } = await client
    .from(TABLE)
    .upsert(toRow(meeting), { onConflict: 'id' })
    .select('id, household_id, title, meeting_date, status, check_in, gratitude, agenda, decisions, action_items, notes, created_by, created_at, updated_at')
    .single();
  if (error) throw new Error(error.message);
  return fromRow(data as LifeMeetingRow);
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
    if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
      onError?.(new Error(`Life Meeting realtime connection ${status.toLowerCase().replace('_', ' ')}`));
    }
  });

  return () => {
    if (refreshTimer) clearTimeout(refreshTimer);
    void client.removeChannel(channel);
  };
};
