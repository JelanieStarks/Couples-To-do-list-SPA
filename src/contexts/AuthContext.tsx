import React, { createContext, useContext, useEffect, useState } from 'react';
import type { User, AuthState } from '../types';
import { storage, STORAGE_KEYS, generateId, generateInviteCode } from '../utils';

// 🔐 Authentication Context - Your digital bouncer, but friendlier
interface AuthContextType extends AuthState {
  login: (name: string, email?: string) => Promise<void>;
  logout: () => void;
  linkPartner: (inviteCode: string) => Promise<boolean>;
  unlinkPartner: () => void;
  updateUser: (updates: Partial<User>) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [authState, setAuthState] = useState<AuthState>({
    user: null,
    partner: null,
    isAuthenticated: false,
    isLoading: true,
  });

  // Load user data on app start - Jarvis remembers everything
  useEffect(() => {
    const loadUserData = () => {
      const savedUser = storage.get<User>(STORAGE_KEYS.USER);
      const savedPartner = storage.get<User>(STORAGE_KEYS.PARTNER);

      setAuthState({
        user: savedUser,
        partner: savedPartner,
        isAuthenticated: !!savedUser,
        isLoading: false,
      });
    };

    loadUserData();
  }, []);

  const login = async (name: string, email?: string): Promise<void> => {
    const user: User = {
      id: generateId(),
      name: name.trim(),
      email: email?.trim(),
      inviteCode: generateInviteCode(),
      createdAt: new Date().toISOString(),
    };

    storage.set(STORAGE_KEYS.USER, user);
    
    setAuthState(prev => ({
      ...prev,
      user,
      isAuthenticated: true,
    }));
  };

  const logout = (): void => {
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
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};