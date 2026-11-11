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
  check_in: { 'user-1': { mood: '🙂', energy: 'high', supportNeed: 'Pray with me' } },
  gratitude: [{ id: 'g1', text: 'Grace', authorId: 'user-1' }],
  agenda: [],
  decisions: [],
  action_items: [{ id: 'a1', title: 'Plan date night', assignment: 'both', priority: 'B2' }],
  notes: 'Weekly check in',
  created_by: 'user-1',
  created_at: '2026-09-18T12:00:00.000Z',
  updated_at: '2026-09-18T12:00:00.000Z',
  sync_revision: 0,
  goals: [],
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

  it('re-reads and merges shared entries if another device wins the write race', async () => {
    const latest = { ...row, sync_revision: 1, agenda: [{ id: 'partner', text: 'Partner bullet', authorId: 'user-2' }] };
    const lookup = vi.fn().mockResolvedValueOnce({ data: row, error: null }).mockResolvedValueOnce({ data: latest, error: null });
    const written = vi.fn().mockResolvedValueOnce({ data: null, error: null }).mockResolvedValueOnce({ data: latest, error: null });
    const lookupQuery: any = { eq: vi.fn(() => lookupQuery), maybeSingle: lookup };
    const updateQuery: any = { eq: vi.fn(() => updateQuery), select: vi.fn(() => ({ maybeSingle: written })) };
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

    const draft = { ...meeting, agenda: [{ id: 'mine', text: 'My bullet', authorId: 'user-1' }] };
    await upsertLifeMeeting(client, draft, meeting);

    expect(update).toHaveBeenLastCalledWith(expect.objectContaining({
      sync_revision: 2,
      action_items: meeting.actionItems,
      agenda: [...latest.agenda, ...draft.agenda],
    }));
    expect(updateQuery.eq).toHaveBeenCalledWith('sync_revision', 0);
    expect(updateQuery.eq).toHaveBeenCalledWith('sync_revision', 1);
    expect(update.mock.calls[0][0]).not.toHaveProperty('created_by');
    expect(update.mock.calls[0][0]).not.toHaveProperty('created_at');
    expect(insert).not.toHaveBeenCalled();
  });
});

