import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import React from 'react';
import { screen, act } from '@testing-library/react';
import { TaskProvider, useTask } from '../TaskContext';
import { STORAGE_KEYS } from '../../utils';
import { renderWithProviders } from '../../test-utils/renderWithProviders';

// Helper component to access context API
const Probe: React.FC = () => {
  const { tasks, createTask, syncNow } = useTask();
  return (
    <div>
      <div data-testid="count">{tasks.length}</div>
      <button data-testid="mk" onClick={() => createTask({
        title: 'X', description: undefined, priority: 'C1', assignment: 'both', color: '#000'
      })}>mk</button>
      <button data-testid="sync" onClick={() => syncNow()}>sync</button>
    </div>
  );
};

// BroadcastChannel polyfill/mock
class MockBC {
  onmessage: ((ev: MessageEvent) => void) | null = null;
  constructor(public name: string) {}
  // Define as prototype methods for spyOn compatibility
  postMessage(_msg: any) {}
  close() {}
}

const getTasks = () => JSON.parse(localStorage.getItem(STORAGE_KEYS.TASKS) || '[]');
const setTasks = (val: any) => localStorage.setItem(STORAGE_KEYS.TASKS, JSON.stringify(val));

describe('Task sync between tabs', () => {
  const origBC = (global as any).BroadcastChannel;

  beforeEach(() => {
    localStorage.clear();
    (global as any).BroadcastChannel = MockBC as any;
  });

  afterEach(() => {
    (global as any).BroadcastChannel = origBC;
    localStorage.clear();
  });

  it('applies updates from storage event (partner tab change)', () => {
  renderWithProviders(<Probe />);
    // Seed external change
    const external = [{ id: 't1', title: 'From partner', priority: 'C1', assignment: 'both', color: '#000', completed: false, createdBy: 'p', createdAt: '2024-01-01', updatedAt: '2024-01-01' }];
    setTasks(external);

    // Dispatch storage event
    act(() => {
      window.dispatchEvent(new StorageEvent('storage', { key: STORAGE_KEYS.TASKS, newValue: JSON.stringify(external) }));
    });

    expect(screen.getByTestId('count').textContent).toBe('1');
  });

  it('manual syncNow pulls latest from storage', () => {
  renderWithProviders(<Probe />);

    const external = [{ id: 't2', title: 'Extern', priority: 'C1', assignment: 'both', color: '#000', completed: false, createdBy: 'p', createdAt: '2024-01-01', updatedAt: '2024-01-01' }];
    setTasks(external);

    // Before sync
    expect(screen.getByTestId('count').textContent).toBe('0');

    // Trigger manual sync
    act(() => {
      screen.getByTestId('sync').dispatchEvent(new MouseEvent('click', { bubbles: true }));
    });

    expect(screen.getByTestId('count').textContent).toBe('1');
  });

  it('broadcasts changes when tasks update', () => {
    const spy = vi.spyOn(MockBC.prototype as any, 'postMessage').mockImplementation(() => {});
    renderWithProviders(<Probe />);
    act(() => {
      screen.getByTestId('mk').dispatchEvent(new MouseEvent('click', { bubbles: true }));
    });
    expect(spy).toHaveBeenCalled();
    spy.mockRestore();
  });
});
