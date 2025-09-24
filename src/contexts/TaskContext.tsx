import React, { createContext, useContext, useEffect, useState } from 'react';
import type { Task, Priority, TaskFilter, Assignment } from '../types';
import { storage, STORAGE_KEYS, generateId } from '../utils';
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
}

const TaskContext = createContext<TaskContextType | undefined>(undefined);

export const useTask = () => {
  const context = useContext(TaskContext);
  if (context === undefined) {
    throw new Error('useTask must be used within a TaskProvider');
  }
  return context;
};

export const TaskProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user } = useAuth();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Load tasks on app start - Jarvis never forgets your to-dos
  useEffect(() => {
    const loadTasks = () => {
      const savedTasks = storage.get<Task[]>(STORAGE_KEYS.TASKS) || [];
      setTasks(savedTasks);
      setIsLoading(false);
    };

    loadTasks();
  }, []);

  // Save tasks to localStorage whenever tasks change
  useEffect(() => {
    if (!isLoading) {
      storage.set(STORAGE_KEYS.TASKS, tasks);
    }
  }, [tasks, isLoading]);

  const createTask = (taskData: Omit<Task, 'id' | 'createdAt' | 'updatedAt' | 'createdBy' | 'completedAt' | 'deletedAt'>): void => {
    if (!user) return;

    const now = new Date().toISOString();
    const newTask: Task = {
      ...taskData,
      id: generateId(),
      createdBy: user.id,
      createdAt: now,
      updatedAt: now,
    };

    setTasks(prev => [...prev, newTask]);
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
    const targetDate = new Date(date).toDateString();
    return tasks.filter(task => {
      if (task.deletedAt) return false;
      const taskDate = task.scheduledDate || task.createdAt;
      return new Date(taskDate).toDateString() === targetDate;
    });
  };

  const getTodaysTasks = (): Task[] => {
    const today = new Date().toDateString();
    return tasks
      .filter(task => {
        if (task.deletedAt) return false;
        const taskDate = task.scheduledDate || task.createdAt;
        return new Date(taskDate).toDateString() === today;
      })
      .sort((a, b) => {
        // Sort by priority (A1 > A2 > A3 > B1 > B2 > B3 > C1 > C2 > C3 > D), then by creation time
        const priorityOrder = { 
          A1: 10, A2: 9, A3: 8, 
          B1: 7, B2: 6, B3: 5, 
          C1: 4, C2: 3, C3: 2, 
          D: 1 
        };
        const priorityDiff = priorityOrder[b.priority] - priorityOrder[a.priority];
        if (priorityDiff !== 0) return priorityDiff;
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
    return tasks.filter(t => t.deletedAt).sort((a,b) => {
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
