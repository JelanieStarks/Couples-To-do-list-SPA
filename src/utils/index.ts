// 🤖 LocalStorage utilities - Jarvis helps you remember everything
export const STORAGE_KEYS = {
  USER: 'couples-todo-user',
  PARTNER: 'couples-todo-partner',
  TASKS: 'couples-todo-tasks',
  SETTINGS: 'couples-todo-settings',
} as const;

export const storage = {
  // Get item with automatic parsing - Because manually parsing JSON is so last millennium
  get: <T>(key: string): T | null => {
    try {
      const item = localStorage.getItem(key);
      return item ? JSON.parse(item) : null;
    } catch (error) {
      console.warn(`Failed to parse localStorage item '${key}':`, error);
      return null;
    }
  },

  // Set item with automatic stringification - Jarvis handles the boring stuff
  set: <T>(key: string, value: T): void => {
    try {
      localStorage.setItem(key, JSON.stringify(value));
    } catch (error) {
      console.error(`Failed to save to localStorage '${key}':`, error);
    }
  },

  // Remove item - Sometimes you need to forget things
  remove: (key: string): void => {
    localStorage.removeItem(key);
  },

  // Clear all app data - Nuclear option, use with caution
  clearAll: (): void => {
    Object.values(STORAGE_KEYS).forEach(key => {
      localStorage.removeItem(key);
    });
  }
};

// Generate unique IDs - Because collision-free IDs are important
export const generateId = (): string => {
  return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
};

// Generate invite codes - 6 characters, memorable and shareable
export const generateInviteCode = (): string => {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let result = '';
  for (let i = 0; i < 6; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
};

// Format dates in a human-friendly way
export const formatDate = (date: string | Date): string => {
  const d = new Date(date);
  const today = new Date();
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);

  if (d.toDateString() === today.toDateString()) {
    return 'Today';
  } else if (d.toDateString() === tomorrow.toDateString()) {
    return 'Tomorrow';
  } else if (d.toDateString() === yesterday.toDateString()) {
    return 'Yesterday';
  } else {
    return d.toLocaleDateString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric'
    });
  }
};

// Normalize a Date to a local date-only string YYYY-MM-DD (no timezone pitfalls)
export const toLocalDateString = (date: Date): string => {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
};

// Parse a YYYY-MM-DD date string as a local date (no timezone shift)
export const parseLocalDate = (dateStr: string): Date => {
  const [y, m, d] = dateStr.split('-').map(Number);
  return new Date(y, (m || 1) - 1, d || 1);
};

// Compare two dates by local calendar day (ignores time)
export const isSameLocalDay = (a: string | Date, b: string | Date): boolean => {
  const da = typeof a === 'string' ? new Date(a) : a;
  const db = typeof b === 'string' ? new Date(b) : b;
  return toLocalDateString(da) === toLocalDateString(db);
};

// Get day of week for calendar columns
export const getDayOfWeek = (date: string | Date): number => {
  return new Date(date).getDay(); // 0 = Sunday, 1 = Monday, etc.
};

// Get week dates starting from Monday
export const getWeekDates = (date: Date = new Date()): Date[] => {
  const week = [];
  const startOfWeek = new Date(date);
  const day = startOfWeek.getDay();
  const diff = startOfWeek.getDate() - day + (day === 0 ? -6 : 1); // Adjust for Monday start
  startOfWeek.setDate(diff);

  for (let i = 0; i < 7; i++) {
    const dayDate = new Date(startOfWeek);
    dayDate.setDate(startOfWeek.getDate() + i);
    week.push(dayDate);
  }

  return week;
};
