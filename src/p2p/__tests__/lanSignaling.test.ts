import { afterEach, beforeEach, describe, expect, test } from 'vitest';
import WebSocket from 'ws';

const SHOULD_THROW_A_PARTY = process.env.RUN_PEER_SYNC === 'true';
const ROOM_ID = 'lan-party-room';
const HOST_OFFER = 'host-offer:🍹 bring snacks';
const GUEST_ANSWER = 'guest-answer:🕺 arriving with disco lights';
const TIMEOUT_MS = 7000;

let cleanupTasks: Array<() => void> = [];

beforeEach(() => {
  cleanupTasks = [];
});

afterEach(() => {
  for (const task of cleanupTasks) {
    try {
      task();
    } catch (error) {
      console.warn('🧹 Cleanup oops:', error);
    }
  }
  cleanupTasks = [];
});

const withTimeout = async <T>(promise: Promise<T>, label: string): Promise<T> => {
  let timer: NodeJS.Timeout | null = null;
  const wrapped = new Promise<T>((resolve, reject) => {
    timer = setTimeout(() => {
      reject(new Error(`⏰ ${label} took too long. Did somebody unplug the router again?`));
    }, TIMEOUT_MS);

    promise.then(
      (value) => {
        if (timer) clearTimeout(timer);
        resolve(value);
      },
      (error) => {
        if (timer) clearTimeout(timer);
        reject(error);
      },
    );
  });

  return wrapped;
};

const waitForEvent = <T extends string>(socket: WebSocket, event: T, label: string) => withTimeout(
  new Promise<void>((resolve, reject) => {
    const onEvent = () => {
      cleanup();
      resolve();
    };

    const onError = (error: Error) => {
      cleanup();
      reject(new Error(`💥 ${label} exploded: ${error.message}`));
    };

    const cleanup = () => {
      socket.off(event, onEvent);
      socket.off('error', onError);
    };

    socket.once(event, onEvent);
    socket.once('error', onError);
  }),
  label,
);

const waitForMessage = (socket: WebSocket, label: string, predicate: (payload: any) => boolean) => withTimeout(
  new Promise<any>((resolve, reject) => {
    const onMessage = (data: WebSocket.RawData) => {
      try {
        const text = typeof data === 'string' ? data : data.toString();
        const payload = JSON.parse(text);
        if (predicate(payload)) {
          cleanup();
          resolve(payload);
        }
      } catch (error) {
        cleanup();
        reject(new Error(`📄 ${label} sent gibberish: ${(error as Error).message}`));
      }
    };

    const onError = (error: Error) => {
      cleanup();
      reject(new Error(`💥 ${label} tripped a cable: ${error.message}`));
    };

    const cleanup = () => {
      socket.off('message', onMessage);
      socket.off('error', onError);
    };

    socket.on('message', onMessage);
    socket.once('error', onError);
  }),
  label,
);

describe('LAN signaling server (invite-only dance floor)', () => {
  test.skipIf(!SHOULD_THROW_A_PARTY)('LAN handshake (set RUN_PEER_SYNC=true to enable the conga line)', () => {
    console.info('🙈 LAN party test skipped. Set RUN_PEER_SYNC=true when you are ready to boogie.');
  });

  test.runIf(SHOULD_THROW_A_PARTY)('hosts and guests trade dance moves without stepping on toes', async () => {
    console.info('🚀 Spinning up a secret LAN speakeasy for our task sync buddies...');
    const { createSignalingServer } = await import('../../../server/signalingServer.js');
    const instance = createSignalingServer({ port: 0, host: '127.0.0.1' });

    cleanupTasks.push(() => {
      instance.server.close();
    });

    await withTimeout(
      new Promise<void>((resolve, reject) => {
        instance.server.once('listening', () => resolve());
        instance.server.once('error', reject);
      }),
      'Server warmup',
    );

    const address = instance.server.address();
    if (!address || typeof address === 'string') {
      throw new Error('🤔 Could not determine which cosmic port the server picked.');
    }

    const url = `ws://127.0.0.1:${address.port}`;
    console.info(`🎧 LAN speakeasy listening on ${url}.`);

    const hostSocket = new WebSocket(url);
    cleanupTasks.push(() => hostSocket.close());
    await waitForEvent(hostSocket, 'open', 'Host entrance');
    console.info('🧑‍✈️ Host arrived with clipboards and good vibes.');

    hostSocket.send(JSON.stringify({ type: 'register-host', roomId: ROOM_ID }));
    await waitForMessage(hostSocket, 'Host registration', (m) => m.type === 'status' && m.message === 'host-registered');
    console.info('🪩 Host is officially on the dance floor. Broadcasting an offer...');

    hostSocket.send(JSON.stringify({ type: 'update-offer', roomId: ROOM_ID, payload: HOST_OFFER }));

    const guestSocket = new WebSocket(url);
    cleanupTasks.push(() => guestSocket.close());
    await waitForEvent(guestSocket, 'open', 'Guest entrance');
    console.info('🕺 Guest just moonwalked through the door.');

    guestSocket.send(JSON.stringify({ type: 'register-guest', roomId: ROOM_ID }));
    await waitForMessage(guestSocket, 'Guest registration', (m) => m.type === 'status' && m.message === 'guest-registered');

    const offer = await waitForMessage(guestSocket, 'Offer reception', (m) => m.type === 'host-offer');
    expect(offer.payload).toBe(HOST_OFFER);
    console.info('📡 Guest caught the host offer and is crafting a sassy reply.');

    guestSocket.send(JSON.stringify({ type: 'submit-answer', roomId: ROOM_ID, payload: GUEST_ANSWER }));

    const confirmation = await waitForMessage(hostSocket, 'Guest answer delivery', (m) => m.type === 'guest-answer');
    expect(confirmation.payload).toBe(GUEST_ANSWER);

    console.info('✅ The dance-off handshake completed successfully. No toes harmed.');
  });
});
