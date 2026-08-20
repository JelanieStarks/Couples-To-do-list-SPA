import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { Task } from '../../types';
import { getSupabaseClient } from '../../utils/supabaseClient';
import { SupabaseSync } from '../supabaseSync';

vi.mock('../../utils/supabaseClient', () => ({
  getSupabaseClient: vi.fn(),
}));

const householdId = '11111111-1111-4111-8111-111111111111';
const userId = '22222222-2222-4222-8222-222222222222';
const task: Task = {
  id: 'legacy-client-id',
  title: 'Plan date night',
  priority: 'B1',
  assignment: 'both',
  color: '#8b5cf6',
  completed: false,
  createdBy: userId,
  createdAt: '2026-08-20T10:00:00.000Z',
  updatedAt: '2026-08-20T10:00:00.000Z',
};

describe('SupabaseSync', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('loads complete task payloads from the authenticated household', async () => {
    const order = vi.fn().mockResolvedValue({ data: [{ task_data: task }], error: null });
    const eq = vi.fn(() => ({ order }));
    const select = vi.fn(() => ({ eq }));
    (getSupabaseClient as unknown as ReturnType<typeof vi.fn>).mockReturnValue({
      from: vi.fn(() => ({ select })),
    });

    const result = await new SupabaseSync(householdId, userId).fetchTasks();

    expect(result).toEqual([task]);
    expect(eq).toHaveBeenCalledWith('household_id', householdId);
  });

  it('upserts normalized columns and preserves legacy client ids in task_data', async () => {
    const upsert = vi.fn().mockResolvedValue({ error: null });
    (getSupabaseClient as unknown as ReturnType<typeof vi.fn>).mockReturnValue({
      from: vi.fn(() => ({ upsert })),
    });

    await new SupabaseSync(householdId, userId).upsertTasks([task]);

    expect(upsert).toHaveBeenCalledWith([
      expect.objectContaining({
        household_id: householdId,
        client_id: task.id,
        task_data: task,
        title: task.title,
        created_by: userId,
      }),
    ], { onConflict: 'household_id,client_id' });
  });

  it('hard-deletes only the matching household task', async () => {
    const finalEq = vi.fn().mockResolvedValue({ error: null });
    const firstEq = vi.fn(() => ({ eq: finalEq }));
    const remove = vi.fn(() => ({ eq: firstEq }));
    (getSupabaseClient as unknown as ReturnType<typeof vi.fn>).mockReturnValue({
      from: vi.fn(() => ({ delete: remove })),
    });

    await new SupabaseSync(householdId, userId).deleteTask(task.id);

    expect(firstEq).toHaveBeenCalledWith('household_id', householdId);
    expect(finalEq).toHaveBeenCalledWith('client_id', task.id);
  });
});
