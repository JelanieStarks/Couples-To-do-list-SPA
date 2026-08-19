/**
 * SupabaseSync
 * - Persists tasks to Supabase table `tasks_sync`
 * - Listens to Postgres changes for the current room
 * - No-ops when Supabase client is unavailable (e.g., tests)
 */
import type { RealtimeChannel } from '@supabase/supabase-js';
import type { Task } from '../types';
import { getSupabaseClient } from '../utils/supabaseClient';

const TABLE = 'tasks_sync';

interface TaskRow {
  id: string;
  room_id: string;
  updated_at?: string;
  task: Task;
}

export class SupabaseSync {
  private channel: RealtimeChannel | null = null;

  constructor(private roomId: string) {}

  async fetchTasks(): Promise<Task[]> {
    const supabase = getSupabaseClient();
    if (!supabase || !this.roomId) return [];
    const { data, error } = await supabase
      .from(TABLE)
      .select('task')
      .eq('room_id', this.roomId);
    if (error) {
      console.warn('[SupabaseSync] fetchTasks failed', error.message);
      return [];
    }
    return ((data ?? []) as Pick<TaskRow, 'task'>[]).map(row => row.task);
  }

  async upsertTasks(tasks: Task[]): Promise<void> {
    const supabase = getSupabaseClient();
    if (!supabase || !this.roomId || !tasks.length) return;
    const rows: TaskRow[] = tasks.map(task => ({
      id: task.id,
      room_id: this.roomId,
      updated_at: new Date(task.updatedAt).toISOString(),
      task,
    }));
    const { error } = await supabase.from(TABLE).upsert(rows, { onConflict: 'id' });
    if (error) {
      console.warn('[SupabaseSync] upsertTasks failed', error.message);
    }
  }

  subscribe(onRemote: (tasks: Task[]) => void): () => void {
    const supabase = getSupabaseClient();
    if (!supabase || !this.roomId) return () => {};
    this.channel = supabase.channel(`tasks-db-${this.roomId}`);
    this.channel.on('postgres_changes', {
      event: '*',
      schema: 'public',
      table: TABLE,
      filter: `room_id=eq.${this.roomId}`,
    }, payload => {
      const row = payload.new as TaskRow;
      if (!row?.task) return;
      // Fetch full snapshot to avoid partial divergence when multiple rows change.
      void this.fetchTasks().then(tasks => {
        if (tasks.length) {
          onRemote(tasks);
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
