import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// https://vite.dev/config/
export default defineConfig(({ command }) => ({
  // Use relative base for production so Electron can load assets from file://
  base: command === 'build' ? './' : '/',
  plugins: [react()],
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
