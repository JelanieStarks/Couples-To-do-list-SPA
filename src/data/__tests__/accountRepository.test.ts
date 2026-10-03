import { describe, expect, it, vi } from 'vitest';
import type { SupabaseClient, User as SupabaseAuthUser } from '@supabase/supabase-js';
import {
  joinHousehold,
  leaveHousehold,
  loadAccountSnapshot,
  updateProfile,
} from '../accountRepository';

const authUser = {
  id: 'user-1',
  email: 'lani@example.com',
  created_at: '2026-08-19T00:00:00.000Z',
} as SupabaseAuthUser;

const makeThenable = (listResult: unknown, singleResult: unknown) => ({
  single: vi.fn().mockResolvedValue(singleResult),
  then: (resolve: (value: unknown) => unknown) => Promise.resolve(listResult).then(resolve),
});

describe('accountRepository', () => {
  it('maps the authenticated user and household partner without exposing partner email', async () => {
    const from = vi.fn((table: string) => ({
      select: vi.fn(() => ({
        eq: vi.fn((column: string) => {
          if (table === 'profiles') {
            return makeThenable(null, {
              data: { id: 'user-1', display_name: 'Lani', color: '#ec4899', created_at: '2026-08-19T00:00:00.000Z' },
              error: null,
            });
          }
          if (table === 'households') {
            return makeThenable(null, {
              data: { id: 'home-1', name: 'Our Home', invite_code: 'LOVE2345' },
              error: null,
            });
          }
          if (table === 'household_members' && column === 'user_id') {
            return makeThenable(null, {
              data: { household_id: 'home-1', user_id: 'user-1' },
              error: null,
            });
          }
          return makeThenable({
            data: [
              { household_id: 'home-1', user_id: 'user-1' },
              { household_id: 'home-1', user_id: 'user-2' },
            ],
            error: null,
          }, null);
        }),
        in: vi.fn().mockResolvedValue({
          data: [
            { id: 'user-1', display_name: 'Lani', color: '#ec4899', created_at: '2026-08-19T00:00:00.000Z' },
            { id: 'user-2', display_name: 'Tachyana', color: '#3b82f6', created_at: '2026-08-19T00:00:00.000Z' },
          ],
          error: null,
        }),
      })),
    }));
    const client = { from } as unknown as SupabaseClient;

    const snapshot = await loadAccountSnapshot(client, authUser);

    expect(snapshot.user).toMatchObject({
      id: 'user-1',
      name: 'Lani',
      householdId: 'home-1',
      inviteCode: 'LOVE2345',
      partnerId: 'user-2',
    });
    expect(snapshot.partner).toMatchObject({ id: 'user-2', name: 'Tachyana' });
    expect(snapshot.partner?.email).toBeUndefined();
  });

  it('uses protected database functions to join and leave a household', async () => {
    const rpc = vi.fn().mockResolvedValue({ data: 'home-1', error: null });
    const client = { rpc } as unknown as SupabaseClient;

    await joinHousehold(client, ' love2345 ');
    await leaveHousehold(client);

    expect(rpc).toHaveBeenNthCalledWith(1, 'join_household_by_code', { requested_code: 'LOVE2345' });
    expect(rpc).toHaveBeenNthCalledWith(2, 'leave_household');
  });

  it('maps profile field names before updating', async () => {
    const eq = vi.fn().mockResolvedValue({ error: null });
    const update = vi.fn(() => ({ eq }));
    const client = { from: vi.fn(() => ({ update })) } as unknown as SupabaseClient;

    await updateProfile(client, 'user-1', { name: '  Jelanie  ', color: '#22c55e' });

    expect(update).toHaveBeenCalledWith({ display_name: 'Jelanie', color: '#22c55e' });
    expect(eq).toHaveBeenCalledWith('id', 'user-1');
  });
});
