// WebRTCSession wires a Yjs document over a simple-peer data channel
import type { Buffer } from 'buffer';
import Peer, { SignalData } from 'simple-peer';
import * as Y from 'yjs';
import { TASK_DOC_REMOTE_ORIGIN } from './taskDoc';

export type SessionRole = 'host' | 'guest';
export type SessionState =
  | 'idle'
  | 'waiting-offer'
  | 'waiting-answer'
  | 'connecting'
  | 'connected'
  | 'closed'
  | 'error';

export type SignalKind = 'offer' | 'answer';

export interface SessionCallbacks {
  onStateChange?: (state: SessionState, detail?: string) => void;
  onSignal?: (payload: string, kind: SignalKind) => void;
  onError?: (error: Error) => void;
}

export interface WebRTCSessionOptions {
  role: SessionRole;
  doc: Y.Doc;
  rtcConfig?: RTCConfiguration;
  metadata?: Record<string, unknown>;
}

const REMOTE_DATA_TYPE = 'ydoc-update';

const getBuffer = (): typeof Buffer | null => {
  return (globalThis as any).Buffer || null;
};

const toBase64 = (value: string): string => {
  if (typeof btoa === 'function') return btoa(value);
  const BufferCtor = getBuffer();
  if (BufferCtor) return BufferCtor.from(value, 'utf-8').toString('base64');
  throw new Error('Base64 encoding not supported in this environment');
};

const fromBase64 = (value: string): string => {
  if (typeof atob === 'function') return atob(value);
  const BufferCtor = getBuffer();
  if (BufferCtor) return BufferCtor.from(value, 'base64').toString('utf-8');
  throw new Error('Base64 decoding not supported in this environment');
};

const encodeSignalPayload = (signal: SignalData, metadata?: Record<string, unknown>): string => {
  const payload = { signal, metadata };
  return toBase64(JSON.stringify(payload));
};

const decodeSignalPayload = (payload: string): { signal: SignalData; metadata?: Record<string, unknown> } => {
  try {
    const decoded = JSON.parse(fromBase64(payload));
    if (!decoded || typeof decoded !== 'object') throw new Error('Invalid payload');
    return decoded;
  } catch (error) {
    throw new Error(`Unable to decode pairing payload: ${(error as Error).message}`);
  }
};

const toUint8Array = (chunk: unknown): Uint8Array | null => {
  if (chunk instanceof Uint8Array) return chunk;
  if (chunk instanceof ArrayBuffer) return new Uint8Array(chunk);
  if (Array.isArray(chunk)) return Uint8Array.from(chunk as number[]);
  if (typeof chunk === 'string') return null;
  if (chunk && typeof (chunk as any).buffer !== 'undefined') {
    return new Uint8Array((chunk as any).buffer);
  }
  return null;
};

export class WebRTCSession {
  private peer: Peer.Instance | null = null;
  private state: SessionState = 'idle';
  private readonly options: WebRTCSessionOptions;
  private readonly callbacks: SessionCallbacks;
  private readonly handleDocUpdate: (update: Uint8Array, origin: unknown, doc: Y.Doc) => void;

  constructor(options: WebRTCSessionOptions, callbacks: SessionCallbacks = {}) {
    this.options = options;
    this.callbacks = callbacks;
    this.handleDocUpdate = (update, origin) => {
      if (!this.peer || this.peer.destroyed) return;
      if (origin === TASK_DOC_REMOTE_ORIGIN) return;
      if (!this.peer.connected) return;
      try {
        this.peer.send(update);
      } catch (error) {
        this.callbacks.onError?.(error as Error);
      }
    };

    this.bootstrapPeer();
  }

  getState(): SessionState {
    return this.state;
  }

  signal(payload: string): void {
    if (!this.peer) {
      throw new Error('Session not ready');
    }

    const { signal } = decodeSignalPayload(payload);
    try {
      this.peer.signal(signal);
      if (signal.type === 'answer') {
        this.transition('connecting');
      }
    } catch (error) {
      this.fail(error as Error);
    }
  }

  close(): void {
    this.peer?.destroy();
    this.cleanup();
    this.transition('closed');
  }

  private bootstrapPeer(): void {
    const { role, doc, rtcConfig, metadata } = this.options;
    this.transition(role === 'host' ? 'waiting-answer' : 'waiting-offer');

    this.peer = new Peer({
      initiator: role === 'host',
      trickle: false,
      config: rtcConfig ?? { iceServers: [] },
    });

    doc.on('update', this.handleDocUpdate);

    this.peer.on('signal', data => {
      const kind: SignalKind = data.type === 'answer' ? 'answer' : 'offer';
      this.callbacks.onSignal?.(encodeSignalPayload(data, metadata), kind);
    });

    this.peer.on('connect', () => {
      this.transition('connected');
      try {
        const snapshot = Y.encodeStateAsUpdate(doc);
        this.peer?.send(snapshot);
      } catch (error) {
        this.callbacks.onError?.(error as Error);
      }
    });

    this.peer.on('data', chunk => {
      const payload = toUint8Array(chunk);
      if (!payload) return;
      try {
        Y.applyUpdate(doc, payload, TASK_DOC_REMOTE_ORIGIN);
      } catch (error) {
        this.callbacks.onError?.(error as Error);
      }
    });

    this.peer.on('close', () => {
      this.cleanup();
      this.transition('closed');
    });

    this.peer.on('error', error => {
      this.fail(error);
    });
  }

  private cleanup(): void {
    const { doc } = this.options;
    doc.off('update', this.handleDocUpdate);
    this.peer = null;
  }

  private transition(next: SessionState, detail?: string): void {
    this.state = next;
    this.callbacks.onStateChange?.(next, detail);
  }

  private fail(error: Error): void {
    this.callbacks.onError?.(error);
    this.transition('error', error.message);
  }
}
