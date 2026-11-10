import { describe, expect, it, vi } from 'vitest';
import type { SupabaseClient } from '@supabase/supabase-js';
import { fetchLifeMeetings, upsertLifeMeeting } from '../lifeMeetingRepository';
import type { LifeMeeting } from '../../types';

const row = {
  id: '11111111-1111-4111-8111-111111111111',
  household_id: '22222222-2222-4222-8222-222222222222',
  title: 'Weekly Reset',
  meeting_date: '2026-09-18',
  status: 'draft',
  check_in: { 'user-1': { mood: '??', energy: 'high', supportNeed: 'Pray with me' } },
  gratitude: [{ id: 'g1', text: 'Grace', authorId: 'user-1' }],
  agenda: [],
  decisions: [],
  action_items: [{ id: 'a1', title: 'Plan date night', assignment: 'both', priority: 'B2' }],
  notes: 'Weekly check in',
  created_by: 'user-1',
  created_at: '2026-09-18T12:00:00.000Z',
  updated_at: '2026-09-18T12:00:00.000Z',
};

describe('lifeMeetingRepository', () => {
  it('maps household meeting rows into the app model', async () => {
    const order = vi.fn().mockResolvedValue({ data: [row], error: null });
    const eq = vi.fn(() => ({ order }));
    const select = vi.fn(() => ({ eq }));
    const client = { from: vi.fn(() => ({ select })) } as unknown as SupabaseClient;

    const meetings = await fetchLifeMeetings(client, row.household_id);

    expect(meetings[0]).toMatchObject({
      householdId: row.household_id,
      title: row.title,
      meetingDate: '2026-09-18',
      notes: 'Weekly check in',
      actionItems: [{ title: 'Plan date night', assignment: 'both' }],
    });
    expect(eq).toHaveBeenCalledWith('household_id', row.household_id);
  });

  it('updates shared meeting fields without re-inserting or changing its creator', async () => {
    const single = vi.fn().mockResolvedValue({ data: row, error: null });
    const lookupQuery: any = { eq: vi.fn(() => lookupQuery), maybeSingle: vi.fn().mockResolvedValue({ data: { id: row.id }, error: null }) };
    const updateQuery: any = { eq: vi.fn(() => updateQuery), select: vi.fn(() => ({ single })) };
    const update = vi.fn((_patch: unknown) => updateQuery);
    const insert = vi.fn();
    const client = { from: vi.fn(() => ({ select: () => lookupQuery, update, insert })) } as unknown as SupabaseClient;
    const meeting: LifeMeeting = {
      id: row.id,
      householdId: row.household_id,
      title: row.title,
      meetingDate: row.meeting_date,
      status: 'draft',
      checkIn: row.check_in as LifeMeeting['checkIn'],
      gratitude: row.gratitude,
      agenda: [],
      decisions: [],
      actionItems: row.action_items as LifeMeeting['actionItems'],
      notes: row.notes,
      createdBy: row.created_by,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };

    await upsertLifeMeeting(client, meeting);

    expect(update).toHaveBeenCalledWith(expect.objectContaining({
      household_id: row.household_id, action_items: meeting.actionItems,
    }));
    expect(update.mock.calls[0][0]).not.toHaveProperty('created_by');
    expect(update.mock.calls[0][0]).not.toHaveProperty('created_at');
    expect(insert).not.toHaveBeenCalled();
  });
});


