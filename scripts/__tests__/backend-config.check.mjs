import { test } from 'node:test';
import assert from 'node:assert/strict';
import { validateBackendConfig } from '../backend-config.mjs';

const configured = {
  VITE_SUPABASE_URL: 'https://example.supabase.co/',
  VITE_SUPABASE_PUBLISHABLE_KEY: 'sb_publishable_example',
  VITE_ENABLE_SUPABASE_AUTH: 'true',
  VITE_ENABLE_SUPABASE_SYNC: 'true',
};
const legacyKey = role => 'header.' + Buffer.from(JSON.stringify({ role })).toString('base64url') + '.signature';

test('connected builds accept public keys and normalize the URL', () => {
  assert.deepEqual(validateBackendConfig(configured), {
    url: 'https://example.supabase.co', key: 'sb_publishable_example',
  });
  assert.equal(validateBackendConfig({
    ...configured, VITE_SUPABASE_PUBLISHABLE_KEY: ' ',
    VITE_SUPABASE_ANON_KEY: legacyKey('anon'),
  }).key, legacyKey('anon'));
});

test('connected builds reject missing settings, disabled sync, and privileged keys', () => {
  for (const overrides of [
    { VITE_SUPABASE_URL: '' },
    { VITE_SUPABASE_PUBLISHABLE_KEY: '' },
    { VITE_SUPABASE_URL: 'http://example.supabase.co' },
    { VITE_SUPABASE_PUBLISHABLE_KEY: 'sb_secret_private' },
    { VITE_SUPABASE_PUBLISHABLE_KEY: legacyKey('service_role') },
    { VITE_ENABLE_SUPABASE_AUTH: 'false' },
    { VITE_ENABLE_SUPABASE_SYNC: '' },
  ]) {
    assert.throws(() => validateBackendConfig({ ...configured, ...overrides }));
  }
});
