export function validateBackendConfig(env) {
  const url = env.VITE_SUPABASE_URL?.trim();
  const key = env.VITE_SUPABASE_PUBLISHABLE_KEY?.trim() || env.VITE_SUPABASE_ANON_KEY?.trim();
  if (!url || !key) throw new Error('Configure the Supabase URL and publishable key before building.');
  if (!/^https:\/\/[a-z0-9]+\.supabase\.co\/?$/.test(url)) {
    throw new Error('Expected the HTTPS Supabase project URL.');
  }
  let isAnonKey = false;
  try {
    isAnonKey = JSON.parse(Buffer.from(key.split('.')[1], 'base64url').toString()).role === 'anon';
  } catch { /* Modern publishable keys are not JWTs. */ }
  if (!key.startsWith('sb_publishable_') && !isAnonKey) {
    throw new Error('Only a publishable or anon key may be included in an app.');
  }
  for (const flag of ['VITE_ENABLE_SUPABASE_AUTH', 'VITE_ENABLE_SUPABASE_SYNC']) {
    if (env[flag] !== 'true') throw new Error(`${flag} must be true for a connected build.`);
  }
  return { url: url.replace(/\/$/, ''), key };
}
