import { useCallback, useEffect, useMemo, useState } from 'react';
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

  const persist = useCallback((next: LifeMeeting[]) => {
    const sorted = sortMeetings(next);
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
      title: `Life Meeting · ${toLocalDateString(new Date())}`,
      meetingDate: toLocalDateString(new Date()),
      status: 'draft',
      checkIn: {},
      gratitude: [],
      agenda: [],
      decisions: [],
      actionItems: [],
      notes: '',
      createdBy: user.id,
      createdAt: now,
      updatedAt: now,
    };
  }, [householdId, user]);

  const saveMeeting = useCallback(async (meeting: LifeMeeting): Promise<LifeMeeting> => {
    const pending = { ...meeting, updatedAt: new Date().toISOString() };
    persist([pending, ...meetings.filter(item => item.id !== pending.id)]);
    if (!client || !remoteEnabled) {
      setError(null);
      return pending;
    }
    try {
      const saved = await upsertLifeMeeting(client, pending);
      persist([saved, ...meetings.filter(item => item.id !== saved.id)]);
      setError(null);
      return saved;
    } catch (saveError) {
      setError((saveError as Error).message);
      throw saveError;
    }
  }, [client, meetings, persist, remoteEnabled]);

  return { meetings, isLoading, error, createMeeting, saveMeeting, remoteEnabled };
};
