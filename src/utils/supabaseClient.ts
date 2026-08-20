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

const cleanEnvValue = (value: unknown): string | undefined => {
  if (typeof value !== 'string') return undefined;
  const cleaned = value.trim();
  return cleaned || undefined;
};

const getEnv = (key: string): string | undefined => {
  if (typeof import.meta !== 'undefined' && (import.meta as any).env && (import.meta as any).env[key]) {
    return cleanEnvValue((import.meta as any).env[key]);
  }
  if ((globalThis as any)[key]) return cleanEnvValue((globalThis as any)[key]);
  if (typeof process !== 'undefined' && typeof (process as any).env === 'object') {
    return cleanEnvValue((process as any).env[key]);
  }
  return undefined;
};

const getSupabasePublicKey = (): string | undefined => (
  getEnv('VITE_SUPABASE_PUBLISHABLE_KEY')
  ?? getEnv('VITE_SUPABASE_ANON_KEY')
);

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
  const publicKey = getSupabasePublicKey();
  if (!url || !publicKey) return null;
  supabase = createClient(url, publicKey, {
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

export const isSupabaseRoutineSyncEnabled = (): boolean => {
  if (isTestEnv()) return false;
  const flag = getEnv('VITE_ENABLE_SUPABASE_ROUTINE_SYNC');
  return flagTrue(flag) && !!getSupabaseClient();
};

export const getSupabaseEnv = () => ({
  url: getEnv('VITE_SUPABASE_URL'),
  publishableKey: getSupabasePublicKey(),
  // Kept for compatibility with existing diagnostics.
  anonKey: getSupabasePublicKey(),
});
