import React, { createContext, useContext, useEffect, useState } from 'react';
import type { Task, Priority, TaskFilter } from '../types';
import { storage, STORAGE_KEYS, generateId } from '../utils';
import { useAuth } from './AuthContext';

// Helper function to get default color for priority
const getDefaultColorForPriority = (priority: Priority): string => {
  if (priority.startsWith('A')) return '#ef4444'; // Red for urgent
  if (priority.startsWith('B')) return '#f97316'; // Orange for important
  if (priority.startsWith('C')) return '#22c55e'; // Green for nice to do
  return '#6b7280'; // Gray for someday
};

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
  const { user, partner } = useAuth();
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
        // Sort by priority (A1 > A2 > A3 > B1... > D), then by creation time
        const priorityOrder = { 
          A1: 10, A2: 9, A3: 8, 
          B1: 7, B2: 6, B3: 5, 
          C1: 4, C2: 3, C3: 2, 
          D: 1 
        };
        const priorityDiff = (priorityOrder[b.priority] || 1) - (priorityOrder[a.priority] || 1);
        if (priorityDiff !== 0) return priorityDiff;
        return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
      });
  };

  const moveTaskToDate = (taskId: string, date: string): void => {
    updateTask(taskId, { scheduledDate: date });
  };

  // Import tasks from AI-generated text using --- delimiter (new format)
  const importTasksFromText = (text: string): Task[] => {
    if (!user) return [];

    const sections = text.split('---').map(section => section.trim()).filter(Boolean);
    const importedTasks: Task[] = [];

    sections.forEach(section => {
      const lines = section.split('\n').map(line => line.trim()).filter(Boolean);
      
      lines.forEach(line => {
        // Parse format: [PRIORITY] Task description (assigned to: Me/Partner/Both) [Day of Week, optional time]
        const taskMatch = line.match(/^\[([ABCD][1-3]?)\]\s*(.+?)(?:\s*\(assigned to:\s*(Me|Partner|Both)\))?(?:\s*\[([^\]]+)\])?$/i);
        
        if (taskMatch) {
          const [, priorityStr, title, assignedToStr, scheduleStr] = taskMatch;
          
          // Parse priority (ensure it matches our new format)
          let priority: Priority = 'C1'; // Default
          if (['A1', 'A2', 'A3', 'B1', 'B2', 'B3', 'C1', 'C2', 'C3', 'D'].includes(priorityStr)) {
            priority = priorityStr as Priority;
          } else if (priorityStr === 'A') {
            priority = 'A1';
          } else if (priorityStr === 'B') {
            priority = 'B1';
          } else if (priorityStr === 'C') {
            priority = 'C1';
          }
          
          // Parse assignment (default to 'Me' if not specified)
          const assignedTo: 'Me' | 'Partner' | 'Both' = (assignedToStr as 'Me' | 'Partner' | 'Both') || 'Me';
          
          // Parse schedule (day and optional time)
          let scheduledDate = '';
          let scheduledTime = '';
          if (scheduleStr) {
            const schedParts = scheduleStr.split(',').map(p => p.trim());
            const dayPart = schedParts[0];
            const timePart = schedParts[1];
            
            // Convert day name to date (this week)
            const daysOfWeek = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
            const dayIndex = daysOfWeek.findIndex(day => day.toLowerCase() === dayPart.toLowerCase());
            if (dayIndex !== -1) {
              const today = new Date();
              const currentDay = today.getDay();
              const daysToAdd = (dayIndex - currentDay + 7) % 7;
              const targetDate = new Date(today);
              targetDate.setDate(today.getDate() + daysToAdd);
              scheduledDate = targetDate.toISOString().split('T')[0];
            }
            
            // Parse time if provided
            if (timePart) {
              const timeMatch = timePart.match(/(\d{1,2}):(\d{2})\s*(AM|PM)?/i);
              if (timeMatch) {
                let [, hours, minutes, ampm] = timeMatch;
                let hour24 = parseInt(hours);
                
                if (ampm) {
                  if (ampm.toUpperCase() === 'PM' && hour24 < 12) hour24 += 12;
                  if (ampm.toUpperCase() === 'AM' && hour24 === 12) hour24 = 0;
                }
                
                scheduledTime = `${hour24.toString().padStart(2, '0')}:${minutes}`;
              }
            }
          }
          
          // Get color based on assignment and priority
          let color = getDefaultColorForPriority(priority);
          if (assignedTo === 'Me' && user.color) {
            color = user.color;
          } else if (assignedTo === 'Partner' && partner?.color) {
            color = partner.color;
          } else if (assignedTo === 'Both') {
            // Create a gradient or blend color (for now, use purple as blend)
            color = '#8b5cf6';
          }

          const now = new Date().toISOString();
          const task: Task = {
            id: generateId(),
            title: title.trim(),
            priority,
            assignedTo,
            color,
            completed: false,
            createdBy: user.id,
            scheduledDate: scheduledDate || undefined,
            scheduledTime: scheduledTime || undefined,
            createdAt: now,
            updatedAt: now,
          };

          importedTasks.push(task);
        } else {
          // Fallback: try to parse simpler formats
          let priority: Priority = 'C1';
          let title = line;
          let assignedTo: 'Me' | 'Partner' | 'Both' = 'Me';

          // Match [A], [B], [C], [D] format (legacy support)
          const priorityMatch = line.match(/^\[([ABCD])\]\s*(.+)/);
          if (priorityMatch) {
            const p = priorityMatch[1];
            priority = p === 'A' ? 'A1' : p === 'B' ? 'B1' : p === 'C' ? 'C1' : 'D';
            title = priorityMatch[2];
          }

          // Clean up bullet points and numbering
          title = title.replace(/^[-*•]\s*/, '').replace(/^\d+\.\s*/, '').trim();

          if (title) {
            const now = new Date().toISOString();
            const task: Task = {
              id: generateId(),
              title,
              priority,
              assignedTo,
              color: getDefaultColorForPriority(priority),
              completed: false,
              createdBy: user.id,
              createdAt: now,
              updatedAt: now,
            };

            importedTasks.push(task);
          }
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

