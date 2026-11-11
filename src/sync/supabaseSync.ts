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
  id?: string;
  client_id?: string;
  created_by?: string;
  created_at?: string;
  updated_at?: string;
  task_data: Task;
}

const taskTime = (task: Task) => {
  const value = Date.parse(task.updatedAt || task.createdAt);
  return Number.isFinite(value) ? value : 0;
};

const urgencyForPriority = (priority: Task['priority']): NonNullable<Task['urgency']> => (
  priority.startsWith('A') ? 'urgent' : priority.startsWith('B') ? 'high' : priority.startsWith('C') ? 'medium' : 'low'
);

const normalizeTask = (task: Task): Task => ({
  ...task,
  updatedAt: task.updatedAt || task.createdAt || new Date(0).toISOString(),
  urgency: task.urgency || urgencyForPriority(task.priority),
});

const validUuidOrNull = (value?: string): string | null => (
  value && UUID_PATTERN.test(value) ? value : null
);

const toRow = (task: Task, householdId: string, currentUserId: string) => ({
  household_id: householdId,
  client_id: task.id,
  task_data: task,
  title: Array.from(task.title).slice(0, 240).join(''),
  description: task.description ?? null,
  priority: task.priority,
  assignment: task.assignment,
  color: task.color,
  sort_order: task.order ?? 0,
  completed: task.completed,
  created_by: validUuidOrNull(task.createdBy) ?? currentUserId,
  assigned_to: validUuidOrNull(task.assignedTo),
  scheduled_date: task.scheduledDate || null,
  scheduled_time: task.scheduledTime || null,
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

  private uploadQueue: Promise<void> = Promise.resolve();

  private async fetchRows(): Promise<TaskRow[]> {
    const supabase = getSupabaseClient();
    if (!supabase || !this.householdId) return [];
    const { data, error } = await supabase.from(TABLE)
      .select('id, client_id, created_by, created_at, updated_at, task_data')
      .eq('household_id', this.householdId)
      .order('created_at', { ascending: true });
    if (error) throw new Error(error.message);
    return (data ?? []) as TaskRow[];
  }

  private fromRow(row: TaskRow): Task {
    return normalizeTask({ ...row.task_data, createdBy: row.created_by || row.task_data.createdBy });
  }

  async fetchTasks(): Promise<Task[]> {
    return (await this.fetchRows()).filter(row => row.task_data?.id).map(row => this.fromRow(row));
  }

  async upsertTasks(tasks: Task[]): Promise<void> {
    // Keep writes ordered within this client. Every pass reads the latest rows,
    // so delayed requests cannot blindly upload an older whole-list snapshot.
    const pending = this.uploadQueue.then(() => this.persistChanges(tasks));
    this.uploadQueue = pending.catch(() => {});
    return pending;
  }

  private async persistChanges(tasks: Task[], retries = 1): Promise<void> {
    const supabase = getSupabaseClient();
    if (!supabase || !this.householdId || !this.currentUserId || !tasks.length) return;
    const existing = new Map((await this.fetchRows()).map(row => [row.client_id || row.task_data?.id, row]));
    const failures: string[] = [];
    for (const value of tasks) {
      const task = normalizeTask(value);
      try {
      const remote = existing.get(task.id);
      if (remote?.task_data && taskTime(task) <= taskTime(remote.task_data)) continue;
      if (!remote) {
        // INSERT checks creator ownership even on an UPSERT conflict. New rows
        // belong to this signed-in account; existing rows use UPDATE below.
        const owned = { ...task, createdBy: this.currentUserId };
        const { error } = await supabase.from(TABLE).insert(toRow(owned, this.householdId, this.currentUserId));
        if (error?.code === '23505' && retries > 0) return this.persistChanges(tasks, retries - 1);
        if (error) throw new Error(error.message);
      } else {
        const canonical = { ...task, createdBy: remote.created_by || task.createdBy };
        const row = toRow(canonical, this.householdId, this.currentUserId);
        // Preserve the original creator and creation date when either spouse edits.
        const { created_by: _creator, created_at: _created, ...updates } = row;
        let query = supabase.from(TABLE).update(updates)
          .eq('household_id', this.householdId).eq('client_id', task.id);
        if (remote.updated_at) query = query.eq('updated_at', remote.updated_at);
        const { data, error } = await query.select('client_id');
        if (error) throw new Error(error.message);
        if (!data?.length) {
          if (retries > 0) return this.persistChanges(tasks, retries - 1);
          throw new Error('A task changed while syncing. Your local changes are kept; sync again to retry.');
        }
      }
      } catch (error) { failures.push(`${task.title.slice(0, 50)}: ${(error as Error).message}`); }
    }
    if (failures.length) throw new Error(`${failures.length} task(s) still need saving. ${failures.join('; ')}`);
  }

  async mergeAndUpload(localTasks: Task[]): Promise<Task[]> {
    await this.upsertTasks(localTasks);
    // Download independently of uploads, including the other spouse's tasks.
    const remote = await this.fetchTasks();
    const received = new Map(remote.map(task => [task.id, task]));
    const missing = localTasks.filter(task => !received.has(task.id));
    if (missing.length) throw new Error(`${missing.length} task(s) were not confirmed in the database. Your local copy is kept; try Save & Sync again.`);
    return remote;
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
      if (status === 'SUBSCRIBED') refresh();
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
