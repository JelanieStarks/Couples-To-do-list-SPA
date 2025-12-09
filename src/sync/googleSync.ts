/**
 * googleSync (dev-friendly stub)
 * Safe to leave disabled; only runs when syncEnabled + connectStatus === 'ready'.
 */
import type { Task } from '../types';
import { taskToGoogleEvent } from '../utils/googleCalendarSync';

export type GoogleSyncSettings = {
  syncEnabled?: boolean;
  connectStatus?: 'disconnected' | 'ready' | 'error';
  accountEmail?: string;
  userId?: string;
};

export const syncTasksWithGoogle = async (tasks: Task[], settings?: GoogleSyncSettings) => {
  if (!settings?.syncEnabled) return { ok: false, skipped: true };
  if (settings.connectStatus !== 'ready') return { ok: false, skipped: true };
  try {
    const body = {
      tasks: tasks.filter(t => t.scheduledDate),
      userId: settings.userId || 'local-user',
      events: tasks.filter(t => t.scheduledDate).map(taskToGoogleEvent),
    };
    const res = await fetch('/v1/google/sync', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    if (!res.ok) return { ok: false };
    const data = await res.json();
    return { ok: true, events: data.events };
  } catch (error) {
    console.warn('google sync failed (safe to ignore when disabled)', error);
    return { ok: false, error: (error as Error).message };
  }
};
