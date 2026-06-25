'use client';

import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { User as FirebaseUser, onAuthStateChanged, signOut as firebaseSignOut } from 'firebase/auth';
import { auth, isConfigured as isFirebaseConfigured } from '@/lib/firebase';
import { supabase, isConfigured as isSupabaseConfigured } from '@/lib/supabase';
import { upsertUser, getUserByEmail } from '@/lib/services';
import type { Role, User } from '@/types';

interface AuthContextValue {
  firebaseUser: FirebaseUser | null;
  user: User | null;
  role: Role | null;
  loading: boolean;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue>({
  firebaseUser: null,
  user: null,
  role: null,
  loading: true,
  signOut: async () => {},
  refreshProfile: async () => {},
});

export function AuthProvider({ children }: { children: ReactNode }) {
  const [firebaseUser, setFirebaseUser] = useState<FirebaseUser | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  const syncUser = async (email: string, name: string) => {
    if (!supabase || !isSupabaseConfigured) return null;
    const existing = await getUserByEmail(email);
    if (existing) {
      setUser(existing);
      return existing;
    }
    const newUser = await upsertUser({ email, name, role: 'contributor' });
    setUser(newUser);
    return newUser;
  };

  useEffect(() => {
    if (!isFirebaseConfigured || !auth) {
      setTimeout(() => setLoading(false), 0);
      return;
    }

    const unsubscribe = onAuthStateChanged(auth, async (fbUser) => {
      setFirebaseUser(fbUser);
      if (fbUser?.email && supabase && isSupabaseConfigured) {
        await syncUser(fbUser.email, fbUser.displayName ?? '');
      } else {
        setUser(null);
      }
      setLoading(false);
    });
    return unsubscribe;
  }, []);

  const signOut = async () => {
    if (auth) {
      await firebaseSignOut(auth);
    }
    await fetch('/api/auth/session', { method: 'DELETE' });
    setFirebaseUser(null);
    setUser(null);
  };

  const refreshProfile = async () => {
    if (firebaseUser?.email) {
      await syncUser(firebaseUser.email, firebaseUser.displayName ?? '');
    }
  };

  return (
    <AuthContext.Provider
      value={{
        firebaseUser,
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
