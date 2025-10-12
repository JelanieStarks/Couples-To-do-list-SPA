import React from 'react';
import { describe, it, expect, beforeEach } from 'vitest';
import { screen, render, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import { TodaysTasks } from '../../tasks/TodaysTasks';
import { AuthProvider, useAuth } from '../../../contexts/AuthContext';
import { TaskProvider } from '../../../contexts/TaskContext';
import { useTask } from '../../../contexts/TaskContext';

// 🧪 TodaysTasks tests: verifying daily productivity dashboard logic.

const SeedTasks: React.FC = () => {
  const { createTask, toggleTaskComplete, tasks } = useTask() as any;
  const { user } = useAuth();
  React.useEffect(() => {
    if (!user) return; // Wait until logged in so createTask doesn't bail like a lazy cat.
    const today = new Date().toISOString().split('T')[0];
    if (!tasks.some((t: any) => t.title === 'Urgent A1')) {
      createTask({ title: 'Urgent A1', priority: 'A1', assignment: 'me', color: '#fff', scheduledDate: today });
      createTask({ title: 'Urgent A2', priority: 'A2', assignment: 'me', color: '#fff', scheduledDate: today });
      createTask({ title: 'Chill C1', priority: 'C1', assignment: 'me', color: '#fff', scheduledDate: today });
      createTask({ title: 'Middle B1', priority: 'B1', assignment: 'me', color: '#fff', scheduledDate: today }); // ensure Other Tasks section appears
    }
  }, [createTask, user, tasks]);
  React.useEffect(() => {
    const target = tasks.find((t: any) => t.title === 'Chill C1');
    if (target && !target.completed) toggleTaskComplete(target.id);
  }, [tasks, toggleTaskComplete]);
  return null;
};

// Logged-in provider stack similar to other tests.
const LoggedInProviders: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <AuthProvider>
    <EnsureLogin>
      <TaskProvider>{children}</TaskProvider>
    </EnsureLogin>
  </AuthProvider>
);

const EnsureLogin: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, login } = useAuth();
  React.useEffect(() => {
    if (!user) login('Daily Tester');
  }, [user, login]);
  if (!user) return null;
  return <>{children}</>;
};

describe('TodaysTasks', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('renders empty state when no tasks', () => {
    // Render without seed component
    render(<LoggedInProviders><TodaysTasks /></LoggedInProviders>);
    expect(screen.getByText(/no tasks today/i)).toBeInTheDocument();
  });

  it('shows urgent, other, and completed sections', async () => {
    render(<LoggedInProviders><SeedTasks /><TodaysTasks /></LoggedInProviders>);
    // Specific header, disambiguate from task titles
    const urgentHeader = await screen.findByText(/^🔥 URGENT$/);
    expect(urgentHeader).toBeTruthy();
    const urgentTasks = await screen.findAllByText(/Urgent A[12]/i);
    expect(urgentTasks.length).toBeGreaterThanOrEqual(2);
    // Other Tasks & Completed headers
    expect(await screen.findByText(/other tasks/i)).toBeTruthy();
    expect(await screen.findByText(/completed/i)).toBeTruthy();
  });

  it('renders a drag handle for each urgent task', async () => {
    render(<LoggedInProviders><SeedTasks /><TodaysTasks /></LoggedInProviders>);
    // Wait for urgent list to appear
    await screen.findByText(/^🔥 URGENT$/);
    // Each A-priority task row should have a handle-only drag button
    const handles = await screen.findAllByRole('button', { name: /drag to reorder/i });
    expect(handles.length).toBeGreaterThanOrEqual(2);
  });

  it('keeps urgent task actions clickable under DnD', async () => {
    render(<LoggedInProviders><SeedTasks /><TodaysTasks /></LoggedInProviders>);
    await screen.findByText(/^🔥 URGENT$/);
    // Initial count of toggles set to "incomplete" (present for completed tasks)
    const before = screen.queryAllByLabelText(/mark task incomplete/i).length;
    // Click the action button to complete one urgent task
    const actionCompleteBtns = await screen.findAllByTitle(/complete task/i);
  // Click first action complete
  fireEvent.click(actionCompleteBtns[0]);
    // Count should increase by 1
    const after = await screen.findAllByLabelText(/mark task incomplete/i);
    expect(after.length).toBe(before + 1);
  });
});

// Wrapper removed in favor of explicit SeedTasks component
