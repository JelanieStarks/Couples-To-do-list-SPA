import React, { createContext, useContext, useEffect, useMemo, useRef, useState } from 'react';
import type { User, AuthState } from '../types';
import { storage, STORAGE_KEYS, generateId, generateInviteCode } from '../utils';
import { getSupabaseClient, isSupabaseAuthEnabled } from '../utils/supabaseClient';
import type { Session } from '@supabase/supabase-js';

// 🔐 Authentication Context - Your digital bouncer, but friendlier
interface AuthContextType extends AuthState {
  login: (name: string, email?: string) => Promise<void>;
  logout: () => void;
  linkPartner: (inviteCode: string) => Promise<boolean>;
  unlinkPartner: () => void;
  updateUser: (updates: Partial<User>) => void;
  requestMagicLinkForSync: () => Promise<boolean>;
  magicLinkNotice: MagicLinkNotice | null;
}

interface MagicLinkNotice {
  message: string;
  sentAt: string;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

// Added optional initialUser/initialPartner for deterministic tests (so we don't have to "login" in every unit test).
export const AuthProvider: React.FC<{ children: React.ReactNode; initialUser?: User; initialPartner?: User }> = ({ children, initialUser, initialPartner }) => {
  const [authState, setAuthState] = useState<AuthState>(() => {
    if (initialUser) {
      return {
        user: initialUser,
        partner: initialPartner || null,
        isAuthenticated: true,
        isLoading: false,
      };
    }
    const savedUser = storage.get<User>(STORAGE_KEYS.USER);
    const savedPartner = storage.get<User>(STORAGE_KEYS.PARTNER);
    return {
      user: savedUser,
      partner: savedPartner,
      isAuthenticated: !!savedUser,
      isLoading: false,
    };
  });

  const supabase = useMemo(() => getSupabaseClient(), []);
  const supabaseAuthEnabled = useMemo(() => isSupabaseAuthEnabled(), []);
  const [magicLinkNotice, setMagicLinkNotice] = useState<MagicLinkNotice | null>(null);
  const magicLinkTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const setOfflineToken = (email?: string) => {
    if (!email) return;
    storage.set(STORAGE_KEYS.SUPABASE_OFFLINE_TOKEN, {
      email,
      issuedAt: new Date().toISOString(),
    });
  };

  const requestMagicLinkForSync = async (): Promise<boolean> => {
    if (!supabaseAuthEnabled || !supabase) return false;
    if (typeof navigator !== 'undefined' && !navigator.onLine) return false;
    const offlineToken = storage.get<{ email?: string }>(STORAGE_KEYS.SUPABASE_OFFLINE_TOKEN);
    const email = offlineToken?.email || authState.user?.email;
    if (!email) return false;
    const { data } = await supabase.auth.getSession();
    if (data.session) return false;
    try {
      await supabase.auth.signInWithOtp({
        email,
        options: { emailRedirectTo: typeof window !== 'undefined' ? window.location.origin : undefined },
      });
      storage.remove(STORAGE_KEYS.SUPABASE_OFFLINE_TOKEN);
      setMagicLinkNotice({ message: 'Magic link sent', sentAt: new Date().toISOString() });
      if (magicLinkTimeoutRef.current) {
        clearTimeout(magicLinkTimeoutRef.current);
      }
      magicLinkTimeoutRef.current = setTimeout(() => {
        setMagicLinkNotice(null);
        magicLinkTimeoutRef.current = null;
      }, 8000);
      return true;
    } catch (error) {
      console.warn('Supabase magic link request failed', error);
      return false;
    }
  };

  // Load user data on app start - Jarvis remembers everything (unless tests already gave us a user)
  useEffect(() => {
    if (initialUser) return; // Test scenario: skip localStorage boot.

    // If Supabase is enabled, hydrate from Supabase session first, then fall back to local storage.
    if (supabaseAuthEnabled && supabase) {
      let active = true;
      const hydrateFromSession = (session: Session | null) => {
        if (!active) return;
        if (!session) {
          const savedUser = storage.get<User>(STORAGE_KEYS.USER);
          const savedPartner = storage.get<User>(STORAGE_KEYS.PARTNER);
          setAuthState({ user: savedUser, partner: savedPartner, isAuthenticated: !!savedUser, isLoading: false });
          return;
        }
        const savedUser = storage.get<User>(STORAGE_KEYS.USER);
        const baseUser: User = savedUser ?? {
          id: session.user.id,
          name: session.user.user_metadata?.name || session.user.email || 'You',
          email: session.user.email ?? undefined,
          inviteCode: generateInviteCode(),
          color: '#ec4899',
          createdAt: new Date().toISOString(),
        };
        const nextUser: User = {
          ...baseUser,
          id: session.user.id,
          email: session.user.email ?? baseUser.email,
        };
        storage.set(STORAGE_KEYS.USER, nextUser);
        storage.set(STORAGE_KEYS.SUPABASE_SESSION, session);
        if (storage.get<boolean>(STORAGE_KEYS.SUPABASE_TRUSTED)) {
          setOfflineToken(nextUser.email);
        }
        setAuthState({ user: nextUser, partner: storage.get<User>(STORAGE_KEYS.PARTNER), isAuthenticated: true, isLoading: false });
      };

      supabase.auth.getSession().then(({ data }) => {
        hydrateFromSession(data.session);
      });

      const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
        hydrateFromSession(session);
      });

      return () => {
        active = false;
        listener?.subscription.unsubscribe();
      };
    }

    const savedUser = storage.get<User>(STORAGE_KEYS.USER);
    const savedPartner = storage.get<User>(STORAGE_KEYS.PARTNER);
    setAuthState({
      user: savedUser,
      partner: savedPartner,
      isAuthenticated: !!savedUser,
      isLoading: false,
    });
  }, [initialUser, supabaseAuthEnabled, supabase]);

  const login = async (name: string, email?: string): Promise<void> => {
    const trimmedName = name.trim();
    const trimmedEmail = email?.trim();
    const now = new Date().toISOString();

    // Supabase magic link if enabled and email provided
    if (supabaseAuthEnabled && supabase && trimmedEmail) {
      try {
        await supabase.auth.signInWithOtp({
          email: trimmedEmail,
          options: {
            emailRedirectTo: typeof window !== 'undefined' ? window.location.origin : undefined,
            data: { name: trimmedName },
          },
        });
      } catch (error) {
        console.warn('Supabase magic link failed, falling back to local session', error);
      }
    }

    const existing = storage.get<User>(STORAGE_KEYS.USER);
    const user: User = {
      id: existing?.id ?? generateId(),
      name: trimmedName,
      email: trimmedEmail || existing?.email,
      inviteCode: existing?.inviteCode ?? generateInviteCode(),
      color: existing?.color ?? '#ec4899',
      createdAt: existing?.createdAt ?? now,
    };

    storage.set(STORAGE_KEYS.USER, user);
    
    setAuthState(prev => ({
      ...prev,
      user,
      isAuthenticated: true,
    }));
  };

  const logout = (): void => {
    if (supabaseAuthEnabled && supabase) {
      void supabase.auth.signOut();
      storage.remove(STORAGE_KEYS.SUPABASE_SESSION);
      storage.remove(STORAGE_KEYS.SUPABASE_TRUSTED);
      storage.remove(STORAGE_KEYS.SUPABASE_OFFLINE_TOKEN);
    }
    storage.remove(STORAGE_KEYS.USER);
    storage.remove(STORAGE_KEYS.PARTNER);
    
    setAuthState({
      user: null,
      partner: null,
      isAuthenticated: false,
      isLoading: false,
    });
  };

  const linkPartner = async (inviteCode: string): Promise<boolean> => {
    // In a real app, this would make an API call to find the partner
    // For now, we'll simulate finding a partner locally
    const trimmedCode = inviteCode.trim().toUpperCase();
    
    if (!trimmedCode || trimmedCode.length !== 6) {
      return false;
    }

    // Create a mock partner for demonstration
    const partner: User = {
      id: generateId(),
      name: 'Your Amazing Partner', // In real life, this would come from the API
      inviteCode: trimmedCode,
      color: '#3b82f6', // Default blue color for "Partner"
      createdAt: new Date().toISOString(),
    };

    // Update current user with partner ID
    if (authState.user) {
      const updatedUser = { ...authState.user, partnerId: partner.id };
      storage.set(STORAGE_KEYS.USER, updatedUser);
      storage.set(STORAGE_KEYS.PARTNER, partner);

      setAuthState(prev => ({
        ...prev,
        user: updatedUser,
        partner,
      }));

      return true;
    }

    return false;
  };

  const unlinkPartner = (): void => {
    if (authState.user) {
      const updatedUser = { ...authState.user };
      delete updatedUser.partnerId;
      
      storage.set(STORAGE_KEYS.USER, updatedUser);
      storage.remove(STORAGE_KEYS.PARTNER);

      setAuthState(prev => ({
        ...prev,
        user: updatedUser,
        partner: null,
      }));
    }
  };

  const updateUser = (updates: Partial<User>): void => {
    if (authState.user) {
      const updatedUser = { ...authState.user, ...updates };
      storage.set(STORAGE_KEYS.USER, updatedUser);
      
      setAuthState(prev => ({
        ...prev,
        user: updatedUser,
      }));
    }
  };

  const value: AuthContextType = {
    ...authState,
    login,
    logout,
    linkPartner,
    unlinkPartner,
    updateUser,
    requestMagicLinkForSync,
    magicLinkNotice,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
