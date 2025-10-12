import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import './index.css';
import './App.css';
import App from './App.jsx';
import { STORAGE_KEYS, storage } from './utils';

// Apply persisted text scale early to avoid layout jumps
try {
  const settings = storage.get(STORAGE_KEYS.SETTINGS) || {};
  const scale = typeof settings.textScale === 'number' ? settings.textScale : 1;
  document.documentElement.style.setProperty('--font-scale', String(scale));
} catch {
  // ignore settings read errors
}

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
