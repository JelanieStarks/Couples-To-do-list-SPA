/**
 * googleCalendarSync (stub)
 * Shapes and helpers to translate between Couples tasks and Google Calendar events.
 * All functions are pure + side-effect-free for now.
 */
import type { Task } from '../types';

export type GoogleCalendarEvent = {
  id: string;
  summary: string;
  start: { date: string };
  end: { date: string };
  status?: 'confirmed' | 'cancelled';
  description?: string;
};

export const taskToGoogleEvent = (task: Task): GoogleCalendarEvent => {
  const date = task.scheduledDate || new Date().toISOString().slice(0, 10);
  return {
    id: task.id,
    summary: task.title,
    start: { date },
    end: { date },
    status: task.completed ? 'confirmed' : 'confirmed',
    description: task.description,
  };
};

export const mergeGoogleEventIntoTask = (task: Task, event: GoogleCalendarEvent): Task => {
  return {
    ...task,
    title: event.summary || task.title,
    description: event.description || task.description,
    scheduledDate: event.start?.date || task.scheduledDate,
    updatedAt: new Date().toISOString(),
  };
};

export const shouldPushTask = (task: Task) => Boolean(task.scheduledDate);

export const noopSyncDriver = {
  pushTasks: async (_tasks: Task[]) => [],
  pullEvents: async () => [] as GoogleCalendarEvent[],
};
