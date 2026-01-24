import React from 'react';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, act } from '@testing-library/react';
import { TaskProvider, useTask } from '../TaskContext';

// Minimal mock AuthContext to satisfy useAuth inside TaskProvider
const AuthContext = React.createContext<any>(null);
const AuthProvider: React.FC<{children: React.ReactNode}> = ({ children }) => (
  <AuthContext.Provider value={{ user: { id: 'user-1', name: 'Tester', inviteCode: 'ABC123', color: '#ff00aa' } }}>
    {children}
  </AuthContext.Provider>
);

vi.mock('../../contexts/AuthContext', () => ({
  useAuth: () => React.useContext(AuthContext)
}));

const Harness: React.FC<{ onReady: (api: ReturnType<typeof useTask>) => void }> = ({ onReady }) => {
  const api = useTask();
  React.useEffect(() => { onReady(api); }, [api, onReady]);
  return <div data-testid="selectors-harness">ready</div>;
};

describe('TaskContext memoized selectors and ordering', () => {
  let ctx: any;

  beforeEach(() => {
    ctx = null;
    localStorage.clear();
    render(
      <AuthProvider>
        <TaskProvider>
          <Harness onReady={(api) => { ctx = api; }} />
        </TaskProvider>
      </AuthProvider>
    );
    expect(screen.getByTestId('selectors-harness')).toBeInTheDocument();
  });

  it('uses monotonic order counters for the same priority', () => {
    act(() => {
      ctx.createTask({ title: 'A first', priority: 'A1', assignment: 'me', color: '#fff' });
      ctx.createTask({ title: 'A second', priority: 'A1', assignment: 'me', color: '#fff' });
      ctx.createTask({ title: 'A third', priority: 'A1', assignment: 'me', color: '#fff' });
    });
    const orders = ctx.tasks.map((t: any) => t.order);
    expect(orders).toEqual([1, 2, 3]);
  });

  it('keeps order counter after reorder operations', () => {
    act(() => {
      ctx.createTask({ title: 'A first', priority: 'A1', assignment: 'me', color: '#fff' });
      ctx.createTask({ title: 'A second', priority: 'A1', assignment: 'me', color: '#fff' });
      ctx.createTask({ title: 'A third', priority: 'A1', assignment: 'me', color: '#fff' });
    });
    const reversed = [...ctx.tasks.map((t: any) => t.id)].reverse();
    act(() => ctx.reorderTasksWithinPriority('A', reversed));
    const afterReorder = ctx.tasks.filter((t: any) => t.priority.startsWith('A')).sort((a: any, b: any) => a.order - b.order);
    expect(afterReorder.map((t: any) => t.order)).toEqual([1, 2, 3]);

    act(() => ctx.createTask({ title: 'A fourth', priority: 'A1', assignment: 'me', color: '#fff' }));
    const newest = ctx.tasks.find((t: any) => t.title === 'A fourth');
    expect(newest.order).toBe(4);
  });

  it('returns stable references for memoized selectors until tasks change', () => {
    act(() => {
      ctx.createTask({ title: 'Today', priority: 'B1', assignment: 'me', color: '#fff' });
    });
    const todayFirst = ctx.getTodaysTasks();
    const todaySecond = ctx.getTodaysTasks();
    expect(todayFirst).toBe(todaySecond);

    const sameDateFirst = ctx.getTasksByDate(todayFirst[0].scheduledDate ?? todayFirst[0].createdAt.split('T')[0]);
    const sameDateSecond = ctx.getTasksByDate(todayFirst[0].scheduledDate ?? todayFirst[0].createdAt.split('T')[0]);
    expect(sameDateFirst).toBe(sameDateSecond);

    act(() => {
      ctx.createTask({ title: 'New', priority: 'C1', assignment: 'me', color: '#fff' });
    });
    const todayAfter = ctx.getTodaysTasks();
    expect(todayAfter).not.toBe(todayFirst);
  });
});
