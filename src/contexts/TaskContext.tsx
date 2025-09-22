import React, { createContext, useContext, useEffect, useState } from 'react';
import type { Task, Priority, TaskFilter } from '../types';
import { storage, STORAGE_KEYS, generateId } from '../utils';
import { useAuth } from './AuthContext';

// 📝 Task Context - Your digital task manager with a sense of humor
interface TaskContextType {
  tasks: Task[];
  isLoading: boolean;
  createTask: (task: Omit<Task, 'id' | 'createdAt' | 'updatedAt' | 'createdBy'>) => void;
  updateTask: (id: string, updates: Partial<Task>) => void;
  deleteTask: (id: string) => void;
  toggleTaskComplete: (id: string) => void;
  filterTasks: (filter: TaskFilter) => Task[];
  getTasksByDate: (date: string) => Task[];
  getTodaysTasks: () => Task[];
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

  const createTask = (taskData: Omit<Task, 'id' | 'createdAt' | 'updatedAt' | 'createdBy'>): void => {
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

  const deleteTask = (id: string): void => {
    setTasks(prev => prev.filter(task => task.id !== id));
  };

  const toggleTaskComplete = (id: string): void => {
    setTasks(prev => 
      prev.map(task => 
        task.id === id 
          ? { ...task, completed: !task.completed, updatedAt: new Date().toISOString() }
          : task
      )
    );
  };

  const filterTasks = (filter: TaskFilter): Task[] => {
    return tasks.filter(task => {
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
      const taskDate = task.scheduledDate || task.createdAt;
      return new Date(taskDate).toDateString() === targetDate;
    });
  };

  const getTodaysTasks = (): Task[] => {
    const today = new Date().toDateString();
    return tasks
      .filter(task => {
        const taskDate = task.scheduledDate || task.createdAt;
        return new Date(taskDate).toDateString() === today;
      })
      .sort((a, b) => {
        // Sort by priority (A > B > C > D), then by creation time
        const priorityOrder = { A: 4, B: 3, C: 2, D: 1 };
        const priorityDiff = priorityOrder[b.priority] - priorityOrder[a.priority];
        if (priorityDiff !== 0) return priorityDiff;
        return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
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
        // - [A] Task title: description
        // - Priority A: Task title
        // - Task title (Priority: B)
        // - Simple task title
        
        let priority: Priority = 'C'; // Default priority
        let title = line;
        let description = '';

        // Match [A], [B], [C], [D] format
        const priorityMatch = line.match(/^\[([ABCD])\]\s*(.+)/);
        if (priorityMatch) {
          priority = priorityMatch[1] as Priority;
          title = priorityMatch[2];
        }

        // Match "Priority A:" format
        const priorityMatch2 = line.match(/^Priority\s+([ABCD]):\s*(.+)/i);
        if (priorityMatch2) {
          priority = priorityMatch2[1].toUpperCase() as Priority;
          title = priorityMatch2[2];
        }

        // Match "(Priority: B)" format
        const priorityMatch3 = line.match(/^(.+)\s*\(Priority:\s*([ABCD])\)/i);
        if (priorityMatch3) {
          title = priorityMatch3[1];
          priority = priorityMatch3[2].toUpperCase() as Priority;
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
          const task: Task = {
            id: generateId(),
            title,
            description: description || undefined,
            priority,
            color: getDefaultColorForPriority(priority),
            completed: false,
            createdBy: user.id,
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
    deleteTask,
    toggleTaskComplete,
    filterTasks,
    getTasksByDate,
    getTodaysTasks,
    importTasksFromText,
    moveTaskToDate,
  };

  return <TaskContext.Provider value={value}>{children}</TaskContext.Provider>;
};

// Helper function to get default colors for priorities
const getDefaultColorForPriority = (priority: Priority): string => {
  const colors = {
    A: '#ef4444', // Red
    B: '#f97316', // Orange
    C: '#eab308', // Yellow
    D: '#22c55e', // Green
  };
  return colors[priority];
};