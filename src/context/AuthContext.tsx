import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import type { User } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';
import { getProfile, signOut as signOutRequest } from '../services/authService';
import type { Profile } from '../types';

interface AuthContextValue {
  user: User | null;
  profile: Profile | null;
  initializing: boolean;
  setProfile: (p: Profile) => void;
  refreshProfile: () => Promise<void>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [initializing, setInitializing] = useState(true);

  useEffect(() => {
    let active = true;
    supabase.auth.getSession().then(({ data }) => {
      if (!active) return;
      setUser(data.session?.user ?? null);
      setInitializing(false);
    });
    // Keep this callback synchronous: calling Supabase inside it can deadlock the auth lock.
    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!active) return;
      setUser((prev) => (prev?.id === session?.user?.id ? prev ?? session?.user ?? null : session?.user ?? null));
      setInitializing(false);
    });
    return () => {
      active = false;
      sub.subscription.unsubscribe();
    };
  }, []);

  const userId = user?.id;
  const refreshProfile = useCallback(async () => {
    if (!userId) return setProfile(null);
    try {
      setProfile(await getProfile(userId));
    } catch (err) {
      console.warn('Could not load profile', err);
    }
  }, [userId]);

  useEffect(() => {
    refreshProfile();
  }, [refreshProfile]);

  const signOut = useCallback(async () => {
    await signOutRequest();
    setProfile(null);
  }, []);

  const value = useMemo(
    () => ({ user, profile, initializing, setProfile, refreshProfile, signOut }),
    [user, profile, initializing, refreshProfile, signOut],
  );
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

// eslint-disable-next-line react-refresh/only-export-components
export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside <AuthProvider>');
  return ctx;
}
