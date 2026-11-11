import React from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { LifeMeeting } from '../../../types';
import { LifeMeetingPanel } from '../LifeMeetingPanel';
import { flushDrafts } from '../../../utils/draftPersistence';

const mocks = vi.hoisted(() => ({ createTask: vi.fn(), saveMeeting: vi.fn(), createMeeting: vi.fn(), tasks: [] as any[] }));
vi.mock('../../../contexts/AuthContext', () => ({ useAuth: () => ({ user: { id: 'wife', name: 'Partner', color: '#123' }, partner: { id: 'husband', name: 'Spouse', color: '#456' } }) }));
vi.mock('../../../contexts/TaskContext', () => ({ useTask: () => ({ createTask: mocks.createTask, tasks: mocks.tasks }) }));
vi.mock('../../../hooks/useLifeMeetings', () => ({ useLifeMeetings: () => ({ meetings: [], isLoading: false, remoteEnabled: true, createMeeting: mocks.createMeeting, saveMeeting: mocks.saveMeeting }) }));

const meeting = (): LifeMeeting => ({ id: 'meeting-1', householdId: 'home', meetingDate: '2026-11-10', status: 'draft', checkIn: {}, gratitude: [], agenda: [], decisions: [], actionItems: [], notes: '', createdBy: 'wife', createdAt: '2026-11-10T12:00:00Z', updatedAt: '2026-11-10T12:00:00Z' });
const openMeeting = async () => { render(<LifeMeetingPanel />); await userEvent.click(screen.getByRole('button', { name: /New$/ })); };

describe('Life Meeting bullet editing and tasks', () => {
  beforeEach(() => {
    vi.clearAllMocks(); localStorage.clear(); mocks.tasks = [];
    mocks.createMeeting.mockImplementation(meeting);
    mocks.saveMeeting.mockImplementation(async value => ({ ...value, updatedAt: '2026-11-10T13:00:00Z' }));
  });

  it('keeps spaces, punctuation, and new bullets while typing in all three sections', async () => {
    await openMeeting();
    for (const label of ['What I am thankful for', 'What we should discuss', 'What we decided']) {
      const field = screen.getByRole('textbox', { name: `${label} bullet` });
      await userEvent.type(field, 'A full sentence, with spaces.');
      expect(field).toHaveValue('A full sentence, with spaces.');
      fireEvent.keyDown(field, { key: 'Enter' });
      expect(field).toHaveValue('');
      const region = screen.getByRole('region', { name: label });
      expect(within(region).getByRole('listitem')).toHaveTextContent('A full sentence, with spaces.');
      await userEvent.type(field, 'Another point');
      await userEvent.click(within(region).getByRole('button', { name: 'Add bullet' }));
      await userEvent.click(within(region).getByRole('button', { name: 'Edit bullet: Another point' }));
      expect(field).toHaveValue('Another point');
      await userEvent.click(within(region).getByRole('button', { name: 'Done editing' }));
    }
    await act(async () => { await flushDrafts(); });
    for (const section of ['gratitude', 'agenda', 'decisions']) expect(mocks.saveMeeting.mock.calls.at(-1)![0][section].map((entry: any) => entry.text)).toEqual(['A full sentence, with spaces.', 'Another point']);
  });

  it('sends a discussion bullet to action items and creates exactly one planner task', async () => {
    await openMeeting();
    await userEvent.type(screen.getByRole('textbox', { name: 'What we should discuss bullet' }), 'Book counseling together{Enter}');
    const region = screen.getByRole('region', { name: 'What we should discuss' });
    await userEvent.click(within(region).getByRole('button', { name: 'Add to action items' }));
    expect(screen.getByPlaceholderText('Next step')).toHaveValue('Book counseling together');
    expect(mocks.createTask).not.toHaveBeenCalled();
    await userEvent.click(within(region).getByRole('button', { name: 'Make task now' }));
    await waitFor(() => expect(mocks.saveMeeting).toHaveBeenCalled());
    expect(mocks.createTask).toHaveBeenCalledTimes(1);
    expect(mocks.createTask).toHaveBeenCalledWith(expect.objectContaining({ title: 'Book counseling together', assignment: 'both' }), expect.stringContaining('meeting-meeting-1-agenda-'));
    expect(within(region).getByRole('button', { name: 'Task added' })).toBeDisabled();
  });

  it('turns a decision directly into a task and reports a meeting save failure without duplicating it', async () => {
    let failConversion = true;
    mocks.saveMeeting.mockImplementation(async value => {
      if (value.actionItems.some((item: any) => item.convertedAt) && failConversion) { failConversion = false; throw new Error('Connection interrupted'); }
      return { ...value, updatedAt: '2026-11-10T13:00:00Z' };
    });
    await openMeeting();
    await userEvent.type(screen.getByRole('textbox', { name: 'What we decided bullet' }), 'Plan our budget{Enter}');
    const region = screen.getByRole('region', { name: 'What we decided' });
    await userEvent.click(within(region).getByRole('button', { name: 'Make task now' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('Connection interrupted');
    expect(mocks.createTask).toHaveBeenCalledTimes(1);
    await userEvent.click(screen.getByRole('button', { name: 'Save meeting' }));
    await waitFor(() => expect(mocks.saveMeeting.mock.calls.at(-1)![0].actionItems[0].convertedAt).toBeTruthy());
    expect(mocks.createTask).toHaveBeenCalledTimes(1);
  });
  it('autosaves after typing pauses and flushes an unfinished field through the global save action', async () => {
    await openMeeting();
    const field = screen.getByRole('textbox', { name: 'What I am thankful for bullet' });
    fireEvent.change(field, { target: { value: 'A complete thought with spaces' } });
    await waitFor(() => expect(mocks.saveMeeting.mock.calls.at(-1)?.[0].gratitude[0].text).toBe('A complete thought with spaces'), { timeout: 2500 });
    fireEvent.change(field, { target: { value: 'More text before leaving the field' } });
    await act(async () => { await flushDrafts(); });
    expect(mocks.saveMeeting.mock.calls.at(-1)![0].gratitude[0].text).toBe('More text before leaving the field');
  });

  it('shows the spouse's request and saves goals with completed baby steps', async () => {
    mocks.createMeeting.mockReturnValue({
      ...meeting(), checkIn: { husband: { supportNeed: 'Take a walk together', energy: 'medium' } },
    });
    await openMeeting();
    expect(screen.getByText('Take a walk together')).toBeVisible();
    await userEvent.type(screen.getByRole('textbox', { name: 'Add a short-term goal' }), 'Plan a date{Enter}');
    await userEvent.type(screen.getByRole('textbox', { name: 'Add a long-term goal' }), 'Save for a house{Enter}');
    const goal = screen.getByText('Plan a date').closest('article')!;
    await userEvent.type(within(goal).getByRole('textbox', { name: 'Add a baby step' }), 'Pick a day{Enter}');
    await userEvent.click(within(goal).getByRole('checkbox', { name: 'Pick a day' }));
    await act(async () => { await flushDrafts(); });
    expect(mocks.saveMeeting.mock.calls.at(-1)![0].goals).toEqual([
      expect.objectContaining({ term: 'short', title: 'Plan a date', steps: [expect.objectContaining({ text: 'Pick a day', done: true })] }),
      expect.objectContaining({ term: 'long', title: 'Save for a house', steps: [] }),
    ]);
  });
});
