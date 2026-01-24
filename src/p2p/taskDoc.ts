// TaskDoc keeps a Yjs document in sync with local state and storage
import * as Y from 'yjs';
import type { Task } from '../types';
import { storage, STORAGE_KEYS } from '../utils';

const TASKS_MAP_KEY = 'tasks';
const ORDER_COUNTERS_KEY = 'orderCounters';
const META_MAP_KEY = 'meta';
const DOC_STORAGE_KEY = STORAGE_KEYS.TASKS_YDOC;

export const TASK_DOC_LOCAL_ORIGIN = 'task-doc-local';
export const TASK_DOC_REMOTE_ORIGIN = 'task-doc-remote';

type TaskListener = (tasks: Task[]) => void;

const cloneTask = (task: Task): Task => {
  if (typeof structuredClone === 'function') {
    return structuredClone(task);
  }
  return JSON.parse(JSON.stringify(task)) as Task;
};

const serializeSnapshot = (update: Uint8Array): number[] => Array.from(update);
const deserializeSnapshot = (raw: unknown): Uint8Array | null => {
  if (!Array.isArray(raw)) return null;
  try {
    return Uint8Array.from(raw as number[]);
  } catch {
    return null;
  }
};

export class TaskDoc {
  private doc: Y.Doc;
  private tasksMap: Y.Map<Task>;
  private orderCounters: Y.Map<number>;
  private metaMap: Y.Map<number>;
  private listeners = new Set<TaskListener>();
  private isHydrated = false;

  constructor(options: { guid?: string; initialTasks?: Task[] } = {}) {
    this.doc = new Y.Doc(options.guid ? { guid: options.guid } : undefined);
    this.tasksMap = this.doc.getMap<Task>(TASKS_MAP_KEY);
    this.orderCounters = this.doc.getMap<number>(ORDER_COUNTERS_KEY);
    this.metaMap = this.doc.getMap<number>(META_MAP_KEY);

    this.hydrateFromDisk();

    // If the doc had no counter metadata (older snapshots), rebuild from current tasks.
    if ((this.orderCounters.size ?? 0) === 0 && this.tasksMap.size > 0) {
      this.rebuildOrderCountersFromTasks();
    }
    if (!this.metaMap.has('version')) {
      this.metaMap.set('version', 0);
    }

    this.tasksMap.observe(() => {
      this.emit();
    });

    this.doc.on('update', () => {
      this.persistSnapshot();
    });

    if (!this.isHydrated && options.initialTasks?.length) {
      this.replaceAll(options.initialTasks);
    } else {
      this.emit();
    }
  }

  getDoc(): Y.Doc {
    return this.doc;
  }

  getTasks(): Task[] {
    const items: Task[] = [];
    this.tasksMap.forEach(value => {
      items.push(cloneTask(value));
    });
    return items.sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
  }

  subscribe(listener: TaskListener, emitImmediately = true): () => void {
    this.listeners.add(listener);
    if (emitImmediately) {
      listener(this.getTasks());
    }
    return () => {
      this.listeners.delete(listener);
    };
  }

  upsert(task: Task): void {
    this.doc.transact(() => {
      this.tasksMap.set(task.id, cloneTask(task));
      this.isHydrated = true;
      this.bumpVersion();
      this.syncOrderCounter(task.priority, task.order ?? null);
    }, TASK_DOC_LOCAL_ORIGIN);
  }

  update(id: string, apply: (current: Task | undefined) => Task | null | undefined): void {
    this.doc.transact(() => {
      const current = this.tasksMap.get(id);
      const next = apply(current ? cloneTask(current) : undefined);
      if (!next) {
        this.tasksMap.delete(id);
        return;
      }
      this.tasksMap.set(id, cloneTask(next));
      this.isHydrated = true;
      this.bumpVersion();
      this.syncOrderCounter(next.priority, next.order ?? null);
    }, TASK_DOC_LOCAL_ORIGIN);
  }

  delete(id: string): void {
    this.doc.transact(() => {
      this.tasksMap.delete(id);
      this.bumpVersion();
    }, TASK_DOC_LOCAL_ORIGIN);
  }

  replaceAll(tasks: Task[]): void {
    this.doc.transact(() => {
      const idsToRemove: string[] = [];
      this.tasksMap.forEach((_, key) => {
        idsToRemove.push(key);
      });
      idsToRemove.forEach(key => {
        this.tasksMap.delete(key);
      });
      tasks.forEach(task => {
        this.tasksMap.set(task.id, cloneTask(task));
      });
      this.isHydrated = true;
      this.bumpVersion();
      this.rebuildOrderCountersFromTasks();
    }, TASK_DOC_LOCAL_ORIGIN);
  }

  replaceAllFromExternal(tasks: Task[]): void {
    this.doc.transact(() => {
      const idsToRemove: string[] = [];
      this.tasksMap.forEach((_, key) => {
        idsToRemove.push(key);
      });
      idsToRemove.forEach(key => {
        this.tasksMap.delete(key);
      });
      tasks.forEach(task => {
        this.tasksMap.set(task.id, cloneTask(task));
      });
      this.isHydrated = true;
      this.bumpVersion();
      this.rebuildOrderCountersFromTasks();
    }, TASK_DOC_REMOTE_ORIGIN);
  }

  applyRemoteUpdate(update: Uint8Array): void {
    Y.applyUpdate(this.doc, update, TASK_DOC_REMOTE_ORIGIN);
  }

  runLocalTransaction(callback: (map: Y.Map<Task>) => void): void {
    this.doc.transact(() => {
      callback(this.tasksMap);
      this.isHydrated = true;
      this.bumpVersion();
      this.rebuildOrderCountersFromTasks();
    }, TASK_DOC_LOCAL_ORIGIN);
  }

  runRemoteTransaction(callback: (map: Y.Map<Task>) => void): void {
    this.doc.transact(() => {
      callback(this.tasksMap);
      this.isHydrated = true;
      this.bumpVersion();
      this.rebuildOrderCountersFromTasks();
    }, TASK_DOC_REMOTE_ORIGIN);
  }

  destroy(): void {
    this.listeners.clear();
    this.doc.destroy();
  }

  private emit(): void {
    const tasks = this.getTasks();
    this.listeners.forEach(listener => listener(tasks));
  }

  // Version helpers allow external sync layers to avoid expensive deep comparisons.
  getVersion(): number {
    return this.metaMap.get('version') ?? 0;
  }

  private bumpVersion(): void {
    const current = this.metaMap.get('version') ?? 0;
    this.metaMap.set('version', current + 1);
  }

  // Order counter helpers keep inserts O(1) per priority bucket.
  getNextOrderForPriority(priority: Task['priority']): number {
    const current = this.orderCounters.get(priority) ?? 0;
    const next = current + 1;
    this.orderCounters.set(priority, next);
    return next;
  }

  syncOrderCounter(priority: Task['priority'], candidate: number | null): void {
    if (!candidate || Number.isNaN(candidate)) return;
    const current = this.orderCounters.get(priority) ?? 0;
    if (candidate > current) {
      this.orderCounters.set(priority, candidate);
    }
  }

  private rebuildOrderCountersFromTasks(): void {
    const maxByPriority: Record<string, number> = {};
    this.tasksMap.forEach(task => {
      if (!task) return;
      const order = task.order ?? 0;
      const current = maxByPriority[task.priority] ?? 0;
      if (order > current) {
        maxByPriority[task.priority] = order;
      }
    });
    Object.entries(maxByPriority).forEach(([priority, max]) => {
      this.orderCounters.set(priority, max);
    });
  }

  private hydrateFromDisk(): void {
    try {
      const raw = storage.get<number[]>(DOC_STORAGE_KEY);
      const update = deserializeSnapshot(raw);
      if (update) {
        Y.applyUpdate(this.doc, update);
        this.isHydrated = this.tasksMap.size > 0;
      }
    } catch (error) {
      console.warn('[TaskDoc] Failed to hydrate doc from storage', error);
    }
  }

  private persistSnapshot(): void {
    try {
      const snapshot = Y.encodeStateAsUpdate(this.doc);
      storage.set(DOC_STORAGE_KEY, serializeSnapshot(snapshot));
    } catch (error) {
      console.error('[TaskDoc] Failed to persist doc snapshot', error);
    }
  }
}
