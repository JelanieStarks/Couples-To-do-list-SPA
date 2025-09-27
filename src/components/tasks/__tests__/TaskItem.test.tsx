import React from 'react';
import { describe, it, expect, beforeEach } from 'vitest';
import { screen, fireEvent, render } from '@testing-library/react';
import '@testing-library/jest-dom';
import { TaskItem } from '../../tasks/TaskItem';
import { useTask } from '../../../contexts/TaskContext';
import { AuthProvider } from '../../../contexts/AuthContext';
import { TaskProvider } from '../../../contexts/TaskContext';
import type { Task, User } from '../../../types';

// 🧪 TaskItem tests: ensuring individual tasks behave, unlike my laundry schedule.

// Deterministic user & task without async dance moves.
const testUser: User = {
  id: 'user-1',
  name: 'Task Hero',
  inviteCode: 'ABC123',
  color: '#ec4899',
  createdAt: new Date().toISOString(),
};

const testPartner: User = {
  id: 'partner-1',
  name: 'Better Half',
  inviteCode: 'XYZ789',
  color: '#3b82f6',
  createdAt: new Date().toISOString(),
};

const baseTask = (): Task => ({
  id: 'task-1',
  title: 'Original Title',
  priority: 'C1',
  assignment: 'me',
  color: '#ec4899',
  completed: false,
  createdBy: testUser.id,
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
});

// Wrapper that always pulls the freshest version of the task from context (like a parent list would in real life)
const LiveTaskItem: React.FC<{ taskId: string }> = ({ taskId }) => {
  const { tasks } = useTask() as any;
  const task = (tasks as Task[]).find(t => t.id === taskId);
  if (!task) return <div data-testid="missing-task" />; // Shouldn't happen, but life is chaos.
  return <TaskItem task={task} forceActions />;
};

const renderLiveTask = () => {
  const task = baseTask();
  return render(
    <AuthProvider initialUser={testUser} initialPartner={testPartner}>
      <TaskProvider initialTasks={[task]}>
        <LiveTaskItem taskId={task.id} />
      </TaskProvider>
    </AuthProvider>
  );
};

describe('TaskItem', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('renders title and priority badge', async () => {
  renderLiveTask();
    await screen.findByText(/original title/i);
  // Existence check because TS is being dramatic about custom matchers
  expect(!!screen.getByText('C1')).toBe(true);
  });

  it('toggles completion when checkbox clicked', async () => {
  renderLiveTask();
    await screen.findByText(/original title/i);
    // First button has aria-label toggle; simulate complete
    fireEvent.click(screen.getByLabelText(/mark task complete/i));
    // The header text should get line-through via completed but we just assert aria-label swap
    await screen.findByLabelText(/mark task incomplete/i);
    fireEvent.click(screen.getByLabelText(/mark task incomplete/i));
    await screen.findByLabelText(/mark task complete/i);
  });

  it('enters edit mode and saves changes', async () => {
  renderLiveTask();
    await screen.findByText(/original title/i);
    fireEvent.click(screen.getByTitle(/edit task/i));
    const input = await screen.findByPlaceholderText(/task title/i);
    fireEvent.change(input, { target: { value: 'Updated Awesomeness' } });
    fireEvent.click(screen.getByText(/^save$/i));
    // Wait for updated text to appear
    await screen.findByText(/updated awesomeness/i);
  });

  it('cancels edit mode without saving', async () => {
  renderLiveTask();
    await screen.findByText(/original title/i);
    fireEvent.click(screen.getByTitle(/edit task/i));
    const input = screen.getByPlaceholderText(/task title/i);
    fireEvent.change(input, { target: { value: 'I should not persist' } });
    fireEvent.click(screen.getByText(/cancel/i));
    expect(screen.queryByText(/i should not persist/i)).toBeNull();
  expect(!!screen.getByText(/original title/i)).toBe(true);
  });

  it('edits scheduled date and time and saves', async () => {
    renderLiveTask();
    await screen.findByText(/original title/i);
    fireEvent.click(screen.getByTitle(/edit task/i));
  const dateInput = await screen.findByLabelText(/date/i);
  const timeInput = await screen.findByLabelText(/time/i);
    fireEvent.change(dateInput, { target: { value: '2099-01-02' } });
    fireEvent.change(timeInput, { target: { value: '13:45' } });
    fireEvent.click(screen.getByText(/^save$/i));
    // Back to view mode; scheduled time should render
    await screen.findByText('13:45');
  });

  it('shows overdue and snoozes to tomorrow', async () => {
    // Seed with an overdue task
    const overdueTask = {
      ...baseTask(),
      id: 't-overdue',
      title: 'Overdue Item',
      scheduledDate: '2000-01-01',
    } as any;
    const { rerender } = render(
      <AuthProvider initialUser={testUser} initialPartner={testPartner}>
        <TaskProvider initialTasks={[overdueTask]}>
          <LiveTaskItem taskId={overdueTask.id} />
        </TaskProvider>
      </AuthProvider>
    );

    // Overdue badge
  await screen.findByTestId('overdue-badge');
    const snooze = screen.getByTestId('snooze-btn');
    fireEvent.click(snooze);
    // After snooze, the overdue badge should likely disappear (depending on the current date)
    // We at least assert the button is no longer present (scheduledDate moved to tomorrow)
    expect(screen.queryByTestId('snooze-btn')).toBeNull();
  });
});
