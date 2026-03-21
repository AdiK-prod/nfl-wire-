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

const ADMIN_CHECK_TIMEOUT_MS = 12_000;

function withTimeout<T>(promise: Promise<T>, ms: number, label: string): Promise<T> {
  return new Promise((resolve, reject) => {
    const t = setTimeout(() => reject(new Error(`${label} timed out after ${ms}ms`)), ms);
    promise
      .then((v) => {
        clearTimeout(t);
        resolve(v);
      })
      .catch((e) => {
        clearTimeout(t);
        reject(e);
      });
  });
}

async function checkAdmin(userId: string | null): Promise<AdminCheckResult> {
  if (!userId) return { ok: false };
  try {
    const result = await withTimeout(
      supabase
        .from('admin_users')
        .select('id')
        .eq('user_id', userId)
        .maybeSingle(),
      ADMIN_CHECK_TIMEOUT_MS,
      'admin_users lookup',
    );
    const { data, error } = result;
    if (error) {
      return { ok: false, queryError: error.message };
    }
    return { ok: Boolean(data) };
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return { ok: false, queryError: msg };
  }
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
