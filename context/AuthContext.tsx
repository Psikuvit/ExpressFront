import React, {
  createContext, useContext, useState,
  useEffect, useCallback, type ReactNode,
} from 'react';
import { authAPI } from '@/api/client';
import {
  saveTokens, saveUser, getUser, clearTokens,
  getDeliveryModeStorage, setDeliveryModeStorage,
} from '@/utils/storage';
import type { AuthResponse } from '@/type';

interface AuthContextValue {
  user: AuthResponse | null;
  isLoading: boolean;
  isDeliveryMode: boolean;
  login: (username: string, password: string) => Promise<void>;
  register: (username: string, email: string, password: string) => Promise<void>;
  updateUser: (patch: Partial<AuthResponse>) => Promise<void>;
  setDeliveryMode: (enabled: boolean) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser]       = useState<AuthResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isDeliveryMode, setIsDeliveryMode] = useState(false);

  useEffect(() => {
    Promise.all([getUser(), getDeliveryModeStorage()])
      .then(([storedUser, storedDeliveryMode]) => {
        setUser(storedUser);
        setIsDeliveryMode(storedDeliveryMode);
      })
      .finally(() => setIsLoading(false));
  }, []);

  const login = useCallback(async (username: string, password: string) => {
    const data = await authAPI.login({ username, password });
    await saveTokens(data.token, data.refreshToken);
    await saveUser(data);
    setUser(data);
  }, []);

  const register = useCallback(async (username: string, email: string, password: string) => {
    await authAPI.register({ username, email, password });
    await login(username, password);
  }, [login]);

  const updateUser = useCallback(async (patch: Partial<AuthResponse>) => {
    if (!patch || Object.keys(patch).length === 0) return;

    setUser((prev) => {
      if (!prev) return prev;
      const next = { ...prev, ...patch };
      saveUser(next).catch(() => {});
      return next;
    });
  }, []);

  const setDeliveryMode = useCallback(async (enabled: boolean) => {
    setIsDeliveryMode(enabled);
    await setDeliveryModeStorage(enabled);
  }, []);

  const logout = useCallback(async () => {
    try { 
      await authAPI.logout();
     } catch { /* ignore */ }
    await clearTokens();
    setUser(null);
    setIsDeliveryMode(false);
  }, []);

  return (
    <AuthContext.Provider value={{
      user,
      isLoading,
      isDeliveryMode,
      login,
      register,
      updateUser,
      setDeliveryMode,
      logout,
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside <AuthProvider>');
  return ctx;
}
