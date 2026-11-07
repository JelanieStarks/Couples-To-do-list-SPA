// Refuse to publish an installer that silently falls back to local demo mode.
import { validateBackendConfig } from './backend-config.mjs';

const { url, key } = validateBackendConfig(process.env);
const response = await fetch(`${url}/auth/v1/settings`, {
  headers: { apikey: key },
  signal: AbortSignal.timeout(20000),
});
if (!response.ok) throw new Error(`Supabase authentication check failed (HTTP ${response.status}).`);
const settings = await response.json();
if (!settings.external?.email) throw new Error('Supabase email authentication must be enabled.');
console.log('Supabase is reachable and email authentication is enabled.');
