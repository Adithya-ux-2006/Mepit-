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

  useEffect(() => {
    const timer = setTimeout(() => {
      getCurrentUser()
        .then((userData) => {
          if (userData) setUser(userData);
        })
        .finally(() => startTransition(() => setLoading(false)));
    }, 0);
    return () => clearTimeout(timer);
  }, []);

  const signOut = async () => {
    await fetch('/api/auth/session', { method: 'DELETE' });
    setUser(null);
  };

  const refreshProfile = async () => {
    const userData = await getCurrentUser();
    if (userData) setUser(userData);
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
