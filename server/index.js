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
// in-memory Google tokens keyed by userId (dev only)
const googleTokens = new Map();

const hasEnv = (key) => Boolean((globalThis?.process?.env || {})[key]);

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

// Google OAuth scaffolding (stubbed: no tokens stored). This keeps the client flow stable while real storage is wired.
app.post('/v1/google/oauth/init', (_req, res) => {
  const clientId = (globalThis?.process?.env || {}).GOOGLE_CLIENT_ID || 'STUB_GOOGLE_CLIENT_ID';
  const redirectUri = (globalThis?.process?.env || {}).GOOGLE_REDIRECT_URI || 'http://localhost:5173/oauth/callback';
  const scope = 'https://www.googleapis.com/auth/calendar.events';
  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri,
    response_type: 'code',
    access_type: 'offline',
    prompt: 'consent',
    scope,
    state: 'couples-google-stub',
    code_challenge: 'stub-challenge',
    code_challenge_method: 'S256',
  });
  res.json({
    authUrl: `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`,
    note: hasEnv('GOOGLE_CLIENT_ID') ? 'env detected, replace stub exchange' : 'stub endpoint — no external call performed',
  });
});

app.post('/v1/google/oauth/callback', (req, res) => {
  const { code } = req.body || {};
  if (!code) return res.status(400).json({ error: 'missing code' });
  res.json({
    ok: true,
    accessToken: 'stub-access',
    refreshToken: 'stub-refresh',
    expiresAt: Date.now() + 3600_000,
    note: 'Stub response — persist securely in a real implementation.',
  });
});

app.post('/v1/google/sync', (req, res) => {
  const { tasks, userId } = req.body || {};
  if (!Array.isArray(tasks)) return res.status(400).json({ error: 'tasks must be array' });
  // simulate remote events mirroring tasks
  const events = tasks
    .filter(t => t && t.scheduledDate)
    .map(t => ({ id: t.id, summary: t.title, start: { date: t.scheduledDate }, end: { date: t.scheduledDate } }));
  if (userId) {
    googleTokens.set(userId, { lastSync: Date.now() });
  }
  res.json({ ok: true, events });
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
