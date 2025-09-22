// 🎯 Task and User Types - Because type safety is like having a helpful robot assistant
export interface User {
  id: string;
  name: string;
  email?: string;
  partnerId?: string;
  inviteCode: string;
  createdAt: string;
}

export type Priority = 'A' | 'B' | 'C' | 'D';

export type AssignedTo = 'Me' | 'Partner' | 'Both';

export interface Task {
  id: string;
  title: string;
  description?: string;
  priority: Priority;
  color: string;
  completed: boolean;
  createdBy: string;
  assignedTo?: AssignedTo;
  sharedWith?: string;
  dueDate?: string;
  scheduledDate?: string; // For calendar scheduling
  dayOfWeek?: string; // Monday, Tuesday, etc.
  timeOfDay?: string; // HH:MM format
  createdAt: string;
  updatedAt: string;
}

export interface AuthState {
  user: User | null;
  partner: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
}

export interface TaskFilter {
  priority?: Priority;
  completed?: boolean;
  createdBy?: string;
  dateRange?: {
    start: string;
    end: string;
  };
}

export interface AppSettings {
  theme: 'light' | 'dark';
  jarvisMode: boolean; // Toggle for helpful AI-style comments
  adhdFriendly: boolean; // Extra visual cues and animations
}