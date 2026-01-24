/**
 * RoutineSync
 * - Persists routines to Supabase table `routines`
 * - Listens to Postgres changes for the current room
 * - No-ops when Supabase client is unavailable (e.g., tests)
 */
import type { RealtimeChannel } from '@supabase/supabase-js';
import type { Routine, RoutineBlock } from '../types';
import { getSupabaseClient } from '../utils/supabaseClient';

const TABLE = 'routines';

interface RoutineRow {
  id: string;
  owner_id: string;
  room_id: string | null;
  updated_at?: string;
  blocks: RoutineBlock[];
}

export class RoutineSync {
  private channel: RealtimeChannel | null = null;

  constructor(private roomId: string) {}

  async fetchRoutines(): Promise<RoutineRow[]> {
    const supabase = getSupabaseClient();
    if (!supabase || !this.roomId) return [];
    const { data, error } = await supabase
      .from<RoutineRow>(TABLE)
      .select('id, owner_id, room_id, updated_at, blocks')
      .eq('room_id', this.roomId);
    if (error) {
      console.warn('[RoutineSync] fetchRoutines failed', error.message);
      return [];
    }
    return data ?? [];
  }

  async upsertRoutine(routine: Routine, roomId: string | null): Promise<void> {
    const supabase = getSupabaseClient();
    if (!supabase || !routine) return;
    const row: RoutineRow = {
      id: routine.id,
      owner_id: routine.ownerId,
      room_id: roomId ?? null,
      updated_at: routine.updatedAt,
      blocks: routine.blocks,
    };
    const { error } = await supabase.from(TABLE).upsert(row, { onConflict: 'id' });
    if (error) {
      console.warn('[RoutineSync] upsertRoutine failed', error.message);
    }
  }

  subscribe(onRemote: (rows: RoutineRow[]) => void): () => void {
    const supabase = getSupabaseClient();
    if (!supabase || !this.roomId) return () => {};
    this.channel = supabase.channel(`routines-db-${this.roomId}`);
    this.channel.on('postgres_changes', {
      event: '*',
      schema: 'public',
      table: TABLE,
      filter: `room_id=eq.${this.roomId}`,
    }, () => {
      void this.fetchRoutines().then(rows => {
        if (rows.length) {
          onRemote(rows);
        }
      });
    });
    this.channel.subscribe();
    return () => {
      if (this.channel) {
        this.channel.unsubscribe();
        this.channel = null;
      }
    };
  }
}
