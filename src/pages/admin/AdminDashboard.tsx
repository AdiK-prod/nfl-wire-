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

  const topStats = useMemo(
    () =>
      [
        {
          label: 'Pending sources',
          value: stats.pendingSources,
          emptyHint: 'No pending sources right now.',
          variant: 'pending' as const,
        },
        {
          label: 'Flagged sources',
          value: stats.flaggedSources,
          emptyHint: 'Nothing flagged.',
          variant: 'flagged' as const,
        },
        {
          label: 'Active subscribers',
          value: stats.activeSubscribers,
          emptyHint: 'No subscribers yet. Share your landing page to get started.',
          variant: 'subscribers' as const,
        },
        {
          label: 'Newsletters sent',
          value: stats.newslettersSent,
          emptyHint: 'No sends recorded yet.',
          variant: 'newsletters' as const,
        },
      ] as const,
    [stats],
  );

  return (
    <div className="admin-root">
      <div className="admin-glow" aria-hidden />
      <div className="admin-shell admin-shell--dash">
        <header className="admin-dash-nav fade-up" style={{ animationDelay: '0ms' }}>
          <div className="admin-dash-brand">
            <Link to="/" className="admin-dash-logo">
              NFL WIRE
            </Link>
            <p className="admin-dash-subline">Operations</p>
          </div>
          <div className="admin-dash-actions">
            <span className="admin-user-email hidden sm:inline" title={user?.email ?? ''}>
              {user?.email}
            </span>
            <button type="button" className="admin-dash-btn" onClick={() => signOut()}>
              Sign out
            </button>
            <Link to="/" className="admin-dash-btn">
              Subscriber site
            </Link>
          </div>
        </header>

        <section className="fade-up" style={{ animationDelay: '60ms' }}>
          <p className="admin-dash-eyebrow">
            <span className="eyebrow-dot" />
            AT A GLANCE
          </p>
          <div className="admin-dash-stat-grid">
            {topStats.map((s) => (
              <DashStatCard
                key={s.label}
                label={s.label}
                value={s.value}
                emptyHint={s.emptyHint}
                variant={s.variant}
              />
            ))}
          </div>
        </section>

        <nav
          className="admin-dash-tabs-wrap fade-up"
          style={{ animationDelay: '100ms' }}
          aria-label="Admin sections"
        >
          <div className="admin-dash-tabs">
            {nav.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                className={({ isActive }) => `admin-dash-tab${isActive ? ' active' : ''}`}
              >
                {item.label}
              </NavLink>
            ))}
          </div>
        </nav>

        <main className="admin-dash-outlet fade-up" style={{ animationDelay: '140ms' }}>
          <Outlet />
        </main>
      </div>
    </div>
  );
}

function DashStatCard({
  label,
  value,
  emptyHint,
  variant,
}: {
  label: string;
  value: number;
  emptyHint?: string;
  variant: 'pending' | 'flagged' | 'subscribers' | 'newsletters';
}) {
  const showEmpty = value === 0 && emptyHint;
  const flaggedHot = variant === 'flagged' && value > 0;
  return (
    <div className={`admin-dash-stat-card admin-dash-stat-card--${variant}`}>
      <p className={`admin-dash-stat-label${flaggedHot ? ' admin-dash-stat-label--alert' : ''}`}>{label}</p>
      <p className={`admin-dash-stat-value${flaggedHot ? ' admin-dash-stat-value--pulse' : ''}`}>{value}</p>
      {showEmpty ? <p className="admin-dash-stat-empty">{emptyHint}</p> : null}
    </div>
  );
}
