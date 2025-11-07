import { describe, it, expect, beforeEach } from 'vitest';
import React from 'react';
import { renderWithProviders } from '../../../test-utils/renderWithProviders';
import { TodaysTasks } from '../TodaysTasks';
import { WeeklyCalendar } from '../../calendar/WeeklyCalendar';
import { screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { storage, STORAGE_KEYS, toLocalDateString } from '../../../utils';

const seed = () => {
  const today = toLocalDateString(new Date());
  const tasks = [
    { id: '1', title: 'Buy milk', priority: 'C1', assignment: 'me', color: '#ec4899', completed: false, createdBy: 'u1', createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(), scheduledDate: today },
    { id: '2', title: 'Pay bills', priority: 'A1', assignment: 'partner', color: '#3b82f6', completed: false, createdBy: 'u1', createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(), scheduledDate: today },
    { id: '3', title: 'Plan trip', priority: 'B2', assignment: 'both', color: '#8b5cf6', completed: true, createdBy: 'u1', createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(), scheduledDate: today },
  ];
  storage.set(STORAGE_KEYS.TASKS, tasks);
  storage.set(STORAGE_KEYS.USER, { id: 'u1', name: 'Me', inviteCode: 'ABC123', color: '#ec4899', createdAt: new Date().toISOString() });
  storage.set(STORAGE_KEYS.SETTINGS, {});
};

describe('TaskFilterMenu', () => {
  beforeEach(() => {
    storage.clearAll();
    seed();
  });

  it('filters Today list by text, priority, assignment, and hide completed', async () => {
    const user = userEvent.setup();
    renderWithProviders(<TodaysTasks />);

    // Open filter
  await user.click(screen.getByTestId('filter-button'));

    // Type search
    await user.type(screen.getByTestId('task-filter-query'), 'milk');
    // Only Buy milk should remain visible in incomplete lists
    expect(screen.queryByText('Buy milk')).toBeInTheDocument();
    expect(screen.queryByText('Pay bills')).not.toBeInTheDocument();

    // Clear query and filter by priority A
    await user.clear(screen.getByTestId('task-filter-query'));
    await user.selectOptions(screen.getByTestId('task-filter-priority'), 'A');
    expect(screen.queryByText('Pay bills')).toBeInTheDocument();
    expect(screen.queryByText('Buy milk')).not.toBeInTheDocument();

    // Assignment filter to partner (still A task)
    await user.selectOptions(screen.getByTestId('task-filter-assignment'), 'partner');
    expect(screen.queryByText('Pay bills')).toBeInTheDocument();

    // Hide completed removes completed section items
    await user.click(screen.getByTestId('task-filter-hide-completed'));
    expect(screen.queryByText('Plan trip')).not.toBeInTheDocument();
  });

  it('applies filter in WeeklyCalendar day columns', async () => {
    const user = userEvent.setup();
    renderWithProviders(<WeeklyCalendar />);

    // Open filter and select priority A
  await user.click(screen.getByTestId('filter-button'));
    await user.selectOptions(screen.getByTestId('task-filter-priority'), 'A');

    // Only the A1 task should be visible in the today column
    expect(screen.queryByText('Pay bills')).toBeInTheDocument();
    expect(screen.queryByText('Buy milk')).not.toBeInTheDocument();
  });
});
