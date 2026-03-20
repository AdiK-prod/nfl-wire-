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
      { to: '/admin/dashboard/sources', label: 'Source queue' },
      { to: '/admin/dashboard/content', label: 'Content preview' },
      { to: '/admin/dashboard/subscribers', label: 'Subscribers' },
      { to: '/admin/dashboard/logs', label: 'Validation logs' },
    ],
    [],
  );

  return (
    <div className="admin-root">
      <div className="admin-glow" aria-hidden />
      <div className="admin-shell">
        <header className="admin-nav fade-up" style={{ animationDelay: '0ms' }}>
          <div>
            <Link to="/" className="landing-logo block hover:opacity-80 transition-opacity">
              NFL WIRE
            </Link>
            <p className="mt-1 text-xs tracking-[0.2em] uppercase text-[var(--ink-muted)]">Operations</p>
          </div>
          <div className="admin-nav-actions">
            <span className="admin-user-email hidden sm:inline" title={user?.email ?? ''}>
              {user?.email}
            </span>
            <button type="button" className="admin-btn-secondary" onClick={() => signOut()}>
              Sign out
            </button>
            <Link to="/" className="admin-btn-secondary">
              Subscriber site
            </Link>
          </div>
        </header>

        <section className="fade-up" style={{ animationDelay: '60ms' }}>
          <p className="hero-eyebrow mb-3">
            <span className="eyebrow-dot" />
            AT A GLANCE
          </p>
          <div className="admin-stat-grid">
            <StatCard label="Pending sources" value={stats.pendingSources} />
            <StatCard label="Flagged sources" value={stats.flaggedSources} />
            <StatCard label="Active subscribers" value={stats.activeSubscribers} />
            <StatCard label="Newsletters sent" value={stats.newslettersSent} />
          </div>
        </section>

        <nav
          className="admin-nav-tabs mt-8 fade-up"
          style={{ animationDelay: '100ms' }}
          aria-label="Admin sections"
        >
          <div className="tab-switcher">
            {nav.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                className={({ isActive }) => `tab-button ${isActive ? 'active' : ''}`}
              >
                {item.label}
              </NavLink>
            ))}
          </div>
        </nav>

        <main className="admin-main admin-panel mt-5 fade-up" style={{ animationDelay: '140ms' }}>
          <Outlet />
        </main>
      </div>
    </div>
  );
}

function StatCard({ label, value }: { label: string; value: number }) {
  return (
    <div className="admin-stat-card">
      <p className="admin-stat-label">{label}</p>
      <p className="admin-stat-value">{value}</p>
    </div>
  );
}
