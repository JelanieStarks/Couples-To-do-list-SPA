/**
 * Household-scoped Supabase task persistence.
 *
 * The database owns access control through household RLS policies. The client
 * stores a normalized row for querying plus the complete task payload so the
 * current UI model can round-trip without losing fields.
 */
import type { RealtimeChannel } from '@supabase/supabase-js';
import type { Task } from '../types';
import { getSupabaseClient } from '../utils/supabaseClient';

const TABLE = 'tasks';
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

interface TaskRow {
  task_data: Task;
}

const validUuidOrNull = (value?: string): string | null => (
  value && UUID_PATTERN.test(value) ? value : null
);

const toRow = (task: Task, householdId: string, currentUserId: string) => ({
  household_id: householdId,
  client_id: task.id,
  task_data: task,
  title: task.title,
  description: task.description ?? null,
  priority: task.priority,
  assignment: task.assignment,
  color: task.color,
  sort_order: task.order ?? 0,
  completed: task.completed,
  created_by: validUuidOrNull(task.createdBy) ?? currentUserId,
  assigned_to: validUuidOrNull(task.assignedTo),
  scheduled_date: task.scheduledDate ?? null,
  scheduled_time: task.scheduledTime ?? null,
  repeat_rule: task.repeat ?? null,
  completed_at: task.completedAt ?? null,
  deleted_at: task.deletedAt ?? null,
  created_at: task.createdAt,
  updated_at: task.updatedAt,
});

export class SupabaseSync {
  private channel: RealtimeChannel | null = null;
  private refreshTimer: ReturnType<typeof setTimeout> | null = null;

  constructor(
    private householdId: string,
    private currentUserId: string,
  ) {}

  async fetchTasks(): Promise<Task[]> {
    const supabase = getSupabaseClient();
    if (!supabase || !this.householdId) return [];
    const { data, error } = await supabase
      .from(TABLE)
      .select('task_data')
      .eq('household_id', this.householdId)
      .order('created_at', { ascending: true });
    if (error) throw new Error(error.message);
    return ((data ?? []) as TaskRow[])
      .map(row => row.task_data)
      .filter((task): task is Task => Boolean(task?.id));
  }

  async upsertTasks(tasks: Task[]): Promise<void> {
    const supabase = getSupabaseClient();
    if (!supabase || !this.householdId || !this.currentUserId || !tasks.length) return;
    const rows = tasks.map(task => toRow(task, this.householdId, this.currentUserId));
    const { error } = await supabase
      .from(TABLE)
      .upsert(rows, { onConflict: 'household_id,client_id' });
    if (error) throw new Error(error.message);
  }

  async deleteTask(clientId: string): Promise<void> {
    const supabase = getSupabaseClient();
    if (!supabase || !this.householdId || !clientId) return;
    const { error } = await supabase
      .from(TABLE)
      .delete()
      .eq('household_id', this.householdId)
      .eq('client_id', clientId);
    if (error) throw new Error(error.message);
  }

  subscribe(
    onRemote: (tasks: Task[]) => void,
    onError?: (error: Error) => void,
  ): () => void {
    const supabase = getSupabaseClient();
    if (!supabase || !this.householdId) return () => {};

    const refresh = () => {
      if (this.refreshTimer) clearTimeout(this.refreshTimer);
      this.refreshTimer = setTimeout(() => {
        this.refreshTimer = null;
        void this.fetchTasks().then(onRemote).catch(error => onError?.(error as Error));
      }, 100);
    };

    this.channel = supabase.channel(`household-tasks-${this.householdId}`);
    this.channel.on('postgres_changes', {
      event: '*',
      schema: 'public',
      table: TABLE,
      filter: `household_id=eq.${this.householdId}`,
    }, refresh);
    this.channel.subscribe(status => {
      if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
        onError?.(new Error(`Task realtime connection ${status.toLowerCase().replace('_', ' ')}`));
      }
    });

    return () => {
      if (this.refreshTimer) {
        clearTimeout(this.refreshTimer);
        this.refreshTimer = null;
      }
      if (this.channel) {
        void supabase.removeChannel(this.channel);
        this.channel = null;
      }
    };
  }
}
