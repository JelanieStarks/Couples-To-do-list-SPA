import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { LifeMeeting } from '../types';
import { useAuth } from '../contexts/AuthContext';
import { fetchLifeMeetings, subscribeToLifeMeetings, upsertLifeMeeting } from '../data/lifeMeetingRepository';
import { generateUuid, STORAGE_KEYS, storage, toLocalDateString } from '../utils';
import { getSupabaseClient, isSupabaseSyncEnabled } from '../utils/supabaseClient';

const sortMeetings = (meetings: LifeMeeting[]) => (
  [...meetings].sort((a, b) => b.meetingDate.localeCompare(a.meetingDate))
);

export const useLifeMeetings = () => {
  const { user } = useAuth();
  const client = useMemo(() => getSupabaseClient(), []);
  const remoteEnabled = useMemo(() => isSupabaseSyncEnabled() && Boolean(client), [client]);
  const householdId = user?.householdId ?? (user ? `demo-${user.id}` : '');
  const [meetings, setMeetings] = useState<LifeMeeting[]>(() => (
    sortMeetings(storage.get<LifeMeeting[]>(STORAGE_KEYS.LIFE_MEETINGS) ?? [])
  ));
  const [isLoading, setIsLoading] = useState(remoteEnabled);
  const [error, setError] = useState<string | null>(null);
  const meetingsRef = useRef(meetings);

  const persist = useCallback((incoming: LifeMeeting[]) => {
    const next = new Map(meetingsRef.current.map(meeting => [meeting.id, meeting]));
    for (const meeting of incoming) {
      const saved = next.get(meeting.id);
      if (!saved || (meeting.syncRevision ?? 0) >= (saved.syncRevision ?? 0)) next.set(meeting.id, meeting);
    }
    const sorted = sortMeetings([...next.values()]);
    meetingsRef.current = sorted;
    setMeetings(sorted);
    storage.set(STORAGE_KEYS.LIFE_MEETINGS, sorted);
  }, []);

  const refresh = useCallback(async () => {
    if (!client || !remoteEnabled || !householdId) return;
    try {
      const remote = await fetchLifeMeetings(client, householdId);
      persist(remote);
      setError(null);
    } catch (refreshError) {
      setError((refreshError as Error).message);
    } finally {
      setIsLoading(false);
    }
  }, [client, householdId, persist, remoteEnabled]);

  useEffect(() => {
    if (!client || !remoteEnabled || !householdId) {
      setIsLoading(false);
      return;
    }
    void refresh();
    return subscribeToLifeMeetings(client, householdId, () => void refresh(), nextError => {
      setError(nextError.message);
    });
  }, [client, householdId, refresh, remoteEnabled]);

  const createMeeting = useCallback((): LifeMeeting | null => {
    if (!user || !householdId) return null;
    const now = new Date().toISOString();
    return {
      id: generateUuid(),
      householdId,
      title: `Life Meeting � ${toLocalDateString(new Date())}`,
      meetingDate: toLocalDateString(new Date()),
      status: 'draft',
      checkIn: {},
      gratitude: [],
      agenda: [],
      decisions: [],
      actionItems: [],
      goals: [],
      notes: '',
      createdBy: user.id,
      createdAt: now,
      updatedAt: now,
    };
  }, [householdId, user]);

  const saveMeeting = useCallback(async (meeting: LifeMeeting, base: LifeMeeting | null): Promise<LifeMeeting> => {
    const pending = { ...meeting, updatedAt: new Date().toISOString() };
    if (!client || !remoteEnabled) {
      persist([pending]);
      setError(null);
      return pending;
    }
    try {
      const saved = await upsertLifeMeeting(client, pending, base);
      persist([saved]);
      setError(null);
      return saved;
    } catch (saveError) {
      setError((saveError as Error).message);
      throw saveError;
    }
  }, [client, persist, remoteEnabled]);

  return { meetings: meetings.filter(meeting => meeting.householdId === householdId), isLoading, error, createMeeting, saveMeeting, remoteEnabled };
};
