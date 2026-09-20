// Refuse to publish an APK that silently falls back to local demo mode.
const url = process.env.VITE_SUPABASE_URL?.trim();
const key = process.env.VITE_SUPABASE_PUBLISHABLE_KEY?.trim();
if (!url || !key) throw new Error('Configure both Supabase Actions secrets before building.');
if (!/^https:\/\/[a-z0-9]+\.supabase\.co\/?$/.test(url)) {
  throw new Error('Expected the HTTPS Supabase project URL.');
}
const isAnonKey = () => {
  try {
    return JSON.parse(Buffer.from(key.split('.')[1], 'base64url').toString()).role === 'anon';
  } catch {
    return false;
  }
};
if (!key.startsWith('sb_publishable_') && !isAnonKey()) {
  throw new Error('Only a publishable or anon key may be included in an APK.');
}
const response = await fetch(`${url.replace(/\/$/, '')}/auth/v1/settings`, {
  headers: { apikey: key },
  signal: AbortSignal.timeout(20000),
});
if (!response.ok) throw new Error(`Supabase authentication check failed (HTTP ${response.status}).`);
const settings = await response.json();
if (!settings.external?.email) throw new Error('Supabase email authentication must be enabled.');
console.log('Supabase is reachable and email authentication is enabled.');
