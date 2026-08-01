'use client';

import { createContext, useContext, useState, ReactNode } from 'react';
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

export function AuthProvider({ children, initialUser }: { children: ReactNode; initialUser: User }) {
  const [user, setUser] = useState<User | null>(initialUser);

  const signOut = async () => {
    await fetch('/api/auth/session', { method: 'DELETE' });
    setUser(null);
    window.location.assign('/login');
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
        loading: false,
        signOut,
        refreshProfile,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
