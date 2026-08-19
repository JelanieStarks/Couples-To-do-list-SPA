import React, { createContext, useContext, useEffect, useState } from 'react';
import type { Task, Priority, TaskFilter, Assignment } from '../types';
import { storage, STORAGE_KEYS, generateId, isSameLocalDay, parseLocalDate, toLocalDateString } from '../utils';
import { getSyncBaseUrl, deriveRoomId, getLanSignalUrl } from '../config';
import { ServerSync } from '../sync/ServerSync';
import { syncTasksWithGoogle } from '../sync/googleSync';
import { SupabaseSync } from '../sync/supabaseSync';
import {
  TaskDoc,
  TASK_DOC_REMOTE_ORIGIN,
  WebRTCSession,
  type SessionState,
  type SessionRole,
  type SignalKind,
} from '../p2p';
import { LanSignalingClient } from '../p2p/signaling';
import { useAuth } from './AuthContext';
import { getSupabaseClient, isSupabaseSyncEnabled } from '../utils/supabaseClient';
import type { RealtimeChannel } from '@supabase/supabase-js';

// 📝 Task Context - Your digital task manager with a sense of humor
interface PeerSignal {
  kind: SignalKind;
  payload: string;
}

interface PeerSyncState {
  role: SessionRole | null;
  state: SessionState;
  localSignal: PeerSignal | null;
  expectedRemote: SignalKind | null;
  lastError?: string;
}

interface LanSyncState {
  enabled: boolean;
  status: 'idle' | 'connecting' | 'connected' | 'error';
  lastError?: string;
  serverUrl: string | null;
}

interface PeerSyncApi {
  status: PeerSyncState;
  lan: LanSyncState;
  startHosting: (options?: { enableLan?: boolean }) => void;
  joinSession: (offer?: string, options?: { enableLan?: boolean }) => void;
  submitRemoteSignal: (payload: string) => void;
  endSession: () => void;
  enableLan: () => void;
  disableLan: () => void;
  resetError: () => void;
}

interface SupabaseStatus {
  enabled: boolean;
  hasClient: boolean;
  roomId: string | null;
  lastDbUpsertAt?: string;
  lastRealtimeAt?: string;
  lastError?: string;
}

const createDefaultPeerSyncState = (): PeerSyncState => ({
  role: null,
  state: 'idle',
  localSignal: null,
  expectedRemote: null,
  lastError: undefined,
});

const createDefaultLanState = (serverUrl: string | null): LanSyncState => ({
  enabled: false,
  status: 'idle',
  lastError: undefined,
  serverUrl,
});

interface TaskContextType {
  tasks: Task[];
  isLoading: boolean;
  createTask: (task: Omit<Task, 'id' | 'createdAt' | 'updatedAt' | 'createdBy' | 'completedAt' | 'deletedAt'>) => void;
  updateTask: (id: string, updates: Partial<Task>) => void;
  toggleTaskComplete: (id: string) => void;
  softDeleteTask: (id: string) => void;
  restoreTask: (id: string) => void;
  hardDeleteTask: (id: string) => void;
  filterTasks: (filter: TaskFilter) => Task[];
  getTasksByDate: (date: string) => Task[];
  getTodaysTasks: () => Task[];
  getCompletedTasks: () => Task[];
  getDeletedTasks: () => Task[];
  importTasksFromText: (text: string) => Task[];
  moveTaskToDate: (taskId: string, date: string) => void;
  reorderTasksWithinPriority: (priorityPrefix: string, orderedIds: string[]) => void;
  syncNow: () => void;
  peerSync: PeerSyncApi;
  supabaseStatus: SupabaseStatus;
}

const TaskContext = createContext<TaskContextType | undefined>(undefined);

export const useTask = () => {
  const context = useContext(TaskContext);
  if (context === undefined) {
    throw new Error('useTask must be used within a TaskProvider');
  }
  return context;
};

// Added optional initialTasks for deterministic tests (prevents flaky async seeding in tests)
export const TaskProvider: React.FC<{ children: React.ReactNode; initialTasks?: Task[] }> = ({ children, initialTasks }) => {
  const { user, partner, requestMagicLinkForSync } = useAuth();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [cachedPartnerId, setCachedPartnerId] = useState<string | undefined>(() => {
    if (typeof window === 'undefined') return undefined;
    try {
      const stored = storage.get<any>(STORAGE_KEYS.PARTNER);
      return stored?.id as string | undefined;
    } catch {
      return undefined;
    }
  });
  const lanDefaultUrl = React.useMemo(() => getLanSignalUrl(), []);
  // Unique instance id to avoid processing our own broadcasts
  const [instanceId] = useState(() => `taskctx-${Math.random().toString(36).slice(2)}`);
  const bcRef = React.useRef<BroadcastChannel | null>(null);
  const serverSyncRef = React.useRef<ServerSync | null>(null);
  const taskDocRef = React.useRef<TaskDoc | null>(null);
  const lastDocOriginRef = React.useRef<unknown>(null);
  const p2pSessionRef = React.useRef<WebRTCSession | null>(null);
  const lanClientRef = React.useRef<LanSignalingClient | null>(null);
  const [peerSyncStatus, setPeerSyncStatus] = useState<PeerSyncState>(() => createDefaultPeerSyncState());
  const [lanState, setLanState] = useState<LanSyncState>(() => createDefaultLanState(lanDefaultUrl));
  const [lanPreferredRole, setLanPreferredRole] = useState<SessionRole>('guest');
  const lastLanOfferRef = React.useRef<string | null>(null);
  const lastLanAnswerRef = React.useRef<string | null>(null);
  const lastLanRemoteRef = React.useRef<PeerSignal | null>(null);
  const lastSnapshotsRef = React.useRef<{ server: string; storage: string; broadcast: string; supabase: string }>({ server: '', storage: '', broadcast: '', supabase: '' });
  const supabase = React.useMemo(() => getSupabaseClient(), []);
  const supabaseSyncEnabled = React.useMemo(() => isSupabaseSyncEnabled(), []);
  const supabaseChannelRef = React.useRef<RealtimeChannel | null>(null);
  const supabaseReadyRef = React.useRef(false);
  const lastSupabaseFingerprintRef = React.useRef<string>('');
  const supabaseDbSyncRef = React.useRef<SupabaseSync | null>(null);
  const lastSupabaseDbFingerprintRef = React.useRef<string>('');
  const [supabaseStatus, setSupabaseStatus] = useState<SupabaseStatus>(() => ({
    enabled: supabaseSyncEnabled,
    hasClient: Boolean(supabase),
    roomId: null,
  }));

  if (!taskDocRef.current) {
    let seedTasks: Task[] = [];
    if (initialTasks?.length) {
      seedTasks = initialTasks;
    } else if (typeof window !== 'undefined') {
      seedTasks = storage.get<Task[]>(STORAGE_KEYS.TASKS) ?? [];
    }
    taskDocRef.current = new TaskDoc({ initialTasks: seedTasks });
  }

  React.useEffect(() => {
    if (partner?.id) {
      setCachedPartnerId(partner.id);
      return;
    }
    if (typeof window === 'undefined') {
      setCachedPartnerId(undefined);
      return;
    }
    try {
      const stored = storage.get<any>(STORAGE_KEYS.PARTNER);
      setCachedPartnerId(stored?.id as string | undefined);
    } catch {
      setCachedPartnerId(undefined);
    }
  }, [partner?.id]);

  const partnerId = partner?.id ?? cachedPartnerId;
  const roomId = React.useMemo(() => deriveRoomId(user?.id, partnerId), [user?.id, partnerId]);

  useEffect(() => {
    setSupabaseStatus(prev => ({
      ...prev,
      enabled: supabaseSyncEnabled,
      hasClient: Boolean(supabase),
      roomId: roomId ?? null,
    }));
  }, [supabaseSyncEnabled, supabase, roomId]);

  useEffect(() => {
    const taskDoc = taskDocRef.current;
    if (!taskDoc) return;
    const unsubscribe = taskDoc.subscribe(next => {
      setTasks(next);
      setIsLoading(false);
    });
    return () => {
      unsubscribe();
    };
  }, []);

  useEffect(() => {
    const doc = taskDocRef.current?.getDoc();
    if (!doc) return;
    const trackOrigin = (_update: Uint8Array, origin: unknown) => {
      lastDocOriginRef.current = origin;
    };
    doc.on('update', trackOrigin);
    return () => {
      doc.off('update', trackOrigin);
    };
  }, []);

  useEffect(() => {
    const taskDoc = taskDocRef.current;
    if (!taskDoc) return;

    const baseUrl = getSyncBaseUrl();

    if (serverSyncRef.current) {
      serverSyncRef.current.close();
      serverSyncRef.current = null;
    }

    if (!baseUrl || !roomId) {
      return;
    }

    const ss = new ServerSync(baseUrl, roomId, instanceId);
    serverSyncRef.current = ss;
    let cancelled = false;

    const handleRemoteTasks = (remoteTasks: Task[]) => {
      if (cancelled) return;
      const incoming = fingerprintTasks(remoteTasks);
      if (incoming === lastSnapshotsRef.current.server) return;
      taskDoc.replaceAllFromExternal(remoteTasks);
      lastSnapshotsRef.current.server = fingerprintTasks(taskDoc.getTasks());
    };

    const connect = async () => {
      try {
        await ss.connect(handleRemoteTasks);
        const remoteSnapshot = await ss.fetchTasks();
        if (!cancelled && remoteSnapshot.length > 0) {
          const incoming = fingerprintTasks(remoteSnapshot);
          if (incoming !== lastSnapshotsRef.current.server) {
            taskDoc.replaceAllFromExternal(remoteSnapshot);
            lastSnapshotsRef.current.server = fingerprintTasks(taskDoc.getTasks());
          }
        }
      } catch (error) {
        console.warn('[TaskProvider] server sync bootstrap failed', error);
      }
    };

    void connect();

    return () => {
      cancelled = true;
      ss.close();
      if (serverSyncRef.current === ss) {
        serverSyncRef.current = null;
      }
    };
  }, [instanceId, roomId]);

  // Supabase realtime broadcast channel (flagged)
  useEffect(() => {
    if (!supabaseSyncEnabled || !supabase || !roomId) return;
    const channel = supabase.channel(`tasks-${roomId}`);
    supabaseChannelRef.current = channel;
    let active = true;

    channel.on('broadcast', { event: 'tasks-sync' }, payload => {
      if (!active) return;
      const data = payload?.payload as { tasks?: Task[]; fingerprint?: string };
      if (!data || !Array.isArray(data.tasks)) return;
      const incomingFp = data.fingerprint || fingerprintTasks(data.tasks);
      if (incomingFp === lastSupabaseFingerprintRef.current) return;
      const taskDoc = taskDocRef.current;
      if (!taskDoc) return;
      const currentFp = fingerprintTasks(taskDoc.getTasks());
      if (incomingFp === currentFp) return;
      taskDoc.replaceAllFromExternal(data.tasks);
      lastSupabaseFingerprintRef.current = fingerprintTasks(taskDoc.getTasks());
      lastSnapshotsRef.current.supabase = lastSupabaseFingerprintRef.current;
      setSupabaseStatus(prev => ({ ...prev, lastRealtimeAt: new Date().toISOString() }));
    });

    channel.subscribe(status => {
      if (status === 'SUBSCRIBED') {
        supabaseReadyRef.current = true;
        setSupabaseStatus(prev => ({ ...prev, lastError: undefined }));
      }
    });

    return () => {
      active = false;
      supabaseReadyRef.current = false;
      channel.unsubscribe();
      if (supabaseChannelRef.current === channel) {
        supabaseChannelRef.current = null;
      }
    };
  }, [supabaseSyncEnabled, supabase, roomId]);

  // Supabase DB sync (flagged)
  useEffect(() => {
    if (!supabaseSyncEnabled || !supabase || !roomId) return;
    const taskDoc = taskDocRef.current;
    if (!taskDoc) return;
    const sync = new SupabaseSync(roomId);
    supabaseDbSyncRef.current = sync;
    let cancelled = false;

    const hydrate = async () => {
      const remote = await sync.fetchTasks();
      if (cancelled) return;
      if (!remote.length) return;
      const fp = fingerprintTasks(remote);
      if (fp !== lastSupabaseDbFingerprintRef.current) {
        taskDoc.replaceAllFromExternal(remote);
        lastSupabaseDbFingerprintRef.current = fingerprintTasks(taskDoc.getTasks());
        lastSnapshotsRef.current.supabase = lastSupabaseDbFingerprintRef.current;
      }
    };

    void hydrate();

    const unsubscribe = sync.subscribe(remoteTasks => {
      if (cancelled) return;
      const fp = fingerprintTasks(remoteTasks);
      if (fp === lastSupabaseDbFingerprintRef.current) return;
      const taskDocNow = taskDocRef.current;
      if (!taskDocNow) return;
      taskDocNow.replaceAllFromExternal(remoteTasks);
      lastSupabaseDbFingerprintRef.current = fingerprintTasks(taskDocNow.getTasks());
      lastSnapshotsRef.current.supabase = lastSupabaseDbFingerprintRef.current;
    });

    return () => {
      cancelled = true;
      unsubscribe();
      if (supabaseDbSyncRef.current === sync) {
        supabaseDbSyncRef.current = null;
      }
    };
  }, [supabaseSyncEnabled, supabase, roomId]);

  // Save tasks to localStorage whenever tasks change and push to server if connected
  useEffect(() => {
    if (isLoading) {
      return;
    }

    storage.set(STORAGE_KEYS.TASKS, tasks);
    lastSnapshotsRef.current.storage = fingerprintTasks(tasks);

    // Broadcast change to other tabs/windows so passive listeners stay in sync
    try {
      if (!bcRef.current && typeof BroadcastChannel !== 'undefined') {
        bcRef.current = new BroadcastChannel('tasks-sync');
      }
      bcRef.current?.postMessage({
        type: 'tasks-updated',
        sourceId: instanceId,
        updatedAt: Date.now(),
        tasks,
      });
    } catch {}

    // Push to server unless the change originated remotely
    try {
      if (lastDocOriginRef.current !== TASK_DOC_REMOTE_ORIGIN) {
        serverSyncRef.current?.pushTasks(tasks);
      }
    } catch {}

    // Supabase DB upsert (flagged)
    try {
      if (supabaseSyncEnabled && supabaseDbSyncRef.current && lastDocOriginRef.current !== TASK_DOC_REMOTE_ORIGIN) {
        const fp = fingerprintTasks(tasks);
        if (fp !== lastSupabaseDbFingerprintRef.current) {
          lastSupabaseDbFingerprintRef.current = fp;
          lastSnapshotsRef.current.supabase = fp;
          setSupabaseStatus(prev => ({ ...prev, lastDbUpsertAt: new Date().toISOString(), lastError: undefined }));
          void supabaseDbSyncRef.current.upsertTasks(tasks);
        }
      }
    } catch {}

    // Supabase realtime broadcast (flagged)
    try {
      if (
        supabaseSyncEnabled &&
        supabaseReadyRef.current &&
        supabaseChannelRef.current &&
        lastDocOriginRef.current !== TASK_DOC_REMOTE_ORIGIN
      ) {
        const fp = fingerprintTasks(tasks);
        if (fp !== lastSupabaseFingerprintRef.current) {
          lastSupabaseFingerprintRef.current = fp;
          lastSnapshotsRef.current.supabase = fp;
          void supabaseChannelRef.current.send({
            type: 'broadcast',
            event: 'tasks-sync',
            payload: { tasks, fingerprint: fp },
          });
        }
      }
    } catch {}

    lastDocOriginRef.current = null;
  }, [tasks, isLoading, instanceId]);

  // Handle external changes via BroadcastChannel and storage events
  useEffect(() => {
    const taskDoc = taskDocRef.current;
    // BroadcastChannel listener
    let bc: BroadcastChannel | null = null;
    if (typeof BroadcastChannel !== 'undefined') {
      try {
        bc = new BroadcastChannel('tasks-sync');
        bc.onmessage = (ev: MessageEvent) => {
          const data = ev.data as { type?: string; sourceId?: string; tasks?: Task[] };
          if (!data || data.type !== 'tasks-updated') return;
          if (data.sourceId === instanceId) return;
          if (Array.isArray(data.tasks) && taskDoc) {
            const incoming = fingerprintTasks(data.tasks);
            if (incoming !== lastSnapshotsRef.current.broadcast) {
              taskDoc.replaceAllFromExternal(data.tasks);
              lastSnapshotsRef.current.broadcast = fingerprintTasks(taskDoc.getTasks());
            }
          }
        };
      } catch {}
    }

    const onStorage = (e: StorageEvent) => {
      if (e.key !== STORAGE_KEYS.TASKS || !taskDoc) return;
      try {
        const next = e.newValue ? (JSON.parse(e.newValue) as Task[]) : [];
        const incoming = fingerprintTasks(next);
        if (incoming !== lastSnapshotsRef.current.storage) {
          taskDoc.replaceAllFromExternal(next);
          lastSnapshotsRef.current.storage = fingerprintTasks(taskDoc.getTasks());
        }
      } catch {}
    };
    window.addEventListener('storage', onStorage);

    return () => {
      window.removeEventListener('storage', onStorage);
      if (bc) {
        try { bc.close(); } catch {}
      }
    };
  }, [instanceId]);

  const resetPeerSyncState = React.useCallback(() => {
    setPeerSyncStatus(createDefaultPeerSyncState());
  }, []);

  const destroySession = React.useCallback(() => {
    if (p2pSessionRef.current) {
      try {
        p2pSessionRef.current.close();
      } catch {}
    }
    p2pSessionRef.current = null;
    lastLanOfferRef.current = null;
    lastLanAnswerRef.current = null;
    lastLanRemoteRef.current = null;
  }, []);

  const createSession = React.useCallback((role: SessionRole): WebRTCSession => {
    const taskDoc = taskDocRef.current;
    if (!taskDoc) {
      throw new Error('Task document is not ready');
    }

    destroySession();

    const doc = taskDoc.getDoc();
    const session = new WebRTCSession({ role, doc, metadata: { roomId } }, {
      onStateChange: (state, detail) => {
        setPeerSyncStatus(prev => {
          if (state === 'closed') {
            if (p2pSessionRef.current === session) {
              p2pSessionRef.current = null;
            }
            lastLanOfferRef.current = null;
            lastLanAnswerRef.current = null;
            lastLanRemoteRef.current = null;
            return createDefaultPeerSyncState();
          }
          if (state === 'error') {
            return { ...prev, state, lastError: detail ?? prev.lastError };
          }
          return { ...prev, state };
        });
      },
      onSignal: (payload, kind) => {
        setPeerSyncStatus(prev => ({
          ...prev,
          localSignal: { kind, payload },
          expectedRemote: kind === 'offer' ? 'answer' : prev.expectedRemote,
        }));
      },
      onError: (error) => {
        setPeerSyncStatus(prev => ({ ...prev, state: 'error', lastError: error.message }));
      },
    });

    p2pSessionRef.current = session;
    lastLanOfferRef.current = null;
    lastLanAnswerRef.current = null;
    lastLanRemoteRef.current = null;

    setPeerSyncStatus({
      role,
      state: role === 'host' ? 'waiting-answer' : 'waiting-offer',
      localSignal: null,
      expectedRemote: role === 'host' ? 'answer' : null,
      lastError: undefined,
    });

    return session;
  }, [destroySession, roomId]);

  const applyRemoteSignal = React.useCallback((payload: string, source: 'manual' | 'lan' = 'manual') => {
    const trimmed = (payload || '').trim();
    if (!trimmed) return;

    const session = p2pSessionRef.current;
    if (!session) {
      setPeerSyncStatus(prev => ({ ...prev, lastError: 'No active session to receive the signal.' }));
      return;
    }

    try {
      session.signal(trimmed);
      setPeerSyncStatus(prev => ({
        ...prev,
        expectedRemote: null,
        lastError: undefined,
      }));
      if (source === 'lan') {
        lastLanRemoteRef.current = { kind: 'answer', payload: trimmed };
      }
    } catch (error) {
      setPeerSyncStatus(prev => ({
        ...prev,
        state: 'error',
        lastError: (error as Error).message,
      }));
    }
  }, []);

  const handleLanHostOffer = React.useCallback((offer: string) => {
    const trimmed = (offer || '').trim();
    if (!trimmed) return;
    if (!lanState.enabled) return;
    if (peerSyncStatus.role === 'host') return;
    if (lastLanOfferRef.current === trimmed) return;
    lastLanOfferRef.current = trimmed;

    let session = p2pSessionRef.current;
    if (!session || peerSyncStatus.role !== 'guest') {
      try {
        session = createSession('guest');
        setLanPreferredRole('guest');
      } catch (error) {
        setPeerSyncStatus(prev => ({ ...prev, state: 'error', lastError: (error as Error).message }));
        return;
      }
    }

    try {
      session.signal(trimmed);
      setPeerSyncStatus(prev => ({ ...prev, state: 'connecting', lastError: undefined }));
    } catch (error) {
      setPeerSyncStatus(prev => ({ ...prev, state: 'error', lastError: (error as Error).message }));
    }
  }, [lanState.enabled, peerSyncStatus.role, createSession]);

  const handleLanGuestAnswer = React.useCallback((answer: string) => {
    const trimmed = (answer || '').trim();
    if (!trimmed) return;
    if (peerSyncStatus.role !== 'host') return;
    if (peerSyncStatus.expectedRemote !== 'answer') return;
    if (lastLanRemoteRef.current?.payload === trimmed) return;
    applyRemoteSignal(trimmed, 'lan');
  }, [peerSyncStatus.role, peerSyncStatus.expectedRemote, applyRemoteSignal]);

  const lanEnabled = lanState.enabled;
  const lanUrl = lanState.serverUrl ?? lanDefaultUrl ?? null;
  const lanRole = peerSyncStatus.role ?? lanPreferredRole;

  useEffect(() => {
    if (!lanEnabled) {
      if (lanClientRef.current) {
        lanClientRef.current.disconnect();
        lanClientRef.current = null;
      }
      setLanState(prev => ({ ...prev, status: 'idle' }));
      return;
    }

    if (!roomId) {
      setLanState(prev => ({ ...prev, status: 'error', lastError: 'Room id unavailable for LAN sync.' }));
      return;
    }

    if (!lanUrl) {
      setLanState(prev => ({ ...prev, status: 'error', lastError: 'LAN signaling URL not configured.' }));
      return;
    }

    let active = true;
    const client = new LanSignalingClient(lanUrl, {
      onOpen: () => {
        if (!active) return;
        setLanState(prev => ({ ...prev, status: 'connected', lastError: undefined }));
      },
      onClose: () => {
        if (!active) return;
        setLanState(prev => ({ ...prev, status: 'idle' }));
      },
      onError: (error: Error) => {
        if (!active) return;
        setLanState(prev => ({ ...prev, status: 'error', lastError: error.message }));
      },
      onHostOffer: (offer: string) => {
        if (!active) return;
        handleLanHostOffer(offer);
      },
      onGuestAnswer: (answer: string) => {
        if (!active) return;
        handleLanGuestAnswer(answer);
      },
    });
    lanClientRef.current = client;
    setLanState(prev => ({ ...prev, status: 'connecting', lastError: undefined }));
    client.connect(lanRole, roomId);

    return () => {
      active = false;
      client.disconnect();
      if (lanClientRef.current === client) {
        lanClientRef.current = null;
      }
    };
  }, [lanEnabled, lanUrl, lanRole, roomId, handleLanHostOffer, handleLanGuestAnswer]);

  useEffect(() => {
    if (!lanState.enabled) return;
    const signal = peerSyncStatus.localSignal;
    if (!signal) return;
    const client = lanClientRef.current;
    if (!client) return;

    if (peerSyncStatus.role === 'host' && signal.kind === 'offer') {
      if (lastLanOfferRef.current === signal.payload) return;
      lastLanOfferRef.current = signal.payload;
      client.sendOffer(signal.payload);
    } else if (peerSyncStatus.role === 'guest' && signal.kind === 'answer') {
      if (lastLanAnswerRef.current === signal.payload) return;
      lastLanAnswerRef.current = signal.payload;
      client.sendAnswer(signal.payload);
    }
  }, [peerSyncStatus.localSignal, peerSyncStatus.role, lanState.enabled]);

  useEffect(() => {
    if (lanState.enabled && !roomId) {
      setLanState(prev => ({ ...prev, enabled: false, status: 'error', lastError: 'Room id unavailable for LAN sync.' }));
      if (lanClientRef.current) {
        lanClientRef.current.disconnect();
        lanClientRef.current = null;
      }
    }
  }, [lanState.enabled, roomId]);

  const enableLan = React.useCallback(() => {
    if (lanState.enabled) return;
    if (!roomId) {
      setLanState(prev => ({ ...prev, status: 'error', lastError: 'Room id unavailable for LAN sync.' }));
      return;
    }
    setLanState(prev => ({ ...prev, enabled: true, lastError: undefined }));
  }, [lanState.enabled, roomId]);

  const disableLan = React.useCallback(() => {
    if (lanClientRef.current) {
      lanClientRef.current.disconnect();
      lanClientRef.current = null;
    }
    setLanState(() => createDefaultLanState(lanDefaultUrl));
  }, [lanDefaultUrl]);

  const startHosting = React.useCallback((options?: { enableLan?: boolean }) => {
    setLanPreferredRole('host');
    try {
      createSession('host');
      if (options?.enableLan) {
        enableLan();
      }
    } catch (error) {
      setPeerSyncStatus(prev => ({ ...prev, state: 'error', lastError: (error as Error).message }));
    }
  }, [createSession, enableLan]);

  const joinSession = React.useCallback((offer?: string, options?: { enableLan?: boolean }) => {
    setLanPreferredRole('guest');
    try {
      const session = createSession('guest');
      if (options?.enableLan) {
        enableLan();
      }
      if (offer && offer.trim()) {
        try {
          session.signal(offer.trim());
          setPeerSyncStatus(prev => ({ ...prev, state: 'connecting', lastError: undefined }));
        } catch (error) {
          setPeerSyncStatus(prev => ({ ...prev, state: 'error', lastError: (error as Error).message }));
        }
      }
    } catch (error) {
      setPeerSyncStatus(prev => ({ ...prev, state: 'error', lastError: (error as Error).message }));
    }
  }, [createSession, enableLan]);

  const submitRemoteSignal = React.useCallback((payload: string) => {
    applyRemoteSignal(payload, 'manual');
  }, [applyRemoteSignal]);

  const endSession = React.useCallback(() => {
    destroySession();
    resetPeerSyncState();
    setLanPreferredRole('guest');
  }, [destroySession, resetPeerSyncState]);

  const resetPeerError = React.useCallback(() => {
    setPeerSyncStatus(prev => ({ ...prev, lastError: undefined }));
    setLanState(prev => ({ ...prev, lastError: undefined }));
  }, []);

  const syncNow = async () => {
    const taskDoc = taskDocRef.current;
    if (!taskDoc) return;

    await requestMagicLinkForSync();

    if (serverSyncRef.current) {
      const remote = await serverSyncRef.current.fetchTasks();
      const incoming = fingerprintTasks(remote);
      if (incoming !== lastSnapshotsRef.current.server) {
        taskDoc.replaceAllFromExternal(remote);
        lastSnapshotsRef.current.server = fingerprintTasks(taskDoc.getTasks());
      }
    } else if (typeof window !== 'undefined') {
      const savedTasks = storage.get<Task[]>(STORAGE_KEYS.TASKS) ?? [];
      const incoming = fingerprintTasks(savedTasks);
      if (incoming !== lastSnapshotsRef.current.storage) {
        taskDoc.replaceAllFromExternal(savedTasks);
        lastSnapshotsRef.current.storage = fingerprintTasks(taskDoc.getTasks());
      }
    }

    const settings = (typeof window !== 'undefined' ? storage.get<any>(STORAGE_KEYS.SETTINGS) : null) || {};
    const googleSettings = settings.googleCalendar || {};
    if (googleSettings.syncEnabled && googleSettings.connectStatus === 'ready') {
      await syncTasksWithGoogle(taskDoc.getTasks(), {
        syncEnabled: googleSettings.syncEnabled,
        connectStatus: googleSettings.connectStatus,
        accountEmail: googleSettings.accountEmail,
        userId: user?.id,
      });
    }
  };

  const createTask = (taskData: Omit<Task, 'id' | 'createdAt' | 'updatedAt' | 'createdBy' | 'completedAt' | 'deletedAt'>): void => {
    if (!user) return;
    const taskDoc = taskDocRef.current;
    if (!taskDoc) return;

    const now = new Date().toISOString();
    const nextOrder = taskDoc.getNextOrderForPriority(taskData.priority);
    const newTask: Task = {
      ...taskData,
      id: generateId(),
      createdBy: user.id,
      createdAt: now,
      updatedAt: now,
      order: nextOrder,
    };

    taskDoc.upsert(newTask);
  };
  // Reorder tasks inside a priority bucket (e.g., all A* priorities) based on new ordered id list
  const reorderTasksWithinPriority = (priorityPrefix: string, orderedIds: string[]) => {
    const taskDoc = taskDocRef.current;
    if (!taskDoc) return;

    const now = new Date().toISOString();
    taskDoc.runLocalTransaction(map => {
      orderedIds.forEach((id, index) => {
        const task = map.get(id);
        if (!task) return;
        if (!task.priority.startsWith(priorityPrefix)) return;
        map.set(id, { ...task, order: index + 1, updatedAt: now });
      });
    });
  };

  const updateTask = (id: string, updates: Partial<Task>): void => {
    const taskDoc = taskDocRef.current;
    if (!taskDoc) return;
    const now = new Date().toISOString();
    taskDoc.update(id, current => {
      if (!current) return current;
      return { ...current, ...updates, updatedAt: now };
    });
  };

  const softDeleteTask = (id: string): void => {
    const taskDoc = taskDocRef.current;
    if (!taskDoc) return;
    const now = new Date().toISOString();
    taskDoc.update(id, current => {
      if (!current) return current;
      return { ...current, deletedAt: now };
    });
  };

  const restoreTask = (id: string): void => {
    const taskDoc = taskDocRef.current;
    if (!taskDoc) return;
    taskDoc.update(id, current => {
      if (!current) return current;
      if (current.deletedAt === undefined) return current;
      return { ...current, deletedAt: undefined };
    });
  };

  const hardDeleteTask = (id: string): void => {
    taskDocRef.current?.delete(id);
  };

  const toggleTaskComplete = (id: string): void => {
    const taskDoc = taskDocRef.current;
    if (!taskDoc) return;
    const now = new Date().toISOString();
    taskDoc.update(id, current => {
      if (!current) return current;
      const completed = !current.completed;
      return {
        ...current,
        completed,
        completedAt: completed ? now : undefined,
        updatedAt: now,
      };
    });
  };

  const filterTasks = (filter: TaskFilter): Task[] => {
    return tasks.filter(task => {
      if (task.deletedAt) return false;
      if (filter.priority && task.priority !== filter.priority) return false;
      if (filter.completed !== undefined && task.completed !== filter.completed) return false;
      if (filter.createdBy && task.createdBy !== filter.createdBy) return false;

      if (filter.dateRange) {
        const taskDate = task.scheduledDate || task.createdAt;
        if (taskDate < filter.dateRange.start || taskDate > filter.dateRange.end) return false;
      }

      return true;
    });
  };

  const tasksByDateCache = React.useMemo(() => {
    const cache = new Map<string, Task[]>();
    return (date: string) => {
      if (cache.has(date)) return cache.get(date)!;
      const result = buildTasksByDate(tasks, date);
      cache.set(date, result);
      return result;
    };
  }, [tasks]);

  const todaysTasksMemo = React.useMemo(() => buildTodaysTasks(tasks), [tasks]);
  const completedTasksMemo = React.useMemo(() => buildCompletedTasks(tasks), [tasks]);
  const deletedTasksMemo = React.useMemo(() => buildDeletedTasks(tasks), [tasks]);

  const getTasksByDate = React.useCallback((date: string): Task[] => tasksByDateCache(date), [tasksByDateCache]);
  const getTodaysTasks = React.useCallback((): Task[] => todaysTasksMemo, [todaysTasksMemo]);
  const getCompletedTasks = React.useCallback((): Task[] => completedTasksMemo, [completedTasksMemo]);
  const getDeletedTasks = React.useCallback((): Task[] => deletedTasksMemo, [deletedTasksMemo]);

  const moveTaskToDate = (taskId: string, date: string): void => {
    updateTask(taskId, { scheduledDate: date });
  };

  // Import tasks from AI-generated text using --- delimiter
  const importTasksFromText = (text: string): Task[] => {
    if (!user) return [];
    const taskDoc = taskDocRef.current;
    if (!taskDoc) return [];

    const sections = text.split('---').map(section => section.trim()).filter(Boolean);
    const importedTasks: Task[] = [];

    sections.forEach(section => {
      const lines = section.split('\n').map(line => line.trim()).filter(Boolean);

      lines.forEach(line => {
        // Parse different formats:
        // - [A1] Task title: description
        // - A1 Task title (assigned to: Me) [Day, time]
        // - Priority A2: Task title
        // - Task title (Priority: B3)
        // - Simple task title

        let priority: Priority = 'C1'; // Default priority
        let assignment: Assignment = 'me'; // Default assignment
        let title = line;
        let description = '';
        let dayOfWeek = '';
        let scheduledTime = '';

        // First, try to match the exact format: "A1 Task title (assigned to: Me) [Day, time]"
        const exactFormatMatch = line.match(/^([ABCD][123]?)\s+(.+?)(?:\s+\(assigned to:\s*(Me|Partner|Both)\))?(?:\s+\[([^\]]+)\])?$/i);
        if (exactFormatMatch) {
          const priorityStr = exactFormatMatch[1].toUpperCase();
          priority = (priorityStr.length === 1 ? priorityStr + '1' : priorityStr) as Priority;
          title = exactFormatMatch[2].trim();
          if (exactFormatMatch[3]) {
            assignment = exactFormatMatch[3].toLowerCase() as Assignment;
          }
          if (exactFormatMatch[4]) {
            const dayTimeStr = exactFormatMatch[4];
            const dayTimeMatch = dayTimeStr.match(/^(Monday|Tuesday|Wednesday|Thursday|Friday|Saturday|Sunday)(?:,\s*(.+))?$/i);
            if (dayTimeMatch) {
              dayOfWeek = dayTimeMatch[1];
              scheduledTime = dayTimeMatch[2]?.trim() || '';
            }
          }
        } else {
          // Fallback to individual parsing methods

          // Match [A1], [B2], [C3], [D] format
          const priorityMatch = line.match(/^\[([ABCD][123]?)\]\s*(.+)/);
          if (priorityMatch) {
            const priorityStr = priorityMatch[1];
            // Normalize single letter priorities to level 1
            priority = (priorityStr.length === 1 ? priorityStr + '1' : priorityStr) as Priority;
            title = priorityMatch[2];
          }

          // Match "Priority A2:" format
          const priorityMatch2 = line.match(/^Priority\s+([ABCD][123]?):\s*(.+)/i);
          if (priorityMatch2) {
            const priorityStr = priorityMatch2[1].toUpperCase();
            priority = (priorityStr.length === 1 ? priorityStr + '1' : priorityStr) as Priority;
            title = priorityMatch2[2];
          }

          // Match "(Priority: B3)" format
          const priorityMatch3 = line.match(/^(.+)\s*\(Priority:\s*([ABCD][123]?)\)/i);
          if (priorityMatch3) {
            title = priorityMatch3[1];
            const priorityStr = priorityMatch3[2].toUpperCase();
            priority = (priorityStr.length === 1 ? priorityStr + '1' : priorityStr) as Priority;
          }

          // Parse assignment from title
          const assignmentMatch = title.match(/\(assigned to:\s*(Me|Partner|Both)\)/i);
          if (assignmentMatch) {
            assignment = assignmentMatch[1].toLowerCase() as Assignment;
            title = title.replace(/\(assigned to:\s*(Me|Partner|Both)\)/i, '').trim();
          }

          // Parse day and time from title
          const dayTimeMatch = title.match(/\[(Monday|Tuesday|Wednesday|Thursday|Friday|Saturday|Sunday)(?:,\s*(.+?))?\]/i);
          if (dayTimeMatch) {
            dayOfWeek = dayTimeMatch[1];
            scheduledTime = dayTimeMatch[2] || '';
            title = title.replace(/\[(Monday|Tuesday|Wednesday|Thursday|Friday|Saturday|Sunday)(?:,\s*.+?)?\]/i, '').trim();
          }
        }

        // Split title and description on colon
        const titleParts = title.split(':');
        if (titleParts.length > 1) {
          title = titleParts[0].trim();
          description = titleParts.slice(1).join(':').trim();
        }

        // Clean up bullet points and numbering
        title = title.replace(/^[-*•]\s*/, '').replace(/^\d+\.\s*/, '').trim();

        if (title) {
          const now = new Date().toISOString();

          // Calculate scheduledDate based on dayOfWeek
          let scheduledDate = '';
          if (dayOfWeek) {
            const today = new Date();
            const currentDay = today.getDay(); // 0 = Sunday, 1 = Monday, etc.
            const targetDay = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'].indexOf(dayOfWeek);
            const daysUntilTarget = (targetDay - currentDay + 7) % 7;
            const targetDate = new Date(today);
            targetDate.setDate(today.getDate() + (daysUntilTarget === 0 ? 7 : daysUntilTarget)); // If today, schedule for next week
            scheduledDate = toLocalDateString(targetDate);
          }

          const task: Task = {
            id: generateId(),
            title,
            description: description || undefined,
            priority,
            assignment,
            color: getDefaultColorForAssignment(assignment, user),
            completed: false,
            createdBy: user.id,
            scheduledDate: scheduledDate || undefined,
            scheduledTime: scheduledTime || undefined,
            dayOfWeek: dayOfWeek || undefined,
            createdAt: now,
            updatedAt: now,
          };

          importedTasks.push(task);
        }
      });
    });

    // Add imported tasks to the current task list via the shared document
    importedTasks.forEach(task => {
      taskDoc.upsert(task);
    });

    return importedTasks;
  };

  const peerSyncApi: PeerSyncApi = React.useMemo(() => ({
    status: peerSyncStatus,
    lan: lanState,
    startHosting,
    joinSession,
    submitRemoteSignal,
    endSession,
    enableLan,
    disableLan,
    resetError: resetPeerError,
  }), [peerSyncStatus, lanState, startHosting, joinSession, submitRemoteSignal, endSession, enableLan, disableLan, resetPeerError]);

  const value: TaskContextType = {
    tasks,
    isLoading,
    createTask,
    updateTask,
    toggleTaskComplete,
    softDeleteTask,
    restoreTask,
    hardDeleteTask,
    filterTasks,
    getTasksByDate,
    getTodaysTasks,
    getCompletedTasks,
    getDeletedTasks,
    importTasksFromText,
    moveTaskToDate,
    reorderTasksWithinPriority,
    syncNow,
    peerSync: peerSyncApi,
    supabaseStatus,
  };

  return <TaskContext.Provider value={value}>{children}</TaskContext.Provider>;
};

// Pure helpers for memoized selectors
const buildTasksByDate = (tasks: Task[], date: string): Task[] => {
  const target = parseLocalDate(date);
  return tasks.filter(task => {
    if (task.deletedAt) return false;
    const startDateStr = task.scheduledDate ? task.scheduledDate : toLocalDateString(new Date(task.createdAt));
    const start = parseLocalDate(startDateStr);
    if (task.repeat === 'daily') {
      return toLocalDateString(target) >= toLocalDateString(start);
    }
    return isSameLocalDay(start, target);
  });
};

const buildTodaysTasks = (tasks: Task[]): Task[] => {
  const today = new Date();
  return tasks
    .filter(task => {
      if (task.deletedAt) return false;
      if (task.repeat === 'daily') {
        const startDateStr = task.scheduledDate ? task.scheduledDate : toLocalDateString(new Date(task.createdAt));
        return toLocalDateString(today) >= startDateStr;
      }
      const taskDateStr = task.scheduledDate ? task.scheduledDate : toLocalDateString(new Date(task.createdAt));
      return isSameLocalDay(parseLocalDate(taskDateStr), today);
    })
    .sort((a, b) => {
      const priorityOrder = { A1: 10, A2: 9, A3: 8, B1: 7, B2: 6, B3: 5, C1: 4, C2: 3, C3: 2, D: 1 } as const;
      const priorityDiff = priorityOrder[b.priority] - priorityOrder[a.priority];
      if (priorityDiff !== 0) return priorityDiff;
      if (a.order && b.order && a.order !== b.order) return a.order - b.order;
      return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
    });
};

const buildCompletedTasks = (tasks: Task[]): Task[] => {
  return tasks
    .filter(t => t.completed && !t.deletedAt)
    .sort((a, b) => {
      const aCompleted = a.completedAt ? new Date(a.completedAt).getTime() : 0;
      const bCompleted = b.completedAt ? new Date(b.completedAt).getTime() : 0;
      if (bCompleted !== aCompleted) return bCompleted - aCompleted;
      const aUpdated = new Date(a.updatedAt).getTime();
      const bUpdated = new Date(b.updatedAt).getTime();
      if (bUpdated !== aUpdated) return bUpdated - aUpdated;
      const aIndex = tasks.findIndex(t => t.id === a.id);
      const bIndex = tasks.findIndex(t => t.id === b.id);
      return bIndex - aIndex;
    });
};

const buildDeletedTasks = (tasks: Task[]): Task[] => {
  return tasks
    .filter(t => t.deletedAt)
    .sort((a, b) => {
      const ad = a.deletedAt ? new Date(a.deletedAt).getTime() : 0;
      const bd = b.deletedAt ? new Date(b.deletedAt).getTime() : 0;
      return bd - ad;
    });
};

const fingerprintTasks = (tasks: Task[]): string => {
  if (!tasks.length) return 'len:0';
  const sorted = [...tasks].sort((a, b) => a.id.localeCompare(b.id));
  let hash = `len:${sorted.length};`;
  for (const t of sorted) {
    hash += `${t.id}|${t.updatedAt}|${t.completed ? 1 : 0}|${t.deletedAt ?? ''}|${t.order ?? ''};`;
  }
  return hash;
};

// Helper function to get default colors for priorities
const getDefaultColorForPriority = (priority: Priority): string => {
  const colors = {
    A1: '#dc2626', A2: '#ef4444', A3: '#f87171', // Red shades for A priorities
    B1: '#ea580c', B2: '#f97316', B3: '#fb923c', // Orange shades for B priorities  
    C1: '#ca8a04', C2: '#eab308', C3: '#facc15', // Yellow shades for C priorities
    D: '#22c55e', // Green for D priority
  };
  return colors[priority];
};

// Helper function to get default colors based on assignment
const getDefaultColorForAssignment = (assignment: Assignment, user: any): string => {
  switch (assignment) {
    case 'me':
      return user?.color || '#ec4899'; // Default pink
    case 'partner':
      return '#3b82f6'; // Default blue
    case 'both':
      return '#8b5cf6'; // Purple for both (will use gradient in UI)
    default:
      return user?.color || '#3b82f6';
  }
};
