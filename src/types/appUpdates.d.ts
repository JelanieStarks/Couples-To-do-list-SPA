export {};

declare global {
  interface Window {
    appDocuments?: {
      print: (html: string) => Promise<{ ok: boolean; canceled?: boolean; message?: string }>;
    };
    appUpdates?: {
      check: () => Promise<{ ok: boolean; message?: string }>;
      download: () => Promise<{ ok: boolean; message?: string }>;
      install: () => Promise<{ ok: boolean; message?: string }>;
      onStatus: (callback: (payload: { state: string; version?: string; message?: string }) => void) => void;
      onProgress: (callback: (payload: { percent?: number; transferred?: number; total?: number; bytesPerSecond?: number }) => void) => void;
      clearListeners: () => void;
    };
  }
}

