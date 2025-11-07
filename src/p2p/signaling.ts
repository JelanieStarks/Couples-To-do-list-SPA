type LanRole = 'host' | 'guest';

type LanSignalingMessage =
  | { type: 'register-host'; roomId: string }
  | { type: 'register-guest'; roomId: string }
  | { type: 'update-offer'; roomId: string; payload: string }
  | { type: 'submit-answer'; roomId: string; payload: string }
  | { type: 'ping' };

type IncomingMessage =
  | { type: 'status'; message: string }
  | { type: 'error'; message: string }
  | { type: 'host-offer'; payload: string }
  | { type: 'guest-answer'; payload: string }
  | { type: 'ping' };

export interface LanSignalingCallbacks {
  onOpen?: () => void;
  onClose?: () => void;
  onError?: (error: Error) => void;
  onHostOffer?: (offer: string) => void;
  onGuestAnswer?: (answer: string) => void;
}

const isWebSocketOpen = (ws: WebSocket | null): ws is WebSocket => {
  return !!ws && ws.readyState === WebSocket.OPEN;
};

const toJson = (payload: LanSignalingMessage): string => JSON.stringify(payload);

const parseMessage = (raw: MessageEvent['data']): IncomingMessage | null => {
  try {
    const text = typeof raw === 'string' ? raw : String(raw);
    const parsed = JSON.parse(text);
    if (!parsed || typeof parsed !== 'object') return null;
    return parsed as IncomingMessage;
  } catch {
    return null;
  }
};

export class LanSignalingClient {
  private readonly url: string;
  private readonly callbacks: LanSignalingCallbacks;
  private ws: WebSocket | null = null;
  private role: LanRole | null = null;
  private roomId: string | null = null;

  constructor(url: string, callbacks: LanSignalingCallbacks = {}) {
    this.url = url;
    this.callbacks = callbacks;
  }

  getRole(): LanRole | null {
    return this.role;
  }

  getRoomId(): string | null {
    return this.roomId;
  }

  connect(role: LanRole, roomId: string): void {
    this.disconnect();
    this.role = role;
    this.roomId = roomId;

    try {
      this.ws = new WebSocket(this.url);
    } catch (error) {
      this.callbacks.onError?.(error as Error);
      return;
    }

    this.ws.onopen = () => {
      this.send(role === 'host' ? { type: 'register-host', roomId } : { type: 'register-guest', roomId });
      this.callbacks.onOpen?.();
    };

    this.ws.onclose = () => {
      this.callbacks.onClose?.();
    };

    this.ws.onerror = () => {
      this.callbacks.onError?.(new Error('LAN signaling connection error'));
    };

    this.ws.onmessage = (event) => {
      const message = parseMessage(event.data);
      if (!message) return;
      if (message.type === 'ping') {
        this.send({ type: 'ping' });
        return;
      }
      if (message.type === 'host-offer') {
        this.callbacks.onHostOffer?.(message.payload);
      } else if (message.type === 'guest-answer') {
        this.callbacks.onGuestAnswer?.(message.payload);
      } else if (message.type === 'error') {
        this.callbacks.onError?.(new Error(message.message));
      }
    };
  }

  disconnect(): void {
    if (this.ws) {
      try {
        this.ws.close();
      } catch {}
    }
    this.ws = null;
  }

  sendOffer(payload: string): void {
    if (!this.roomId || this.role !== 'host') return;
    this.send({ type: 'update-offer', roomId: this.roomId, payload });
  }

  sendAnswer(payload: string): void {
    if (!this.roomId || this.role !== 'guest') return;
    this.send({ type: 'submit-answer', roomId: this.roomId, payload });
  }

  private send(message: LanSignalingMessage): void {
    if (!isWebSocketOpen(this.ws)) return;
    try {
      this.ws!.send(toJson(message));
    } catch (error) {
      this.callbacks.onError?.(error as Error);
    }
  }
}
