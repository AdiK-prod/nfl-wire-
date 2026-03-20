import React, { useEffect, useMemo, useState } from 'react';
import { Link, NavLink, Outlet } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../lib/auth';

type AdminStats = {
  pendingSources: number;
  flaggedSources: number;
  activeSubscribers: number;
  newslettersSent: number;
};

export default function AdminDashboard() {
  const { user, signOut } = useAuth();
  const [stats, setStats] = useState<AdminStats>({
    pendingSources: 0,
    flaggedSources: 0,
    activeSubscribers: 0,
    newslettersSent: 0,
  });

  useEffect(() => {
    async function loadStats() {
      const [pendingRes, flaggedRes, subsRes, sentRes] = await Promise.all([
        supabase.from('sources').select('*', { count: 'exact', head: true }).eq('status', 'pending'),
        supabase.from('sources').select('*', { count: 'exact', head: true }).eq('status', 'flagged'),
        supabase.from('subscribers').select('*', { count: 'exact', head: true }).eq('is_active', true),
        supabase.from('newsletters').select('*', { count: 'exact', head: true }).eq('status', 'sent'),
      ]);
      setStats({
        pendingSources: pendingRes.count ?? 0,
        flaggedSources: flaggedRes.count ?? 0,
        activeSubscribers: subsRes.count ?? 0,
        newslettersSent: sentRes.count ?? 0,
      });
    }
    loadStats();
  }, []);

  const nav = useMemo(
    () => [
      { to: '/admin/dashboard/sources', label: 'Source Queue' },
      { to: '/admin/dashboard/content', label: 'Content Preview' },
      { to: '/admin/dashboard/subscribers', label: 'Subscriber Insights' },
      { to: '/admin/dashboard/logs', label: 'Validation Logs' },
    ],
    [],
  );

  return (
    <div className="min-h-screen bg-[var(--bg)]">
      <div className="mx-auto max-w-6xl px-4 py-8">
        <header className="rounded-xl border border-[var(--border)] bg-[var(--surface)] px-5 py-4 flex items-center justify-between">
          <div>
            <p className="text-xs uppercase tracking-[0.2em] text-[var(--ink-muted)]">NFL Wire Admin</p>
            <h1 className="text-xl font-bold text-[var(--ink)]">Operations Dashboard</h1>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs text-[var(--ink-muted)]">{user?.email}</span>
            <button
              type="button"
              className="rounded-md border border-[var(--border)] px-3 py-1.5 text-sm"
              onClick={() => signOut()}
            >
              Sign out
            </button>
            <Link to="/" className="rounded-md border border-[var(--border)] px-3 py-1.5 text-sm">
              Site
            </Link>
          </div>
        </header>

        <section className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-4">
          <StatCard label="Pending sources" value={stats.pendingSources} />
          <StatCard label="Flagged sources" value={stats.flaggedSources} />
          <StatCard label="Active subscribers" value={stats.activeSubscribers} />
          <StatCard label="Newsletters sent" value={stats.newslettersSent} />
        </section>

        <nav className="mt-4 rounded-xl border border-[var(--border)] bg-[var(--surface)] p-2 flex flex-wrap gap-2">
          {nav.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) =>
                `rounded-md px-3 py-2 text-sm ${isActive ? 'bg-[var(--ink)] text-white' : 'text-[var(--ink-mid)]'}`
              }
            >
              {item.label}
            </NavLink>
          ))}
        </nav>

        <main className="mt-4 rounded-xl border border-[var(--border)] bg-[var(--surface)] p-4">
          <Outlet />
        </main>
      </div>
    </div>
  );
}

function StatCard({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-lg border border-[var(--border)] bg-[var(--bg)] p-3">
      <p className="text-xs text-[var(--ink-muted)]">{label}</p>
      <p className="text-xl font-bold text-[var(--ink)]">{value}</p>
    </div>
  );
}
