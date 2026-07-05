'use client';

import { createContext, useContext, useEffect, useState, startTransition, ReactNode } from 'react';
import { getCurrentUser } from '@/lib/api';
import type { Role, User } from '@/types';

interface AuthContextValue {
  user: User | null;
  role: Role | null;
  loading: boolean;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue>({
  user: null,
  role: null,
  loading: true,
  signOut: async () => {},
  refreshProfile: async () => {},
});

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  const refreshSession = async (): Promise<boolean> => {
    try {
      const res = await fetch('/api/auth/refresh', { method: 'POST' });
      return res.ok;
    } catch {
      return false;
    }
  };

  const syncUser = async () => {
    for (let attempt = 0; attempt < 3; attempt++) {
      try {
        const userData = await getCurrentUser();
        if (userData) {
          setUser(userData);
          return userData;
        }
        if (attempt === 1) {
          const refreshed = await refreshSession();
          if (refreshed) continue;
        }
        if (attempt < 2) {
          await new Promise((r) => setTimeout(r, 300 * (attempt + 1)));
          continue;
        }
        return null;
      } catch {
        if (attempt === 1) {
          const refreshed = await refreshSession();
          if (refreshed) continue;
        }
        if (attempt < 2) {
          await new Promise((r) => setTimeout(r, 300 * (attempt + 1)));
          continue;
        }
        return null;
      }
    }
    return null;
  };

  useEffect(() => {
    const timer = setTimeout(() => {
      syncUser().finally(() => startTransition(() => setLoading(false)));
    }, 0);
    return () => clearTimeout(timer);
  }, []);

  const signOut = async () => {
    await fetch('/api/auth/session', { method: 'DELETE' });
    setUser(null);
  };

  const refreshProfile = async () => {
    await syncUser();
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        role: user?.role ?? null,
        loading,
        signOut,
        refreshProfile,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
