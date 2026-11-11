import React from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { TaskProvider, useTask } from '../TaskContext';
import type { Task } from '../../types';
import { registerDraftFlusher } from '../../utils/draftPersistence';

const cloud = vi.hoisted(() => ({ context: null as any, tasks: [] as Task[], fail: false, calls: 0, receivers: new Set<(tasks: Task[]) => void>() }));
vi.mock('../AuthContext', async () => {
  const React = await import('react');
  cloud.context = React.createContext(null);
  return { useAuth: () => React.useContext(cloud.context) };
});
vi.mock('../../utils/supabaseClient', () => ({ getSupabaseClient: () => ({}), isSupabaseSyncEnabled: () => true }));
vi.mock('../../sync/supabaseSync', () => ({ SupabaseSync: class {
  async fetchTasks() { return structuredClone(cloud.tasks); }
  async mergeAndUpload(local: Task[]) {
    cloud.calls++;
    if (cloud.fail) throw new Error('Network interrupted');
    const merged = new Map([...cloud.tasks, ...local].map(task => [task.id, task]));
    cloud.tasks = [...merged.values()];
    return structuredClone(cloud.tasks);
  }
  subscribe(receiver: (tasks: Task[]) => void) { cloud.receivers.add(receiver); return () => cloud.receivers.delete(receiver); }
} }));

const task = (id: string): Task => ({ id, title: id, createdBy: 'partner', createdAt: '2026-11-10T10:00:00Z', updatedAt: '2026-11-10T10:00:00Z', priority: 'B2', assignment: 'both', color: '#abc', completed: false });
const Probe = () => {
  const { tasks, createTask, syncNow, saveAndSync, supabaseStatus } = useTask();
  const [receipt, setReceipt] = React.useState('');
  return <>
    <output data-testid="tasks">{tasks.map(task => task.title).sort().join(',')}</output>
    <output data-testid="receipt">{receipt}</output>
    <output data-testid="error">{supabaseStatus.lastError}</output>
    <button onClick={() => createTask({ title: 'new local', priority: 'B2', assignment: 'both', color: '#abc', completed: false })}>Create local</button>
    <button onClick={() => void syncNow()}>Sync</button>
    <button onClick={async () => setReceipt((await saveAndSync()).message)}>Save all</button>
  </>;
};
const renderCloud = (initial: Task[]) => render(
  <cloud.context.Provider value={{ user: { id: 'user', householdId: 'household' }, partner: { id: 'partner' }, requestMagicLinkForSync: async () => false }}>
    <TaskProvider initialTasks={initial}><Probe /></TaskProvider>
  </cloud.context.Provider>,
);

describe('cloud reconciliation in TaskProvider', () => {
  beforeEach(() => { localStorage.clear(); cloud.tasks = []; cloud.fail = false; cloud.calls = 0; cloud.receivers.clear(); vi.stubGlobal('BroadcastChannel', undefined); });
  afterEach(() => vi.unstubAllGlobals());
  it('uploads offline-only tasks at startup while receiving partner tasks', async () => {
    cloud.tasks = [task('partner task')];
    renderCloud([task('offline task')]);
    await waitFor(() => expect(cloud.tasks.map(task => task.title).sort()).toEqual(['offline task', 'partner task']));
    expect(screen.getByTestId('tasks')).toHaveTextContent('offline task,partner task');
  });
  it('receives partner data after an upload failure and retries pending local edits on reconnect', async () => {
    cloud.tasks = [task('partner task')]; cloud.fail = true;
    renderCloud([task('offline task')]);
    await waitFor(() => expect(screen.getByTestId('error')).toHaveTextContent('Network interrupted'));
    expect(screen.getByTestId('tasks')).toHaveTextContent('partner task');
    cloud.fail = false;
    await act(async () => { window.dispatchEvent(new Event('online')); });
    await waitFor(() => expect(cloud.tasks).toHaveLength(2));
    await waitFor(() => expect(screen.getByTestId('error')).toBeEmptyDOMElement());
    fireEvent.click(screen.getByText('Create local'));
    await waitFor(() => expect(cloud.tasks.some(task => task.title === 'new local')).toBe(true));
  });
  it('flushes drafts, retains a device backup on failure, and reports only confirmed cloud saves', async () => {
    cloud.tasks = [task('partner task')]; cloud.fail = true;
    const flush = vi.fn(); const unregister = registerDraftFlusher(flush);
    renderCloud([task('offline task')]);
    await waitFor(() => expect(screen.getByTestId('error')).toHaveTextContent('Network interrupted'));
    fireEvent.click(screen.getByText('Save all'));
    await waitFor(() => expect(screen.getByTestId('receipt')).toHaveTextContent('Network interrupted'));
    expect(flush).toHaveBeenCalled();
    const key = Object.keys(localStorage).find(key => key.includes('-backup:household:user') && !key.endsWith(':previous'))!;
    expect(JSON.parse(localStorage.getItem(key)!).tasks.map((item: Task) => item.id)).toContain('offline task');
    cloud.fail = false;
    fireEvent.click(screen.getByText('Save all'));
    await waitFor(() => expect(screen.getByTestId('receipt')).toHaveTextContent('Saved to database'));
    expect(cloud.tasks).toHaveLength(2);
    unregister();
  });

});
