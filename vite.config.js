import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import inject from '@rollup/plugin-inject';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const resolve = (p) => path.resolve(__dirname, p);

// https://vite.dev/config/
export default defineConfig(({ command }) => ({
  // Use relative base for production so Electron can load assets from file://
  base: command === 'build' ? './' : '/',
  plugins: [react()],
  resolve: {
    alias: {
      buffer: 'buffer',
      events: 'events',
      process: 'process/browser',
      stream: 'stream-browserify',
      util: 'util',
      // Stub FullCalendar CSS imports for Vitest/node resolution
      '@fullcalendar/core/index.css': resolve('src/styles/fullcalendar-stubs.css'),
      '@fullcalendar/daygrid/index.css': resolve('src/styles/fullcalendar-stubs.css'),
      '@fullcalendar/timegrid/index.css': resolve('src/styles/fullcalendar-stubs.css'),
    }
  },
  define: {
    global: 'globalThis',
    'process.env': {}
  },
  optimizeDeps: {
    include: ['buffer', 'events', 'process', 'stream-browserify', 'util']
  },
  build: {
    rollupOptions: {
      plugins: [
        inject({
          Buffer: ['buffer', 'Buffer'],
          process: ['process']
        })
      ]
    }
  },
  test: {
    environment: 'jsdom',
    setupFiles: ['./vitest.setup.ts'],
    globals: true,
    css: true,
    coverage: {
      reporter: ['text','lcov'],
      include: ['src/**/*.{ts,tsx}'],
      exclude: ['src/main.jsx'],
      thresholds: {
        statements: 50,
        branches: 40,
        functions: 50,
        lines: 50,
      }
    }
  }
}));
