import React from 'react';
import { describe, it, expect } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import http from 'http';
import { AuthProvider } from '../../contexts/AuthContext';
import { TaskProvider, useTask } from '../../contexts/TaskContext';
import type { User } from '../../types';

// Test component to create a task and show count
const TaskCreator: React.FC<{ title: string }> = ({ title }) => {
  const { createTask, tasks } = useTask();
  React.useEffect(() => {
    const t = setTimeout(() => {
      createTask({
        title,
        description: 'from A',
        priority: 'C1',
        assignment: 'both',
        color: '#888',
      } as any);
    }, 100);
    return () => clearTimeout(t);
  }, [createTask, title]);
  return <div data-testid="count">{tasks.length}</div>;
};

const ViewOnly: React.FC = () => {
  const { tasks } = useTask();
  return <div data-testid="count">{tasks.length}</div>;
};

const Wrapper: React.FC<{ user: User; partner: User; children: React.ReactNode }> = ({ user, partner, children }) => (
  <AuthProvider initialUser={user} initialPartner={partner}>
    <TaskProvider>{children}</TaskProvider>
  </AuthProvider>
);

// Minimal inline sync server used by tests. Two variants: with WS and without WS
const startServer = async (opts: { websockets: boolean }) => {
  const rooms = new Map<string, { tasks: any[]; updatedAt: number }>();
  const server = http.createServer(async (req, res) => {
    const url = new URL(req.url || '/', 'http://localhost');
    const method = req.method || 'GET';
    const match = url.pathname.match(/^\/v1\/rooms\/([^/]+)\/tasks$/);
    if (!match) {
      res.statusCode = 404; res.end('not found'); return;
    }
    const roomId = decodeURIComponent(match[1]);
    if (method === 'GET') {
      const entry = rooms.get(roomId) || { tasks: [], updatedAt: 0 };
      res.setHeader('content-type', 'application/json');
      res.end(JSON.stringify(entry));
      return;
    }
    if (method === 'PUT') {
      const chunks: Buffer[] = [];
      for await (const c of req as any) chunks.push(c);
      const body = JSON.parse(Buffer.concat(chunks).toString('utf8') || '{}');
      const tasks = Array.isArray(body.tasks) ? body.tasks : [];
      const updatedAt = Date.now();
      rooms.set(roomId, { tasks, updatedAt });
      // WS broadcast will be handled separately below if enabled
      res.setHeader('content-type', 'application/json');
      res.end(JSON.stringify({ ok: true }));
      // Broadcast on WS if enabled
      if (opts.websockets && wss) {
        const payload = JSON.stringify({ type: 'tasks-updated', tasks, updatedAt, sourceId: body.sourceId });
        const set = wsRooms.get(roomId);
        if (set) {
          for (const ws of set) {
            try { ws.send(payload); } catch {}
          }
        }
      }
      return;
    }
    res.statusCode = 405; res.end('method not allowed');
  });
  let wss: any = null;
  const wsRooms = new Map<string, Set<any>>();
  if (opts.websockets) {
    const { WebSocketServer } = await import('ws');
    wss = new WebSocketServer({ noServer: true });
    server.on('upgrade', (req, socket, head) => {
      const url = new URL(req.url || '/', 'http://localhost');
      if (!url.pathname.startsWith('/v1/rooms/')) { socket.destroy(); return; }
      wss.handleUpgrade(req, socket, head, (ws: any) => wss.emit('connection', ws, req));
    });
    wss.on('connection', (ws: any, req: any) => {
      const url = new URL(req.url, 'http://localhost');
      const parts = url.pathname.split('/');
      const roomId = decodeURIComponent(parts[3] || '');
      if (!roomId) { ws.close(); return; }
      let set = wsRooms.get(roomId);
      if (!set) { set = new Set(); wsRooms.set(roomId, set); }
      set.add(ws);
      ws.on('close', () => {
        set!.delete(ws);
        if (set!.size === 0) wsRooms.delete(roomId);
      });
    });
  }
  await new Promise<void>(resolve => server.listen(0, resolve));
  const port = (server.address() as any).port;
  return { server, port };
};

describe('cross-device sync', () => {
  const userA: User = { id: 'U-A', name: 'A', inviteCode: 'ABC123', color: '#f0f', createdAt: new Date().toISOString(), partnerId: 'U-B' };
  const userB: User = { id: 'U-B', name: 'B', inviteCode: 'DEF456', color: '#0ff', createdAt: new Date().toISOString(), partnerId: 'U-A' };
  it('syncNow pulls latest from REST between two providers', async () => {
  const { server, port } = await startServer({ websockets: false });
    (globalThis as any).VITE_SYNC_URL = `http://127.0.0.1:${port}`;

    // A creates a task (pushes via REST)
    render(
      <Wrapper user={userA} partner={userB}>
        <TaskCreator title="rest-prop" />
      </Wrapper>
    );

    // B mounts a viewer with a manual sync trigger
    const SyncInvoker: React.FC = () => {
      const { tasks, syncNow } = useTask();
      React.useEffect(() => {
        let cancelled = false;
        const start = Date.now();
        const tick = async () => {
          if (cancelled) return;
          try { await syncNow(); } catch {}
          if (!cancelled && Date.now() - start < 10000) {
            setTimeout(tick, 300);
          }
        };
        // Kick off soon to give A time to push first
        const kickoff = setTimeout(tick, 600);
        return () => { cancelled = true; clearTimeout(kickoff); };
      }, [syncNow]);
      return <div data-testid="count-b">{tasks.length}</div>;
    };

    render(
      <Wrapper user={userB} partner={userA}>
        <SyncInvoker />
      </Wrapper>
    );

    await waitFor(() => {
      const el = screen.getByTestId('count-b');
      expect(Number(el.textContent)).toBe(1);
    }, { timeout: 20000 });

    await new Promise(resolve => server.close(resolve));
  }, 30000);
});
