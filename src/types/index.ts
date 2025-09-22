// 🎯 Task and User Types - Because type safety is like having a helpful robot assistant
export interface User {
  id: string;
  name: string;
  email?: string;
  partnerId?: string;
  inviteCode: string;
  color: string; // User's chosen color (default pink for user, blue for partner)
  createdAt: string;
}

export type Priority = 'A1' | 'A2' | 'A3' | 'B1' | 'B2' | 'B3' | 'C1' | 'C2' | 'C3' | 'D';

export interface Task {
  id: string;
  title: string;
  description?: string;
  priority: Priority;
  color: string;
  completed: boolean;
  createdBy: string;
  assignedTo: 'Me' | 'Partner' | 'Both'; // Required field for assignment
  sharedWith?: string;
  dueDate?: string;
  scheduledDate?: string; // For calendar scheduling
  scheduledTime?: string; // Optional time for tasks
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