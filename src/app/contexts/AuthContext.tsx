import { createContext, useContext, useEffect, useCallback, useState, ReactNode } from 'react';
import { supabase } from '../../lib/supabase';
import { getProfile } from '../../lib/services/profiles.service';
import type { User, Session } from '@supabase/supabase-js';
import type { Profile } from '../../types/database';

interface AuthContextType {
  user: User | null;
  session: Session | null;
  profile: Profile | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  async function loadProfile(userId: string) {
    const { data } = await getProfile(userId);
    if (data) setProfile(data);
  }

  const refreshProfile = useCallback(async () => {
    if (user) await loadProfile(user.id);
  }, [user]);

  useEffect(() => {
    // onAuthStateChange fires INITIAL_SESSION synchronously — sufficient for
    // client-side init. getSession() is for SSR and creates a duplicate
    // loadProfile race where the second call can wipe profile on a transient error.
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      setUser(session?.user ?? null);
      if (session?.user) {
        setIsLoading(true);
        loadProfile(session.user.id).finally(() => setIsLoading(false));
      } else {
        setProfile(null);
        setIsLoading(false);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  return (
    <AuthContext.Provider value={{ user, session, profile, isLoading, isAuthenticated: !!user, refreshProfile }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
