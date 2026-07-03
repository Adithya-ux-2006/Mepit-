'use client';

import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { User as FirebaseUser, onAuthStateChanged, signOut as firebaseSignOut } from 'firebase/auth';
import { auth, isConfigured as isFirebaseConfigured } from '@/lib/firebase';
import { getCurrentUser } from '@/lib/api';
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

  /**
   * Sync the current Firebase user with our users table via the API.
   * The /api/users/me endpoint verifies the session cookie, looks up
   * the user by email, and creates them if they don't exist.
   * Retries up to 3 times to handle the case where the session cookie
   * hasn't been set yet (e.g. on first login before redirect).
   */
  const syncUser = async () => {
    for (let attempt = 0; attempt < 3; attempt++) {
      try {
        const userData = await getCurrentUser();
        if (userData) {
          setUser(userData);
          return userData;
        }
        // If null, session cookie might not be set yet — retry
        if (attempt < 2) {
          await new Promise((r) => setTimeout(r, 300 * (attempt + 1)));
          continue;
        }
        return null;
      } catch {
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
    if (!isFirebaseConfigured || !auth) {
      setTimeout(() => setLoading(false), 0);
      return;
    }

    const unsubscribe = onAuthStateChanged(auth, async (fbUser) => {
      setFirebaseUser(fbUser);
      try {
        if (fbUser) {
          await syncUser();
        } else {
          setUser(null);
        }
      } catch (err) {
        console.error('Auth state change error:', err);
        setUser(null);
      } finally {
        setLoading(false);
      }
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
    await syncUser();
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
