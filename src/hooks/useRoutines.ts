/**
 * useRoutines
 * What: manage routine blocks per family member.
 * How: stores routines in localStorage and exposes helpers for UI.
 */
import { useEffect, useMemo, useRef, useState } from 'react';
import type { Routine, RoutineBlock, User } from '../types';
import { storage, STORAGE_KEYS, generateId } from '../utils';
import { createDefaultRoutineBlocks, normalizeRoutineBlocks } from '../utils/routine';
import { useAuth } from '../contexts/AuthContext';
import { deriveRoomId } from '../config';
import { isSupabaseRoutineSyncEnabled } from '../utils/supabaseClient';
import { RoutineSync } from '../sync/routineSync';

const createRoutine = (owner: User): Routine => {
  const now = new Date().toISOString();
  return {
    id: generateId(),
    ownerId: owner.id,
    ownerName: owner.name,
    blocks: createDefaultRoutineBlocks(),
    createdAt: now,
    updatedAt: now,
  };
};

export const useRoutines = () => {
  const { user, partner } = useAuth();
  const roomId = useMemo(() => deriveRoomId(user?.id, partner?.id), [user?.id, partner?.id]);
  const supabaseSyncEnabled = useMemo(() => isSupabaseRoutineSyncEnabled(), []);
  const routineSyncRef = useRef<RoutineSync | null>(null);
  const [routines, setRoutines] = useState<Record<string, Routine>>(() => {
    return storage.get<Record<string, Routine>>(STORAGE_KEYS.ROUTINES) || {};
  });

  const members = useMemo(() => {
    return [user, partner].filter(Boolean) as User[];
  }, [user, partner]);

  useEffect(() => {
    if (!members.length) return;
    setRoutines(prev => {
      const next = { ...prev };
      members.forEach(member => {
        if (!next[member.id]) {
          next[member.id] = createRoutine(member);
        }
      });
      return next;
    });
  }, [members]);

  useEffect(() => {
    if (!supabaseSyncEnabled || !roomId) return;
    const sync = new RoutineSync(roomId);
    routineSyncRef.current = sync;
    let active = true;

    const mergeRows = (rows: { id: string; owner_id: string; updated_at?: string; blocks: RoutineBlock[] }[]) => {
      if (!active) return;
      setRoutines(prev => {
        const next = { ...prev };
        rows.forEach(row => {
          const existing = next[row.owner_id];
          const incomingUpdated = row.updated_at ? new Date(row.updated_at).getTime() : 0;
          const currentUpdated = existing?.updatedAt ? new Date(existing.updatedAt).getTime() : 0;
          if (incomingUpdated < currentUpdated) return;
          const ownerName = members.find(member => member.id === row.owner_id)?.name || existing?.ownerName || 'Family';
          next[row.owner_id] = {
            id: row.id,
            ownerId: row.owner_id,
            ownerName,
            blocks: row.blocks || [],
            createdAt: existing?.createdAt || row.updated_at || new Date().toISOString(),
            updatedAt: row.updated_at || new Date().toISOString(),
          };
        });
        return next;
      });
    };

    void sync.fetchRoutines().then(mergeRows);
    const unsubscribe = sync.subscribe(mergeRows);

    return () => {
      active = false;
      unsubscribe();
      if (routineSyncRef.current === sync) {
        routineSyncRef.current = null;
      }
    };
  }, [supabaseSyncEnabled, roomId, members]);

  useEffect(() => {
    storage.set(STORAGE_KEYS.ROUTINES, routines);
  }, [routines]);

  const getRoutine = (ownerId: string): Routine | null => routines[ownerId] ?? null;

  const saveRoutine = (owner: User, blocks: RoutineBlock[]) => {
    const normalized = normalizeRoutineBlocks(blocks);
    if (!normalized.ok) {
      return normalized;
    }
    const now = new Date().toISOString();
    const nextRoutine: Routine = {
      id: routines[owner.id]?.id ?? generateId(),
      ownerId: owner.id,
      ownerName: owner.name,
      blocks: normalized.blocks,
      createdAt: routines[owner.id]?.createdAt ?? now,
      updatedAt: now,
    };
    setRoutines(prev => ({
      ...prev,
      [owner.id]: nextRoutine,
    }));
    if (supabaseSyncEnabled && routineSyncRef.current) {
      void routineSyncRef.current.upsertRoutine(nextRoutine, roomId ?? null);
    }
    return normalized;
  };

  return {
    members,
    getRoutine,
    saveRoutine,
  };
};
