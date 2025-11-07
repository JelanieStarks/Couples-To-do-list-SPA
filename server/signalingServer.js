#!/usr/bin/env node
/* eslint-env node */
import http from 'http';
import { WebSocketServer } from 'ws';
import { pathToFileURL } from 'url';
import process from 'node:process';

const log = (...args) => {
  console.log('[lan-signal]', ...args);
};

const createRoomStore = () => {
  const rooms = new Map();

  const ensure = (roomId) => {
    if (!rooms.has(roomId)) {
      rooms.set(roomId, {
        host: null,
        offer: null,
        guests: new Set(),
      });
    }
    return rooms.get(roomId);
  };

  const removeSocket = (socket) => {
    if (!socket || !socket.roomId) return;
    const room = rooms.get(socket.roomId);
    if (!room) return;
    if (socket.role === 'host') {
      room.host = null;
      room.offer = null;
      room.guests.forEach((guest) => {
        try {
          guest.send(JSON.stringify({ type: 'status', message: 'host-left' }));
        } catch {
          // ignore send failure
        }
      });
    } else if (socket.role === 'guest') {
      room.guests.delete(socket);
    }
    if (!room.host && room.guests.size === 0) {
      rooms.delete(socket.roomId);
    }
  };

  return { ensure, removeSocket };
};

export const createSignalingServer = ({ port = 4457, host = '0.0.0.0' } = {}) => {
  const server = http.createServer();
  const wss = new WebSocketServer({ server });
  const rooms = createRoomStore();

  const heartbeat = setInterval(() => {
    wss.clients.forEach((client) => {
      if (client.isAlive === false) {
        try { client.terminate(); } catch {
          // ignore termination failure
        }
        return;
      }
      client.isAlive = false;
      try { client.ping(); } catch {
        // ignore ping failure
      }
    });
  }, 30000);

  const sendJson = (socket, payload) => {
    try {
      socket.send(JSON.stringify(payload));
    } catch {
      // ignore send failure
    }
  };

  const broadcastOffer = (room, payload) => {
    room.guests.forEach((guest) => {
      sendJson(guest, { type: 'host-offer', payload });
    });
  };

  wss.on('connection', (socket) => {
    socket.isAlive = true;
    socket.on('pong', () => {
      socket.isAlive = true;
    });

    socket.on('message', (raw) => {
      let data;
      try {
        data = JSON.parse(raw.toString());
      } catch {
        sendJson(socket, { type: 'error', message: 'Invalid JSON payload' });
        return;
      }

      if (!data || typeof data !== 'object') {
        sendJson(socket, { type: 'error', message: 'Unsupported message payload' });
        return;
      }

      if (data.type === 'ping') {
        sendJson(socket, { type: 'pong' });
        return;
      }

      const { roomId } = data;
      if (!roomId) {
        sendJson(socket, { type: 'error', message: 'roomId is required' });
        return;
      }

      const room = rooms.ensure(roomId);

      if (data.type === 'register-host') {
        if (room.host && room.host !== socket) {
          try {
            sendJson(room.host, { type: 'status', message: 'replaced' });
          } catch {
            // ignore notify failure
          }
        }
        room.host = socket;
        room.offer = null;
        socket.role = 'host';
        socket.roomId = roomId;
        sendJson(socket, { type: 'status', message: 'host-registered' });
        return;
      }

      if (data.type === 'register-guest') {
        room.guests.add(socket);
        socket.role = 'guest';
        socket.roomId = roomId;
        sendJson(socket, { type: 'status', message: 'guest-registered' });
        if (room.offer) {
          sendJson(socket, { type: 'host-offer', payload: room.offer });
        }
        return;
      }

      if (data.type === 'update-offer') {
        if (socket.role !== 'host') {
          sendJson(socket, { type: 'error', message: 'Only host can publish offers' });
          return;
        }
        room.offer = data.payload || null;
        if (room.offer) {
          broadcastOffer(room, room.offer);
        }
        return;
      }

      if (data.type === 'submit-answer') {
        if (socket.role !== 'guest') {
          sendJson(socket, { type: 'error', message: 'Only guests can submit answers' });
          return;
        }
        if (room.host) {
          sendJson(room.host, { type: 'guest-answer', payload: data.payload });
        }
        return;
      }

      sendJson(socket, { type: 'error', message: `Unsupported message type: ${data.type}` });
    });

    socket.on('close', () => {
      rooms.removeSocket(socket);
    });

    socket.on('error', () => {
      rooms.removeSocket(socket);
    });
  });

  server.listen(port, host, () => {
    log(`LAN signaling server listening on ws://${host === '0.0.0.0' ? 'localhost' : host}:${port}`);
  });

  server.on('close', () => {
    clearInterval(heartbeat);
  });

  return { server, wss };
};

const entryUrl = process.argv[1] ? pathToFileURL(process.argv[1]).href : '';
if (import.meta.url === entryUrl) {
  const port = Number(process.env.PORT || process.env.LAN_SIGNAL_PORT || 4457);
  const host = process.env.HOST || '0.0.0.0';
  createSignalingServer({ port, host });
}
