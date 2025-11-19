import React from 'react';
import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { TaskItem } from '../../tasks/TaskItem';
import { AuthProvider } from '../../../contexts/AuthContext';
import { TaskProvider } from '../../../contexts/TaskContext';
import type { Task, User } from '../../../types';

const user: User = { id: 'u1', name: 'U', inviteCode: 'ABCDEF', color: '#ec4899', createdAt: new Date().toISOString() };

const makeTask = (priority: Task['priority']): Task => ({
  id: `t-${priority}`,
  title: `P ${priority}`,
  priority,
  assignment: 'me',
  color: '#ec4899',
  completed: false,
  createdBy: user.id,
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
});

describe('Task visibility styling', () => {
  beforeEach(() => localStorage.clear());

  it('adds data-priority and accent bar', () => {
    const task = makeTask('A1');
    render(
      <AuthProvider initialUser={user}>
        <TaskProvider initialTasks={[task]}>
          <TaskItem task={task} />
        </TaskProvider>
      </AuthProvider>
    );

    const el = screen.getByText(/p a1/i).closest('[data-task-id]') as HTMLElement;
    expect(el).toHaveAttribute('data-priority', 'A1');
  const accent = el.querySelector('.mission-glow-bar');
    expect(accent).toBeTruthy();
  });
});
