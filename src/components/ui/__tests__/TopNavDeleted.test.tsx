import { describe, it, expect, beforeEach, vi } from 'vitest';
import React from 'react';
import { renderWithProviders } from '../../../test-utils/renderWithProviders';
import { TopNavPanel } from '../TopNavPanel';
import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { storage, STORAGE_KEYS, toLocalDateString } from '../../../utils';

const seed = () => {
  const today = toLocalDateString(new Date());
  const tasks = [
    { id: '1', title: 'Active task', priority: 'C1', assignment: 'me', color: '#ec4899', completed: false, createdBy: 'u1', createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(), scheduledDate: today },
    { id: '2', title: 'Deleted task', priority: 'B1', assignment: 'partner', color: '#3b82f6', completed: false, createdBy: 'u1', createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(), scheduledDate: today, deletedAt: new Date().toISOString() },
  ];
  storage.set(STORAGE_KEYS.TASKS, tasks);
  storage.set(STORAGE_KEYS.USER, { id: 'u1', name: 'Me', inviteCode: 'ABC123', color: '#ec4899', createdAt: new Date().toISOString() });
};

describe('TopNavPanel Deleted view', () => {
  beforeEach(() => {
    storage.clearAll();
    vi.spyOn(window, 'confirm').mockImplementation(() => true);
  });

  it('opens Deleted card and lists deleted tasks, allows restore', async () => {
    seed();
    const user = userEvent.setup();
    renderWithProviders(<TopNavPanel open={true} onClose={() => {}} />);

    // Open Deleted card
    await user.click(screen.getByTestId('topnav-btn-deleted'));
    expect(screen.getByTestId('topnav-card-deleted')).toBeInTheDocument();

    // Deleted task is visible
    expect(screen.getByText('Deleted task')).toBeInTheDocument();

    // Restore it
    await user.click(screen.getByTestId('restore-2'));
    // It should disappear from deleted list
    expect(screen.queryByText('Deleted task')).not.toBeInTheDocument();
  });

  it('empties trash and removes deleted items', async () => {
    seed();
    const user = userEvent.setup();
    renderWithProviders(<TopNavPanel open={true} onClose={() => {}} />);

    await user.click(screen.getByTestId('topnav-btn-deleted'));
    expect(screen.getByText('Deleted task')).toBeInTheDocument();
    await user.click(screen.getByTestId('empty-trash'));
    expect(screen.queryByText('Deleted task')).not.toBeInTheDocument();
  });

  it('keeps Clear All in settings card', async () => {
    const user = userEvent.setup();
    renderWithProviders(<TopNavPanel open={true} onClose={() => {}} />);

    await user.click(screen.getByTestId('topnav-btn-settings'));
    expect(screen.getByTestId('topnav-card-settings')).toBeInTheDocument();
    expect(screen.getByTestId('clear-data')).toBeInTheDocument();
  });
});
