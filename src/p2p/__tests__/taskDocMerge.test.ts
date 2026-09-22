import { afterEach, describe, expect, it } from 'vitest';
import { TaskDoc } from '../taskDoc';
import type { Task } from '../../types';

const task = (id: string, updatedAt: string, title: string): Task => ({
  id,
  title,
  priority: 'C1',
  assignment: 'both',
  color: '#000000',
  completed: false,
  createdBy: 'user-1',
  createdAt: updatedAt,
  updatedAt,
});

describe('TaskDoc external merge', () => {
  afterEach(() => localStorage.clear());

  it('preserves local tasks while applying newer remote tasks', () => {
    const doc = new TaskDoc({ initialTasks: [task('local', '2026-09-20T10:00:00.000Z', 'Local task')] });

    doc.mergeExternal([
      task('remote', '2026-09-20T10:01:00.000Z', 'Partner task'),
      task('local', '2026-09-20T09:00:00.000Z', 'Stale local copy'),
    ]);

    expect(doc.getTasks().map(item => item.id)).toEqual(['local', 'remote']);
    expect(doc.getTasks().find(item => item.id === 'local')?.title).toBe('Local task');
    doc.destroy();
  });

  it('lets a newer tombstone beat an older live task', () => {
    const doc = new TaskDoc({ initialTasks: [task('shared', '2026-09-20T10:00:00.000Z', 'Keep me')] });
    doc.mergeExternal([{ ...task('shared', '2026-09-20T11:00:00.000Z', 'Keep me'), deletedAt: '2026-09-20T11:00:00.000Z' }]);
    expect(doc.getTasks()[0].deletedAt).toBe('2026-09-20T11:00:00.000Z');
    doc.destroy();
  });

  it('keeps local data when timestamps are equal', () => {
    const timestamp = '2026-09-20T10:00:00.000Z';
    const doc = new TaskDoc({ initialTasks: [task('shared', timestamp, 'Local copy')] });
    doc.mergeExternal([task('shared', timestamp, 'Remote copy')]);
    expect(doc.getTasks()[0].title).toBe('Local copy');
    doc.destroy();
  });

  it('normalizes legacy tasks without updatedAt', () => {
    const legacy = { ...task('legacy', '2026-09-19T10:00:00.000Z', 'Legacy task'), updatedAt: undefined };
    const doc = new TaskDoc({ initialTasks: [legacy] });
    expect(doc.getTasks()[0].updatedAt).toBe(legacy.createdAt);
    expect(doc.getTasks()[0].urgency).toBe('medium');
    doc.destroy();
  });
});