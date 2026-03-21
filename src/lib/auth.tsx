import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';
import type { Session, User } from '@supabase/supabase-js';
import { supabase } from './supabase';

type AuthContextValue = {
  user: User | null;
  session: Session | null;
  isAdmin: boolean;
  loading: boolean;
  signInWithPassword: (email: string, password: string) => Promise<{ error: string | null }>;
  signOut: () => Promise<void>;
  refreshAdmin: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

type AdminCheckResult = { ok: boolean; queryError?: string };

async function checkAdmin(userId: string | null): Promise<AdminCheckResult> {
  if (!userId) return { ok: false };
  const { data, error } = await supabase
    .from('admin_users')
    .select('id')
    .eq('user_id', userId)
    .maybeSingle();
  if (error) {
    return { ok: false, queryError: error.message };
  }
  return { ok: Boolean(data) };
}

async function applySession(nextSession: Session | null) {
  const nextUser = nextSession?.user ?? null;
  const adminResult = await checkAdmin(nextUser?.id ?? null);
  return {
    session: nextSession,
    user: nextUser,
    isAdmin: adminResult.ok,
    adminQueryError: adminResult.queryError,
  };
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (_event, nextSession) => {
      if (!mounted) return;
      const next = await applySession(nextSession);
      if (next.adminQueryError) {
        console.warn('[auth] admin_users check failed:', next.adminQueryError);
      }
      setSession(next.session);
      setUser(next.user);
      setIsAdmin(next.isAdmin);
      setLoading(false);
    });

    void supabase.auth.getSession().then(async ({ data }) => {
      if (!mounted) return;
      const next = await applySession(data.session ?? null);
      if (next.adminQueryError) {
        console.warn('[auth] admin_users check failed:', next.adminQueryError);
      }
      setSession(next.session);
      setUser(next.user);
      setIsAdmin(next.isAdmin);
      setLoading(false);
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  const signInWithPassword = useCallback(async (email: string, password: string) => {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) {
      return { error: error.message };
    }
    // Apply session immediately so the next request uses the JWT (avoids races with onAuthStateChange).
    const nextSession = data.session;
    if (!nextSession) {
      return { error: 'No session returned after sign-in.' };
    }
    const next = await applySession(nextSession);
    if (next.adminQueryError) {
      console.warn('[auth] admin_users check failed:', next.adminQueryError);
    }
    setSession(next.session);
    setUser(next.user);
    setIsAdmin(next.isAdmin);
    setLoading(false);
    return { error: null };
  }, []);

  const signOut = useCallback(async () => {
    await supabase.auth.signOut();
  }, []);

  const refreshAdmin = useCallback(async () => {
    const {
      data: { session: s },
    } = await supabase.auth.getSession();
    const adminResult = await checkAdmin(s?.user?.id ?? null);
    setIsAdmin(adminResult.ok);
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      session,
      isAdmin,
      loading,
      signInWithPassword,
      signOut,
      refreshAdmin,
    }),
    [user, session, isAdmin, loading, signInWithPassword, signOut, refreshAdmin],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider');
  return ctx;
}
