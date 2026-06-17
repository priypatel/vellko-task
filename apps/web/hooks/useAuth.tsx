'use client';

import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  type ReactNode,
} from 'react';
import { useRouter } from 'next/navigation';
import { api } from '@/lib/api-client';
import {
  setAccessToken,
  clearAccessToken,
  setAuthSignal,
  clearAuthSignal,
} from '@/lib/auth';
import type { User } from '@/types';

interface AuthContextValue {
  user: User | null;
  loading: boolean;
  initialized: boolean;
  login: (email: string, password: string) => Promise<User | null>;
  register: (
    name: string,
    email: string,
    password: string,
  ) => Promise<User | null>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

/**
 * Provides a single shared auth state for the whole app. Mounted once in the
 * root layout so session restore runs exactly once.
 */
export function AuthProvider({ children }: { children: ReactNode }) {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(false);
  const [initialized, setInitialized] = useState(false);

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const refreshRes = await api.auth.refresh();
        const token = refreshRes.data?.accessToken;
        if (token) {
          setAccessToken(token);
          const meRes = await api.auth.me();
          const restored = meRes.data?.user ?? null;
          if (active && restored) {
            setUser(restored);
            setAuthSignal(restored.role);
          }
        }
      } catch {
        clearAccessToken();
        clearAuthSignal();
      } finally {
        if (active) setInitialized(true);
      }
    })();
    return () => {
      active = false;
    };
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    setLoading(true);
    try {
      const res = await api.auth.login({ email, password });
      const token = res.data?.accessToken;
      const loggedIn = res.data?.user ?? null;
      if (token && loggedIn) {
        setAccessToken(token);
        setUser(loggedIn);
        setAuthSignal(loggedIn.role);
      }
      return loggedIn;
    } finally {
      setLoading(false);
    }
  }, []);

  const register = useCallback(
    async (name: string, email: string, password: string) => {
      setLoading(true);
      try {
        const res = await api.auth.register({ name, email, password });
        return res.data?.user ?? null;
      } finally {
        setLoading(false);
      }
    },
    [],
  );

  const logout = useCallback(async () => {
    try {
      await api.auth.logout();
    } catch {
      // Ignore — clear local state regardless.
    }
    clearAccessToken();
    clearAuthSignal();
    setUser(null);
    router.push('/login');
  }, [router]);

  return (
    <AuthContext.Provider
      value={{ user, loading, initialized, login, register, logout }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return ctx;
}
