import React from 'react';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, act } from '@testing-library/react';
import { TaskProvider, useTask } from '../TaskContext';

// Minimal mock AuthContext to satisfy useAuth inside TaskProvider
const AuthContext = React.createContext<any>(null);
let requestMagicLinkForSyncMock: ReturnType<typeof vi.fn>;
const AuthProvider: React.FC<{children: React.ReactNode}> = ({ children }) => {
  return (
    <AuthContext.Provider value={{
      user: { id: 'user-1', name: 'Tester', inviteCode: 'ABC123', color: '#ff00aa' },
      requestMagicLinkForSync: requestMagicLinkForSyncMock,
    }}>
      {children}
    </AuthContext.Provider>
  );
};

// Patch useAuth that TaskContext expects (simplest local shim) - we re-export original hook name
vi.mock('../../contexts/AuthContext', () => ({
  useAuth: () => React.useContext(AuthContext)
}));

// Helper component to access context in tests
const Harness: React.FC<{ onReady: (api: ReturnType<typeof useTask>) => void }> = ({ onReady }) => {
  const api = useTask();
  React.useEffect(() => { onReady(api); }, [api, onReady]);
  return <div data-testid="harness">ready</div>;
};

describe('TaskContext core behaviors', () => {
  let ctx: any;
  beforeEach(() => {
    ctx = null;
    requestMagicLinkForSyncMock = vi.fn().mockResolvedValue(false);
    // Clear localStorage to isolate tests
    localStorage.clear();
    render(
      <AuthProvider>
        <TaskProvider>
          <Harness onReady={(api) => { ctx = api; }} />
        </TaskProvider>
      </AuthProvider>
    );
    expect(screen.getByTestId('harness')).toBeInTheDocument();
  });

  it('creates a task', () => {
    act(() => {
      ctx.createTask({
        title: 'Test Task',
        description: 'Desc',
        priority: 'A1',
        assignment: 'me',
        color: '#fff'
      });
    });
    expect(ctx.tasks.length).toBe(1);
    expect(ctx.tasks[0].title).toBe('Test Task');
    expect(ctx.tasks[0].completed).toBeFalsy();
    expect(ctx.tasks[0].updatedAt).toBeTruthy();
    expect(ctx.tasks[0].urgency).toBe('urgent');
  });

  it('toggles completion and sets completedAt', () => {
    act(() => {
      ctx.createTask({ title: 'Toggle', priority: 'B1', assignment: 'me', color: '#fff' });
    });
    const id = ctx.tasks[0].id;
    act(() => ctx.toggleTaskComplete(id));
    expect(ctx.tasks[0].completed).toBe(true);
    expect(ctx.tasks[0].completedAt).toBeTruthy();
    const firstCompletedAt = ctx.tasks[0].completedAt;
    act(() => ctx.toggleTaskComplete(id));
    expect(ctx.tasks[0].completed).toBe(false);
    expect(ctx.tasks[0].completedAt).toBeUndefined();
    // Ensure timestamp was cleared, not just falsy
    expect(firstCompletedAt).toBeTruthy();
  });

  it('soft deletes and excludes from getters but can restore', () => {
    act(() => {
      ctx.createTask({ title: 'Will Delete', priority: 'C1', assignment: 'me', color: '#fff' });
    });
    const id = ctx.tasks[0].id;
    act(() => ctx.softDeleteTask(id));
    expect(ctx.tasks[0].deletedAt).toBeTruthy();
    // getTodaysTasks should exclude deleted
    expect(ctx.getTodaysTasks().length).toBe(0);
    // restore
    act(() => ctx.restoreTask(id));
    expect(ctx.tasks[0].deletedAt).toBeUndefined();
    expect(ctx.getTodaysTasks().length).toBe(1);
  });

  it('retains a deletion tombstone instead of removing the task immediately', () => {
    act(() => {
      ctx.createTask({ title: 'Hard Delete', priority: 'D', assignment: 'me', color: '#fff' });
    });
    const id = ctx.tasks[0].id;
    act(() => ctx.hardDeleteTask(id));
    expect(ctx.tasks.find(t => t.id === id)?.deletedAt).toBeTruthy();
    expect(ctx.getTodaysTasks().find(t => t.id === id)).toBeUndefined();
  });

  it('copies a historical task with a new id and date', () => {
    act(() => {
      ctx.createTask({ title: 'Yesterday', priority: 'D', assignment: 'me', color: '#fff', scheduledDate: '2026-09-21' });
    });
    const original = ctx.tasks[0];
    let copiedId: string | null = null;
    act(() => { copiedId = ctx.copyTaskToDate(original.id, '2026-09-22'); });
    const copied = ctx.tasks.find(t => t.id === copiedId);
    expect(copied).toMatchObject({ title: 'Yesterday', scheduledDate: '2026-09-22', completed: false });
    expect(copied?.id).not.toBe(original.id);
    expect(ctx.tasks.find(t => t.id === original.id)?.scheduledDate).toBe('2026-09-21');
  });

  it('moves a task without changing its stable id', () => {
    act(() => {
      ctx.createTask({ title: 'Move me', priority: 'B1', assignment: 'me', color: '#fff', scheduledDate: '2026-09-21' });
    });
    const original = ctx.tasks[0];
    act(() => ctx.moveTaskToDate(original.id, '2026-09-22'));
    expect(ctx.tasks[0].id).toBe(original.id);
    expect(ctx.tasks[0].scheduledDate).toBe('2026-09-22');
    expect(ctx.tasks[0].updatedAt).not.toBe(original.updatedAt);
  });

  it('keeps custom color separate from urgency when priority changes', () => {
    act(() => {
      ctx.createTask({ title: 'Pink urgent task', priority: 'A1', assignment: 'me', color: '#ec4899', customColor: '#ec4899' });
    });
    const id = ctx.tasks[0].id;
    act(() => ctx.updateTask(id, { priority: 'A2' }));
    expect(ctx.tasks[0].customColor).toBe('#ec4899');
    expect(ctx.tasks[0].color).toBe('#ec4899');
    expect(ctx.tasks[0].urgency).toBe('urgent');
  });

  it('completed tasks list returns newest first', () => {
    act(() => {
      ctx.createTask({ title: 'T1', priority: 'A1', assignment: 'me', color: '#fff' });
      ctx.createTask({ title: 'T2', priority: 'A2', assignment: 'me', color: '#fff' });
    });
    const id1 = ctx.tasks[0].id;
    const id2 = ctx.tasks[1].id;
    act(() => ctx.toggleTaskComplete(id1));
    // Small delay simulation for ordering (not using timers to keep test simple)
    act(() => ctx.toggleTaskComplete(id2));
    const completed = ctx.getCompletedTasks();
    expect(completed[0].id).toBe(id2);
  });

  it('syncNow triggers magic link refresh attempt', async () => {
    await act(async () => {
      await ctx.syncNow();
    });
    expect(requestMagicLinkForSyncMock).toHaveBeenCalled();
  });
});
