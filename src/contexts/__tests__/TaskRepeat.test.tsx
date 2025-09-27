import React from 'react';
import { describe, it, expect, beforeEach } from 'vitest';
import { render, waitFor } from '@testing-library/react';
import { TaskProvider, useTask } from '../../contexts/TaskContext';
import { AuthProvider } from '../../contexts/AuthContext';
import type { Task, User } from '../../types';

const user: User = { id: 'u1', name: 'U', inviteCode: 'ABCDEF', color: '#ec4899', createdAt: new Date().toISOString() };

// No seeding effect; we'll use initialTasks to avoid race conditions with provider boot.

const Probe: React.FC<{ dateStr: string }> = ({ dateStr }) => {
  const { getTasksByDate } = useTask();
  const tasks = getTasksByDate(dateStr) as Task[];
  return <div data-testid={`count-${dateStr}`}>{tasks.length}</div>;
};

describe('Task repeating (daily)', () => {
  beforeEach(() => localStorage.clear());

  it('includes daily repeat on today and future days', async () => {
    const today = new Date();
    const todayStr = today.toISOString().split('T')[0];
    const tomorrow = new Date(today); tomorrow.setDate(today.getDate() + 1);
    const tomorrowStr = tomorrow.toISOString().split('T')[0];

    const start = new Date();
    const todayLocal = new Date(start.getFullYear(), start.getMonth(), start.getDate());
    const pad = (n: number) => String(n).padStart(2, '0');
    const todayStrLocal = `${todayLocal.getFullYear()}-${pad(todayLocal.getMonth()+1)}-${pad(todayLocal.getDate())}`;

    const repeatingTask: Task = {
      id: 'r1',
      title: 'Repeat Daily',
      priority: 'C1',
      assignment: 'me',
      color: '#ec4899',
      completed: false,
      createdBy: user.id,
      scheduledDate: todayStrLocal,
      repeat: 'daily',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    const { findByTestId } = render(
      <AuthProvider initialUser={user}>
        <TaskProvider initialTasks={[repeatingTask]}>
          <Probe dateStr={todayStr} />
          <Probe dateStr={tomorrowStr} />
        </TaskProvider>
      </AuthProvider>
    );

    const todayEl = await findByTestId(`count-${todayStr}`);
    const tomorrowEl = await findByTestId(`count-${tomorrowStr}`);
    await waitFor(() => expect(todayEl).toHaveTextContent('1'));
    await waitFor(() => expect(tomorrowEl).toHaveTextContent('1'));
  });
});
