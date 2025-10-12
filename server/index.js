// Minimal sync server for development and tests.
// WARNING: In-memory only. Not for production use.

import express from 'express';
import cors from 'cors';
import { WebSocketServer } from 'ws';
import http from 'http';

const app = express();
app.use(cors());
app.use(express.json({ limit: '1mb' }));

// roomId -> { tasks: Task[], updatedAt: number }
const rooms = new Map();

app.get('/v1/rooms/:roomId/tasks', (req, res) => {
  const { roomId } = req.params;
  const entry = rooms.get(roomId) || { tasks: [], updatedAt: 0 };
  res.json({ tasks: entry.tasks, updatedAt: entry.updatedAt });
});

app.put('/v1/rooms/:roomId/tasks', (req, res) => {
  const { roomId } = req.params;
  const { tasks, sourceId } = req.body || {};
  if (!Array.isArray(tasks)) return res.status(400).json({ error: 'tasks must be array' });
  const updatedAt = Date.now();
  rooms.set(roomId, { tasks, updatedAt });
  // Broadcast via WS
  const payload = JSON.stringify({ type: 'tasks-updated', tasks, updatedAt, sourceId });
  const set = wsRooms.get(roomId);
  if (set) {
    for (const ws of set) {
      try {
        ws.send(payload);
      } catch {
        // ignore broken sockets
      }
    }
  }
  res.json({ ok: true });
});

const server = http.createServer(app);
const wss = new WebSocketServer({ noServer: true });

// roomId -> Set<WebSocket>
const wsRooms = new Map();

server.on('upgrade', (req, socket, head) => {
  const url = new URL(req.url, `http://${req.headers.host}`);
  if (!url.pathname.startsWith('/v1/rooms/')) {
    socket.destroy();
    return;
  }
  wss.handleUpgrade(req, socket, head, (ws) => {
    wss.emit('connection', ws, req);
  });
});

wss.on('connection', (ws, req) => {
  const url = new URL(req.url, `http://${req.headers.host}`);
  const parts = url.pathname.split('/'); // /v1/rooms/:roomId
  const roomId = decodeURIComponent(parts[3] || '');
  if (!roomId) {
    ws.close();
    return;
  }
  let set = wsRooms.get(roomId);
  if (!set) {
    set = new Set();
    wsRooms.set(roomId, set);
  }
  set.add(ws);
  ws.on('close', () => {
    set.delete(ws);
    if (set.size === 0) wsRooms.delete(roomId);
  });
});

// Prefer process.env.PORT (dev), fallback to globalThis.PORT (tests) or 0 (ephemeral)
const envPort = (globalThis && (globalThis).process && (globalThis).process.env && (globalThis).process.env.PORT)
  ? Number((globalThis).process.env.PORT)
  : undefined;
const PORT = envPort || ((globalThis && (globalThis).PORT) || 0);
server.listen(PORT, () => {
  const addr = server.address();
  if (addr && typeof addr !== 'string') {
    console.log('sync-server:listening', addr.port);
  }
});

export default server;

// Helper for tests to get the port when 0 is used
export const getListeningPort = () => {
  const addr = server.address();
  return addr && typeof addr !== 'string' ? addr.port : null;
};
