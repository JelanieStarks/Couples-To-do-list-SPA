/**
 * Supabase client helper
 * - Reads env from Vite/Node/global
 * - Returns a singleton client when URL/key exist
 * - Provides feature flags for auth/sync gates
 */
import { createClient, type SupabaseClient } from '@supabase/supabase-js';

const isTestEnv = (): boolean => {
  if (typeof process !== 'undefined' && typeof (process as any).env === 'object') {
    return !!(process as any).env.VITEST || (process as any).env.NODE_ENV === 'test';
  }
  return false;
};

const getEnv = (key: string): string | undefined => {
  if (typeof import.meta !== 'undefined' && (import.meta as any).env && (import.meta as any).env[key]) {
    return (import.meta as any).env[key];
  }
  if ((globalThis as any)[key]) return (globalThis as any)[key];
  if (typeof process !== 'undefined' && typeof (process as any).env === 'object') {
    return (process as any).env[key];
  }
  return undefined;
};

const flagTrue = (value: unknown): boolean => {
  if (value === true) return true;
  if (typeof value === 'string') {
    return value.toLowerCase() === 'true' || value === '1' || value.toLowerCase() === 'yes';
  }
  return false;
};

let supabase: SupabaseClient | null = null;

export const getSupabaseClient = (): SupabaseClient | null => {
  if (isTestEnv()) return null;
  if (supabase) return supabase;
  const url = getEnv('VITE_SUPABASE_URL');
  const anonKey = getEnv('VITE_SUPABASE_ANON_KEY');
  if (!url || !anonKey) return null;
  supabase = createClient(url, anonKey, {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
    },
  });
  return supabase;
};

export const isSupabaseAuthEnabled = (): boolean => {
  if (isTestEnv()) return false;
  const flag = getEnv('VITE_ENABLE_SUPABASE_AUTH');
  return flagTrue(flag) && !!getSupabaseClient();
};

export const isSupabaseSyncEnabled = (): boolean => {
  if (isTestEnv()) return false;
  const flag = getEnv('VITE_ENABLE_SUPABASE_SYNC');
  return flagTrue(flag) && !!getSupabaseClient();
};

export const getSupabaseEnv = () => ({
  url: getEnv('VITE_SUPABASE_URL'),
  anonKey: getEnv('VITE_SUPABASE_ANON_KEY'),
});
