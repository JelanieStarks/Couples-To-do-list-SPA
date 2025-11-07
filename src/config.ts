// App config helpers

export const getSyncBaseUrl = (): string | null => {
  const url = (typeof import.meta !== 'undefined' && (import.meta as any).env?.VITE_SYNC_URL) || (globalThis as any).VITE_SYNC_URL;
  if (!url || typeof url !== 'string') return null;
  return url.replace(/\/$/, '');
};

// Given two ids, derive a stable room id independent of order.
export const deriveRoomId = (a?: string, b?: string): string | null => {
  if (!a && !b) return null;
  if (a && !b) return `solo-${a}`;
  if (!a && b) return `solo-${b}`;
  const ids = [a as string, b as string].sort();
  return `pair-${ids[0]}-${ids[1]}`;
};

export const getLanSignalUrl = (): string | null => {
  const envSource =
    (typeof import.meta !== 'undefined' && (import.meta as any).env?.VITE_LAN_SIGNAL_URL) ??
    (globalThis as any).VITE_LAN_SIGNAL_URL ??
    (typeof process !== 'undefined' && typeof (process as any).env === 'object'
      ? (process as any).env.LAN_SIGNAL_URL || (process as any).env.VITE_LAN_SIGNAL_URL
      : undefined);

  if (envSource && typeof envSource === 'string') {
    return envSource;
  }

  if (typeof window !== 'undefined') {
    return 'ws://localhost:4457';
  }

  return null;
};
