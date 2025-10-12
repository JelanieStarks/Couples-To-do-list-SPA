import '@testing-library/jest-dom/vitest';

// Any global test helpers can be added here later.

// Provide a WebSocket implementation in JSDOM tests
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore
globalThis.WebSocket = (globalThis as any).WebSocket || (await import('ws')).WebSocket;

// Allow tests to set VITE_SYNC_URL at runtime by mutating globalThis
// Example: (globalThis as any).VITE_SYNC_URL = 'http://localhost:1234'

