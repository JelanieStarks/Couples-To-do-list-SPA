import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { Task } from '../../types';
import { getSupabaseClient } from '../../utils/supabaseClient';
import { SupabaseSync } from '../supabaseSync';
vi.mock('../../utils/supabaseClient', () => ({ getSupabaseClient: vi.fn() }));
const home = '11111111-1111-4111-8111-111111111111';
const wife = '22222222-2222-4222-8222-222222222222';
const husband = '33333333-3333-4333-8333-333333333333';
const makeTask = (id: string, createdBy: string, title = id, updatedAt = '2026-11-10T10:00:00Z'): Task => ({ id, createdBy, title, updatedAt, createdAt: '2026-11-10T09:00:00Z', priority: 'B2', assignment: 'both', color: '#abc', completed: false, urgency: 'high' });
type Row = { client_id: string; household_id: string; created_by: string; updated_at: string; task_data: Task; [key: string]: any };
let rows: Row[], activeUser: string, fail: boolean, writes: string[];
const put = (task: Task): Row => ({ client_id: task.id, household_id: home, created_by: task.createdBy, updated_at: task.updatedAt!, task_data: structuredClone(task) });
const client = () => ({
  from: () => ({
    select: () => ({ eq: (_column: string, household: string) => ({ order: async () => ({ data: structuredClone(rows.filter(row => row.household_id === household)), error: null }) }) }),
    insert: async (row: Row) => {
      if (fail) { fail = false; return { error: { message: 'Offline' } }; }
      if (row.created_by !== activeUser) return { error: { message: 'Row-level security violation' } };
      if (rows.some(existing => existing.client_id === row.client_id)) return { error: { message: 'Duplicate', code: '23505' } };
      rows.push(structuredClone(row)); writes.push('insert:' + row.client_id); return { error: null };
    },
    update: (patch: Partial<Row>) => {
      const filters: [string, string][] = [];
      const query = {
        eq: (column: string, value: string) => { filters.push([column, value]); return query; },
        select: async () => {
          const found = rows.find(row => filters.every(([column, value]) => row[column] === value));
          if (!found) return { data: [], error: null };
          Object.assign(found, structuredClone(patch)); writes.push('update:' + found.client_id);
          return { data: [{ client_id: found.client_id }], error: null };
        },
      };
      return query;
    },
  }),
});

describe('creator-safe two-way cloud persistence', () => {
  beforeEach(() => { rows = []; writes = []; activeUser = wife; fail = false; vi.mocked(getSupabaseClient).mockReturnValue(client() as any); });
  it('uploads and downloads both spouses tasks without re-inserting the other spouse rows', async () => {
    const a = new SupabaseSync(home, wife), b = new SupabaseSync(home, husband);
    const hers = makeTask('hers', wife), his = makeTask('his', husband);
    await a.mergeAndUpload([hers]);
    activeUser = husband;
    const onHisDevice = await b.mergeAndUpload([his]);
    expect(onHisDevice.map(task => task.id).sort()).toEqual(['hers', 'his']);
    activeUser = wife;
    const onHerDevice = await a.mergeAndUpload([hers]);
    expect(onHerDevice.map(task => task.id).sort()).toEqual(['hers', 'his']);
    expect(writes).toEqual(['insert:hers', 'insert:his']);
  });
  it('updates a partner task without changing its creator and keeps newer cloud edits', async () => {
    const original = makeTask('hers', wife); rows = [put(original)]; activeUser = husband;
    const sync = new SupabaseSync(home, husband);
    await sync.upsertTasks([{ ...original, title: 'Edited by spouse', updatedAt: '2026-11-10T11:00:00Z' }]);
    expect(rows[0].created_by).toBe(wife);
    expect(rows[0].task_data.title).toBe('Edited by spouse');
    await sync.upsertTasks([original]);
    expect(rows[0].task_data.title).toBe('Edited by spouse');
    expect(writes).toEqual(['update:hers']);
  });
  it('retries a failed write instead of marking the local task as synced', async () => {
    const task = makeTask('offline', wife); const sync = new SupabaseSync(home, wife); fail = true;
    await expect(sync.mergeAndUpload([task])).rejects.toThrow('Offline');
    expect(rows).toHaveLength(0);
    await expect(sync.mergeAndUpload([task])).resolves.toEqual([task]);
    expect(rows).toHaveLength(1);
  });
  it('maps legacy task authors to the canonical row creator and preserves tombstones', async () => {
    const task = makeTask('legacy', 'old-demo-id'); rows = [{ ...put(task), created_by: wife }];
    const sync = new SupabaseSync(home, husband); activeUser = husband;
    expect((await sync.fetchTasks())[0].createdBy).toBe(wife);
    await sync.upsertTasks([{ ...task, updatedAt: '2026-11-10T12:00:00Z', deletedAt: '2026-11-10T12:00:00Z' }]);
    expect(rows[0].task_data.deletedAt).toBeTruthy();
    expect(rows[0].task_data.createdBy).toBe(wife);
  });
});
