import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import type { Session } from '@supabase/supabase-js';
import type { User, AuthState } from '../types';
import { storage, STORAGE_KEYS, generateId, generateInviteCode } from '../utils';
import { getSupabaseClient, isSupabaseAuthEnabled } from '../utils/supabaseClient';
import {
  joinHousehold,
  leaveHousehold,
  loadAccountSnapshot,
  updateProfile,
} from '../data/accountRepository';

type AuthMode = 'supabase' | 'demo';

interface AuthNotice {
  message: string;
  sentAt: string;
}

interface AuthContextType extends AuthState {
  authMode: AuthMode;
  authError: string | null;
  authNotice: AuthNotice | null;
  login: (name: string, email?: string) => Promise<void>;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (name: string, email: string, password: string) => Promise<void>;
  logout: () => void;
  linkPartner: (inviteCode: string) => Promise<boolean>;
  unlinkPartner: () => void;
  updateUser: (updates: Partial<User>) => void;
  clearAuthFeedback: () => void;
  requestMagicLinkForSync: () => Promise<boolean>;
  magicLinkNotice: AuthNotice | null;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within an AuthProvider');
  return context;
};

const readDemoState = (): AuthState => {
  const user = storage.get<User>(STORAGE_KEYS.USER);
  const partner = storage.get<User>(STORAGE_KEYS.PARTNER);
  return { user, partner, isAuthenticated: Boolean(user), isLoading: false };
};

const persistSnapshot = (user: User, partner: User | null) => {
  storage.set(STORAGE_KEYS.USER, user);
  if (partner) storage.set(STORAGE_KEYS.PARTNER, partner);
  else storage.remove(STORAGE_KEYS.PARTNER);
};

const clearAccountCache = () => {
  storage.remove(STORAGE_KEYS.USER);
  storage.remove(STORAGE_KEYS.PARTNER);
  storage.remove(STORAGE_KEYS.TASKS);
  storage.remove(STORAGE_KEYS.TASKS_YDOC);
  storage.remove(STORAGE_KEYS.ROUTINES);
  storage.remove(STORAGE_KEYS.SUPABASE_SESSION);
  storage.remove(STORAGE_KEYS.SUPABASE_TRUSTED);
  storage.remove(STORAGE_KEYS.SUPABASE_OFFLINE_TOKEN);
};

export const AuthProvider: React.FC<{
  children: React.ReactNode;
  initialUser?: User;
  initialPartner?: User;
}> = ({ children, initialUser, initialPartner }) => {
  const supabase = useMemo(() => getSupabaseClient(), []);
  const authMode: AuthMode = useMemo(
    () => (isSupabaseAuthEnabled() && supabase ? 'supabase' : 'demo'),
    [supabase],
  );

  const [authState, setAuthState] = useState<AuthState>(() => {
    if (initialUser) {
      return {
        user: initialUser,
        partner: initialPartner ?? null,
        isAuthenticated: true,
        isLoading: false,
      };
    }
    return authMode === 'demo'
      ? readDemoState()
      : { user: null, partner: null, isAuthenticated: false, isLoading: true };
  });
  const [authError, setAuthError] = useState<string | null>(null);
  const [authNotice, setAuthNotice] = useState<AuthNotice | null>(null);

  const clearAuthFeedback = useCallback(() => {
    setAuthError(null);
    setAuthNotice(null);
  }, []);

  const hydrateSession = useCallback(async (session: Session | null) => {
    if (!supabase || authMode !== 'supabase') return;
    if (!session) {
      setAuthState({ user: null, partner: null, isAuthenticated: false, isLoading: false });
      return;
    }

    setAuthState(previous => ({ ...previous, isLoading: true }));
    try {
      const snapshot = await loadAccountSnapshot(supabase, session.user);
      persistSnapshot(snapshot.user, snapshot.partner);
      storage.set(STORAGE_KEYS.SUPABASE_SESSION, session);
      setAuthState({
        ...snapshot,
        isAuthenticated: true,
        isLoading: false,
      });
      setAuthError(null);
    } catch (error) {
      setAuthError((error as Error).message);
      setAuthState({ user: null, partner: null, isAuthenticated: false, isLoading: false });
    }
  }, [authMode, supabase]);

  useEffect(() => {
    if (initialUser || authMode === 'demo' || !supabase) return;
    let active = true;

    void supabase.auth.getSession().then(({ data, error }) => {
      if (!active) return;
      if (error) {
        setAuthError(error.message);
        setAuthState({ user: null, partner: null, isAuthenticated: false, isLoading: false });
        return;
      }
      void hydrateSession(data.session);
    });

    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      if (active) void hydrateSession(session);
    });

    return () => {
      active = false;
      listener.subscription.unsubscribe();
    };
  }, [authMode, hydrateSession, initialUser, supabase]);

  const login = async (name: string, email?: string) => {
    if (authMode !== 'demo') throw new Error('Use email and password to sign in.');
    const trimmedName = name.trim();
    if (!trimmedName) throw new Error('Please enter your name.');

    const existing = storage.get<User>(STORAGE_KEYS.USER);
    const now = new Date().toISOString();
    const user: User = {
      id: existing?.id ?? generateId(),
      name: trimmedName,
      email: email?.trim() || existing?.email,
      inviteCode: existing?.inviteCode ?? generateInviteCode(),
      color: existing?.color ?? '#ec4899',
      createdAt: existing?.createdAt ?? now,
    };
    persistSnapshot(user, storage.get<User>(STORAGE_KEYS.PARTNER));
    setAuthState(previous => ({ ...previous, user, isAuthenticated: true, isLoading: false }));
  };

  const signIn = async (email: string, password: string) => {
    if (!supabase || authMode !== 'supabase') throw new Error('Supabase is not configured yet.');
    clearAuthFeedback();
    setAuthState(previous => ({ ...previous, isLoading: true }));
    const { data, error } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password,
    });
    if (error) {
      setAuthState(previous => ({ ...previous, isLoading: false }));
      setAuthError(error.message);
      throw error;
    }
    await hydrateSession(data.session);
  };

  const signUp = async (name: string, email: string, password: string) => {
    if (!supabase || authMode !== 'supabase') throw new Error('Supabase is not configured yet.');
    clearAuthFeedback();
    setAuthState(previous => ({ ...previous, isLoading: true }));
    const { data, error } = await supabase.auth.signUp({
      email: email.trim(),
      password,
      options: { data: { display_name: name.trim() } },
    });
    if (error) {
      setAuthState(previous => ({ ...previous, isLoading: false }));
      setAuthError(error.message);
      throw error;
    }
    if (data.session) {
      await hydrateSession(data.session);
      return;
    }
    setAuthState({ user: null, partner: null, isAuthenticated: false, isLoading: false });
    setAuthNotice({
      message: 'Account created. Check your email to confirm it, then sign in.',
      sentAt: new Date().toISOString(),
    });
  };

  const logout = () => {
    if (supabase && authMode === 'supabase') void supabase.auth.signOut();
    clearAccountCache();
    clearAuthFeedback();
    setAuthState({ user: null, partner: null, isAuthenticated: false, isLoading: false });
  };

  const linkPartner = async (inviteCode: string): Promise<boolean> => {
    clearAuthFeedback();
    const code = inviteCode.trim().toUpperCase();
    const requiredLength = authMode === 'supabase' ? 8 : 6;
    if (code.length !== requiredLength) {
      setAuthError(`Invite codes are ${requiredLength} characters.`);
      return false;
    }

    if (supabase && authMode === 'supabase') {
      try {
        await joinHousehold(supabase, code);
        const { data, error } = await supabase.auth.getSession();
        if (error || !data.session) throw error ?? new Error('Your session expired. Please sign in again.');
        await hydrateSession(data.session);
        setAuthNotice({ message: 'You and your partner are connected!', sentAt: new Date().toISOString() });
        return true;
      } catch (error) {
        setAuthError((error as Error).message);
        return false;
      }
    }

    if (!authState.user) return false;
    const partner: User = {
      id: generateId(),
      name: 'Demo Partner',
      inviteCode: code,
      color: '#3b82f6',
      createdAt: new Date().toISOString(),
    };
    const user = { ...authState.user, partnerId: partner.id };
    persistSnapshot(user, partner);
    setAuthState(previous => ({ ...previous, user, partner }));
    return true;
  };

  const unlinkPartner = () => {
    if (!authState.user) return;
    if (supabase && authMode === 'supabase') {
      void (async () => {
        try {
          await leaveHousehold(supabase);
          const { data, error } = await supabase.auth.getSession();
          if (error || !data.session) throw error ?? new Error('Your session expired.');
          await hydrateSession(data.session);
          setAuthNotice({ message: 'Partner connection removed.', sentAt: new Date().toISOString() });
        } catch (error) {
          setAuthError((error as Error).message);
        }
      })();
      return;
    }

    const user = { ...authState.user };
    delete user.partnerId;
    persistSnapshot(user, null);
    setAuthState(previous => ({ ...previous, user, partner: null }));
  };

  const updateUser = (updates: Partial<User>) => {
    if (!authState.user) return;
    const user = { ...authState.user, ...updates };
    persistSnapshot(user, authState.partner);
    setAuthState(previous => ({ ...previous, user }));
    if (supabase && authMode === 'supabase') {
      void updateProfile(supabase, user.id, updates).catch(error => setAuthError(error.message));
    }
  };

  const requestMagicLinkForSync = async () => false;

  const value: AuthContextType = {
    ...authState,
    authMode,
    authError,
    authNotice,
    login,
    signIn,
    signUp,
    logout,
    linkPartner,
    unlinkPartner,
    updateUser,
    clearAuthFeedback,
    requestMagicLinkForSync,
    magicLinkNotice: authNotice,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
