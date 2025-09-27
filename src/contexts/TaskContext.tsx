import React, { createContext, useContext, useEffect, useState } from 'react';
import type { Task, Priority, TaskFilter, Assignment } from '../types';
import { storage, STORAGE_KEYS, generateId, isSameLocalDay, parseLocalDate, toLocalDateString } from '../utils';
import { useAuth } from './AuthContext';

// 📝 Task Context - Your digital task manager with a sense of humor
interface TaskContextType {
  tasks: Task[];
  isLoading: boolean;
  createTask: (task: Omit<Task, 'id' | 'createdAt' | 'updatedAt' | 'createdBy' | 'completedAt' | 'deletedAt'>) => void;
  updateTask: (id: string, updates: Partial<Task>) => void;
  toggleTaskComplete: (id: string) => void;
  softDeleteTask: (id: string) => void;
  restoreTask: (id: string) => void;
  hardDeleteTask: (id: string) => void;
  filterTasks: (filter: TaskFilter) => Task[];
  getTasksByDate: (date: string) => Task[];
  getTodaysTasks: () => Task[];
  getCompletedTasks: () => Task[];
  getDeletedTasks: () => Task[];
  importTasksFromText: (text: string) => Task[];
  moveTaskToDate: (taskId: string, date: string) => void;
  reorderTasksWithinPriority: (priorityPrefix: string, orderedIds: string[]) => void;
  syncNow: () => void;
}

const TaskContext = createContext<TaskContextType | undefined>(undefined);

export const useTask = () => {
  const context = useContext(TaskContext);
  if (context === undefined) {
    throw new Error('useTask must be used within a TaskProvider');
  }
  return context;
};

// Added optional initialTasks for deterministic tests (prevents flaky async seeding in tests)
export const TaskProvider: React.FC<{ children: React.ReactNode; initialTasks?: Task[] }> = ({ children, initialTasks }) => {
  const { user } = useAuth();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  // Unique instance id to avoid processing our own broadcasts
  const [instanceId] = useState(() => `taskctx-${Math.random().toString(36).slice(2)}`);
  const bcRef = React.useRef<BroadcastChannel | null>(null);

  // Load tasks on app start - Jarvis never forgets your to-dos
  useEffect(() => {
    if (initialTasks) {
      setTasks(initialTasks);
      setIsLoading(false);
      return;
    }
    const savedTasks = storage.get<Task[]>(STORAGE_KEYS.TASKS) || [];
    setTasks(savedTasks);
    setIsLoading(false);
  }, [initialTasks]);

  // Save tasks to localStorage whenever tasks change
  useEffect(() => {
    if (!isLoading) {
      storage.set(STORAGE_KEYS.TASKS, tasks);
      // Broadcast change to other tabs/windows
      try {
        if (!bcRef.current && typeof BroadcastChannel !== 'undefined') {
          bcRef.current = new BroadcastChannel('tasks-sync');
        }
        bcRef.current?.postMessage({
          type: 'tasks-updated',
          sourceId: instanceId,
          updatedAt: Date.now(),
          tasks,
        });
      } catch {}
    }
  }, [tasks, isLoading]);

  // Handle external changes via BroadcastChannel and storage events
  useEffect(() => {
    // BroadcastChannel listener
    let bc: BroadcastChannel | null = null;
    if (typeof BroadcastChannel !== 'undefined') {
      try {
        bc = new BroadcastChannel('tasks-sync');
        bc.onmessage = (ev: MessageEvent) => {
          const data = ev.data as { type?: string; sourceId?: string; tasks?: Task[] };
          if (!data || data.type !== 'tasks-updated') return;
          if (data.sourceId === instanceId) return; // ignore our own
          if (Array.isArray(data.tasks)) {
            // Only update if content differs
            const current = JSON.stringify(tasks);
            const incoming = JSON.stringify(data.tasks);
            if (current !== incoming) {
              setTasks(data.tasks);
            }
          }
        };
      } catch {}
    }

    // storage event (fires in other tabs)
    const onStorage = (e: StorageEvent) => {
      if (e.key !== STORAGE_KEYS.TASKS) return;
      try {
        const next = e.newValue ? (JSON.parse(e.newValue) as Task[]) : [];
        const current = JSON.stringify(tasks);
        const incoming = JSON.stringify(next);
        if (current !== incoming) setTasks(next);
      } catch {}
    };
    window.addEventListener('storage', onStorage);

    return () => {
      window.removeEventListener('storage', onStorage);
      if (bc) {
        try { bc.close(); } catch {}
      }
    };
  }, [instanceId, tasks]);

  const syncNow = () => {
    // Pull latest from storage and update if different
    const savedTasks = storage.get<Task[]>(STORAGE_KEYS.TASKS) || [];
    const current = JSON.stringify(tasks);
    const incoming = JSON.stringify(savedTasks);
    if (current !== incoming) setTasks(savedTasks);
  };

  const createTask = (taskData: Omit<Task, 'id' | 'createdAt' | 'updatedAt' | 'createdBy' | 'completedAt' | 'deletedAt'>): void => {
    if (!user) return;

    const now = new Date().toISOString();
    // Determine next order within this priority group
    const samePriority = tasks.filter(t => t.priority === taskData.priority && !t.deletedAt);
    const nextOrder = samePriority.length > 0 ? Math.max(...samePriority.map(t => t.order || 0)) + 1 : 1;
    const newTask: Task = {
      ...taskData,
      id: generateId(),
      createdBy: user.id,
      createdAt: now,
      updatedAt: now,
      order: nextOrder,
    };

    setTasks(prev => [...prev, newTask]);
  };
  // Reorder tasks inside a priority bucket (e.g., all A* priorities) based on new ordered id list
  const reorderTasksWithinPriority = (priorityPrefix: string, orderedIds: string[]) => {
    setTasks(prev => {
      const updated = [...prev];
      // Assign new order sequentially (1..n) in given order
      orderedIds.forEach((id, index) => {
        const idx = updated.findIndex(t => t.id === id);
        if (idx !== -1) {
          updated[idx] = { ...updated[idx], order: index + 1, updatedAt: new Date().toISOString() };
        }
      });
      return updated;
    });
  };

  const updateTask = (id: string, updates: Partial<Task>): void => {
    setTasks(prev =>
      prev.map(task =>
        task.id === id
          ? { ...task, ...updates, updatedAt: new Date().toISOString() }
          : task
      )
    );
  };

  const softDeleteTask = (id: string): void => {
    setTasks(prev => prev.map(task => task.id === id ? { ...task, deletedAt: new Date().toISOString() } : task));
  };

  const restoreTask = (id: string): void => {
    setTasks(prev => prev.map(task => task.id === id ? { ...task, deletedAt: undefined } : task));
  };

  const hardDeleteTask = (id: string): void => {
    setTasks(prev => prev.filter(task => task.id !== id));
  };

  const toggleTaskComplete = (id: string): void => {
    setTasks(prev => prev.map(task => {
      if (task.id !== id) return task;
      const completed = !task.completed;
      return {
        ...task,
        completed,
        completedAt: completed ? new Date().toISOString() : undefined,
        updatedAt: new Date().toISOString(),
      };
    }));
  };

  const filterTasks = (filter: TaskFilter): Task[] => {
    return tasks.filter(task => {
      if (task.deletedAt) return false;
      if (filter.priority && task.priority !== filter.priority) return false;
      if (filter.completed !== undefined && task.completed !== filter.completed) return false;
      if (filter.createdBy && task.createdBy !== filter.createdBy) return false;

      if (filter.dateRange) {
        const taskDate = task.scheduledDate || task.createdAt;
        if (taskDate < filter.dateRange.start || taskDate > filter.dateRange.end) return false;
      }

      return true;
    });
  };

  const getTasksByDate = (date: string): Task[] => {
    // date is expected as YYYY-MM-DD
    const target = parseLocalDate(date);
    return tasks.filter(task => {
      if (task.deletedAt) return false;
      // Establish the start date for the task (local day)
      const startDateStr = task.scheduledDate
        ? task.scheduledDate
        : toLocalDateString(new Date(task.createdAt));
      const start = parseLocalDate(startDateStr);

      // If repeating daily, include the task on any day >= start date
      if (task.repeat === 'daily') {
        return toLocalDateString(target) >= toLocalDateString(start);
      }

      // Otherwise, only include if same local day
      return isSameLocalDay(start, target);
    });
  };

  const getTodaysTasks = (): Task[] => {
    const today = new Date();
    return tasks
      .filter(task => {
        if (task.deletedAt) return false;
        // Repeating tasks appear today if today >= start date
        if (task.repeat === 'daily') {
          const startDateStr = task.scheduledDate ? task.scheduledDate : toLocalDateString(new Date(task.createdAt));
          return toLocalDateString(today) >= startDateStr;
        }
        // Prefer scheduledDate (YYYY-MM-DD). If absent, use createdAt's local day so unscheduled tasks appear today.
        const taskDateStr = task.scheduledDate ? task.scheduledDate : toLocalDateString(new Date(task.createdAt));
        return isSameLocalDay(parseLocalDate(taskDateStr), today);
      })
      .sort((a, b) => {
        // Sort by priority (A1 > A2 > A3 > B1 > B2 > B3 > C1 > C2 > C3 > D), then by custom order (ascending), then by creation time
        const priorityOrder = {
          A1: 10, A2: 9, A3: 8,
          B1: 7, B2: 6, B3: 5,
          C1: 4, C2: 3, C3: 2,
          D: 1
        };
        const priorityDiff = priorityOrder[b.priority] - priorityOrder[a.priority];
        if (priorityDiff !== 0) return priorityDiff;
        if (a.order && b.order && a.order !== b.order) return a.order - b.order;
        return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
      });
  };

  const getCompletedTasks = (): Task[] => {
    // Sort primarily by completedAt descending. If identical (can happen when toggled rapidly in same ms)
    // fall back to updatedAt descending, then creation order (later index first) to ensure deterministic ordering.
    return tasks
      .filter(t => t.completed && !t.deletedAt)
      .sort((a, b) => {
        const aCompleted = a.completedAt ? new Date(a.completedAt).getTime() : 0;
        const bCompleted = b.completedAt ? new Date(b.completedAt).getTime() : 0;
        if (bCompleted !== aCompleted) return bCompleted - aCompleted;
        const aUpdated = new Date(a.updatedAt).getTime();
        const bUpdated = new Date(b.updatedAt).getTime();
        if (bUpdated !== aUpdated) return bUpdated - aUpdated;
        // Fallback: reverse original order so the task toggled later (higher index) comes first
        const aIndex = tasks.findIndex(t => t.id === a.id);
        const bIndex = tasks.findIndex(t => t.id === b.id);
        return bIndex - aIndex;
      });
  };

  const getDeletedTasks = (): Task[] => {
    return tasks.filter(t => t.deletedAt).sort((a, b) => {
      const ad = a.deletedAt ? new Date(a.deletedAt).getTime() : 0;
      const bd = b.deletedAt ? new Date(b.deletedAt).getTime() : 0;
      return bd - ad; // newest deleted first
    });
  };

  const moveTaskToDate = (taskId: string, date: string): void => {
    updateTask(taskId, { scheduledDate: date });
  };

  // Import tasks from AI-generated text using --- delimiter
  const importTasksFromText = (text: string): Task[] => {
    if (!user) return [];

    const sections = text.split('---').map(section => section.trim()).filter(Boolean);
    const importedTasks: Task[] = [];

    sections.forEach(section => {
      const lines = section.split('\n').map(line => line.trim()).filter(Boolean);

      lines.forEach(line => {
        // Parse different formats:
        // - [A1] Task title: description
        // - A1 Task title (assigned to: Me) [Day, time]
        // - Priority A2: Task title
        // - Task title (Priority: B3)
        // - Simple task title

        let priority: Priority = 'C1'; // Default priority
        let assignment: Assignment = 'me'; // Default assignment
        let title = line;
        let description = '';
        let dayOfWeek = '';
        let scheduledTime = '';

        // First, try to match the exact format: "A1 Task title (assigned to: Me) [Day, time]"
        const exactFormatMatch = line.match(/^([ABCD][123]?)\s+(.+?)(?:\s+\(assigned to:\s*(Me|Partner|Both)\))?(?:\s+\[([^\]]+)\])?$/i);
        if (exactFormatMatch) {
          const priorityStr = exactFormatMatch[1].toUpperCase();
          priority = (priorityStr.length === 1 ? priorityStr + '1' : priorityStr) as Priority;
          title = exactFormatMatch[2].trim();
          if (exactFormatMatch[3]) {
            assignment = exactFormatMatch[3].toLowerCase() as Assignment;
          }
          if (exactFormatMatch[4]) {
            const dayTimeStr = exactFormatMatch[4];
            const dayTimeMatch = dayTimeStr.match(/^(Monday|Tuesday|Wednesday|Thursday|Friday|Saturday|Sunday)(?:,\s*(.+))?$/i);
            if (dayTimeMatch) {
              dayOfWeek = dayTimeMatch[1];
              scheduledTime = dayTimeMatch[2]?.trim() || '';
            }
          }
        } else {
          // Fallback to individual parsing methods

          // Match [A1], [B2], [C3], [D] format
          const priorityMatch = line.match(/^\[([ABCD][123]?)\]\s*(.+)/);
          if (priorityMatch) {
            const priorityStr = priorityMatch[1];
            // Normalize single letter priorities to level 1
            priority = (priorityStr.length === 1 ? priorityStr + '1' : priorityStr) as Priority;
            title = priorityMatch[2];
          }

          // Match "Priority A2:" format
          const priorityMatch2 = line.match(/^Priority\s+([ABCD][123]?):\s*(.+)/i);
          if (priorityMatch2) {
            const priorityStr = priorityMatch2[1].toUpperCase();
            priority = (priorityStr.length === 1 ? priorityStr + '1' : priorityStr) as Priority;
            title = priorityMatch2[2];
          }

          // Match "(Priority: B3)" format
          const priorityMatch3 = line.match(/^(.+)\s*\(Priority:\s*([ABCD][123]?)\)/i);
          if (priorityMatch3) {
            title = priorityMatch3[1];
            const priorityStr = priorityMatch3[2].toUpperCase();
            priority = (priorityStr.length === 1 ? priorityStr + '1' : priorityStr) as Priority;
          }

          // Parse assignment from title
          const assignmentMatch = title.match(/\(assigned to:\s*(Me|Partner|Both)\)/i);
          if (assignmentMatch) {
            assignment = assignmentMatch[1].toLowerCase() as Assignment;
            title = title.replace(/\(assigned to:\s*(Me|Partner|Both)\)/i, '').trim();
          }

          // Parse day and time from title
          const dayTimeMatch = title.match(/\[(Monday|Tuesday|Wednesday|Thursday|Friday|Saturday|Sunday)(?:,\s*(.+?))?\]/i);
          if (dayTimeMatch) {
            dayOfWeek = dayTimeMatch[1];
            scheduledTime = dayTimeMatch[2] || '';
            title = title.replace(/\[(Monday|Tuesday|Wednesday|Thursday|Friday|Saturday|Sunday)(?:,\s*.+?)?\]/i, '').trim();
          }
        }

        // Split title and description on colon
        const titleParts = title.split(':');
        if (titleParts.length > 1) {
          title = titleParts[0].trim();
          description = titleParts.slice(1).join(':').trim();
        }

        // Clean up bullet points and numbering
        title = title.replace(/^[-*•]\s*/, '').replace(/^\d+\.\s*/, '').trim();

        if (title) {
          const now = new Date().toISOString();

          // Calculate scheduledDate based on dayOfWeek
          let scheduledDate = '';
          if (dayOfWeek) {
            const today = new Date();
            const currentDay = today.getDay(); // 0 = Sunday, 1 = Monday, etc.
            const targetDay = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'].indexOf(dayOfWeek);
            const daysUntilTarget = (targetDay - currentDay + 7) % 7;
            const targetDate = new Date(today);
            targetDate.setDate(today.getDate() + (daysUntilTarget === 0 ? 7 : daysUntilTarget)); // If today, schedule for next week
            scheduledDate = targetDate.toISOString().split('T')[0];
          }

          const task: Task = {
            id: generateId(),
            title,
            description: description || undefined,
            priority,
            assignment,
            color: getDefaultColorForAssignment(assignment, user),
            completed: false,
            createdBy: user.id,
            scheduledDate: scheduledDate || undefined,
            scheduledTime: scheduledTime || undefined,
            dayOfWeek: dayOfWeek || undefined,
            createdAt: now,
            updatedAt: now,
          };

          importedTasks.push(task);
        }
      });
    });

    // Add imported tasks to the current task list
    setTasks(prev => [...prev, ...importedTasks]);

    return importedTasks;
  };

  const value: TaskContextType = {
    tasks,
    isLoading,
    createTask,
    updateTask,
    toggleTaskComplete,
    softDeleteTask,
    restoreTask,
    hardDeleteTask,
    filterTasks,
    getTasksByDate,
    getTodaysTasks,
    getCompletedTasks,
    getDeletedTasks,
    importTasksFromText,
    moveTaskToDate,
    reorderTasksWithinPriority,
    syncNow,
  };

  return <TaskContext.Provider value={value}>{children}</TaskContext.Provider>;
};

// Helper function to get default colors for priorities
const getDefaultColorForPriority = (priority: Priority): string => {
  const colors = {
    A1: '#dc2626', A2: '#ef4444', A3: '#f87171', // Red shades for A priorities
    B1: '#ea580c', B2: '#f97316', B3: '#fb923c', // Orange shades for B priorities  
    C1: '#ca8a04', C2: '#eab308', C3: '#facc15', // Yellow shades for C priorities
    D: '#22c55e', // Green for D priority
  };
  return colors[priority];
};

// Helper function to get default colors based on assignment
const getDefaultColorForAssignment = (assignment: Assignment, user: any): string => {
  switch (assignment) {
    case 'me':
      return user?.color || '#ec4899'; // Default pink
    case 'partner':
      return '#3b82f6'; // Default blue
    case 'both':
      return '#8b5cf6'; // Purple for both (will use gradient in UI)
    default:
      return user?.color || '#3b82f6';
  }
};
