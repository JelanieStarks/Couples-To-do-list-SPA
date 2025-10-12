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
