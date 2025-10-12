// ServerSync: Minimal REST + WebSocket adapter for cross-device sync
// - Stores tasks per "room" on a tiny server
// - Uses last-write-wins at the list level (max updatedAt across tasks)
// - Broadcasts updates to all connected clients via WebSocket

import type { Task } from '../types';

export interface SyncMessage {
  type: 'tasks-updated';
  tasks: Task[];
  updatedAt?: number; // server-side timestamp of last update
  sourceId?: string; // client instance id that pushed the change
}

export class ServerSync {
  private baseUrl: string;
  private roomId: string;
  private clientId: string;
  private ws: WebSocket | null = null;
  private onRemoteUpdate: ((tasks: Task[]) => void) | null = null;

  constructor(baseUrl: string, roomId: string, clientId: string) {
    this.baseUrl = baseUrl.replace(/\/$/, '');
    this.roomId = roomId;
    this.clientId = clientId;
  }

  // Connect WebSocket and listen for remote updates
  async connect(onRemoteUpdate: (tasks: Task[]) => void): Promise<void> {
    this.onRemoteUpdate = onRemoteUpdate;
    try {
      const wsUrl = this.baseUrl.replace(/^http/i, 'ws') + `/v1/rooms/${encodeURIComponent(this.roomId)}?clientId=${encodeURIComponent(this.clientId)}`;
      this.ws = new WebSocket(wsUrl);
      const handleMessage = (raw: any) => {
        try {
          const data = typeof raw === 'string' ? JSON.parse(raw) : JSON.parse(String(raw?.data ?? raw));
          if (data?.type !== 'tasks-updated') return;
          if (data.sourceId && data.sourceId === this.clientId) return; // ignore our own
          if (Array.isArray(data.tasks)) this.onRemoteUpdate?.(data.tasks);
        } catch {}
      };
      // Browser-style
      try { (this.ws as any).onmessage = (ev: any) => handleMessage(ev); } catch {}
      // addEventListener-style
      try { (this.ws as any).addEventListener?.('message', (ev: any) => handleMessage(ev)); } catch {}
      // ws (node) style
      try { (this.ws as any).on?.('message', (data: any) => handleMessage(data)); } catch {}
      // Swallow connection errors
      try { (this.ws as any).onerror = () => {}; } catch {}
    } catch {
      // If ws connection fails, we silently operate in REST-only mode.
    }
  }

  // Fetch current tasks snapshot from server
  async fetchTasks(): Promise<Task[]> {
    try {
      const res = await fetch(`${this.baseUrl}/v1/rooms/${encodeURIComponent(this.roomId)}/tasks`, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' },
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json = await res.json();
      return Array.isArray(json?.tasks) ? (json.tasks as Task[]) : [];
    } catch {
      return [];
    }
  }

  // Push full task list to server; server will broadcast to other clients
  async pushTasks(tasks: Task[]): Promise<void> {
    try {
      await fetch(`${this.baseUrl}/v1/rooms/${encodeURIComponent(this.roomId)}/tasks`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tasks, sourceId: this.clientId }),
      });
    } catch {
      // Network down or server unavailable — fail quietly; user keeps local state
    }
  }

  close() {
    try { this.ws?.close(); } catch {}
    this.ws = null;
    this.onRemoteUpdate = null;
  }
}

// Helper to compute a list-level version. Consumers may use this to choose server vs local.
export const listVersion = (tasks: Task[]): number => {
  return tasks.reduce((max, t) => {
    const u = new Date(t.updatedAt).getTime();
    return u > max ? u : max;
  }, 0);
};
