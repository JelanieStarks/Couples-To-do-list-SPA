import { useEffect, useState } from 'react';
import { STORAGE_KEYS, storage } from '../utils';
import type { Assignment, Task } from '../types';

export type PriorityGroup = 'all' | 'A' | 'B' | 'C' | 'D';

export interface TaskViewFilter {
  query: string;
  priorityGroup: PriorityGroup;
  assignment: 'any' | Assignment;
  hideCompleted: boolean;
}

const DEFAULT_FILTER: TaskViewFilter = {
  query: '',
  priorityGroup: 'all',
  assignment: 'any',
  hideCompleted: false,
};

// Module-scoped store to sync across hook instances in the same window
let currentFilter: TaskViewFilter = (() => {
  const settings = storage.get<any>(STORAGE_KEYS.SETTINGS) || {};
  return { ...DEFAULT_FILTER, ...(settings.taskFilter || {}) } as TaskViewFilter;
})();
const subscribers = new Set<(f: TaskViewFilter) => void>();

const notify = () => subscribers.forEach(cb => cb(currentFilter));

const persist = () => {
  const settings = storage.get<any>(STORAGE_KEYS.SETTINGS) || {};
  storage.set(STORAGE_KEYS.SETTINGS, { ...settings, taskFilter: currentFilter });
};

export const useTaskFilter = () => {
  const [filter, setFilterState] = useState<TaskViewFilter>(currentFilter);

  useEffect(() => {
    const cb = (f: TaskViewFilter) => setFilterState(f);
    subscribers.add(cb);
    return () => { subscribers.delete(cb); };
  }, []);

  const setFilter = (next: Partial<TaskViewFilter> | ((prev: TaskViewFilter) => Partial<TaskViewFilter>)) => {
    const patch = typeof next === 'function' ? (next as any)(currentFilter) : next;
    currentFilter = { ...currentFilter, ...patch } as TaskViewFilter;
    persist();
    notify();
  };

  return { filter, setFilter } as const;
};

// Utility to apply filter to a list of tasks
export const applyTaskFilter = <T extends Task>(tasks: T[], filter: TaskViewFilter): T[] => {
  const q = filter.query.trim().toLowerCase();
  return tasks.filter(t => {
    if (filter.hideCompleted && t.completed) return false;
    if (filter.priorityGroup !== 'all' && !t.priority.startsWith(filter.priorityGroup)) return false;
    if (filter.assignment !== 'any' && t.assignment !== filter.assignment) return false;
    if (q) {
      const hay = `${t.title} ${t.description || ''}`.toLowerCase();
      if (!hay.includes(q)) return false;
    }
    return true;
  });
};
