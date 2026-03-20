import React from 'react';
import { Link, Navigate } from 'react-router-dom';
import { useAuth } from '../lib/auth';

export default function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { loading, user, isAdmin } = useAuth();

  if (loading) {
    return (
      <div className="admin-root min-h-screen flex items-center justify-center px-4">
        <div className="admin-glow" aria-hidden />
        <div className="text-center relative z-[1]">
          <div className="flex justify-center mb-4">
            <p className="hero-eyebrow m-0">
              <span className="eyebrow-dot" />
              ADMIN
            </p>
          </div>
          <p className="text-sm text-[var(--ink-muted)]">Checking access…</p>
        </div>
      </div>
    );
  }

  if (!user) return <Navigate to="/admin" replace />;
  if (!isAdmin) {
    return (
      <div className="admin-root min-h-screen flex items-center justify-center px-4 py-12">
        <div className="admin-glow" aria-hidden />
        <div className="admin-shell admin-shell-narrow w-full relative z-[1]">
          <div className="admin-panel text-center max-w-md mx-auto">
            <div className="flex justify-center mb-3">
              <p className="hero-eyebrow m-0">
                <span className="eyebrow-dot" />
                ACCESS
              </p>
            </div>
            <h2 className="admin-section-title">Admin access required</h2>
            <p className="admin-section-lede mb-6">
              Your account is signed in, but it isn’t on the admin allowlist yet. Contact a project owner if you need
              access.
            </p>
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <Link to="/" className="admin-btn-secondary">
                Back to site
              </Link>
              <Link to="/admin" className="admin-btn-primary px-8">
                Try another email
              </Link>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
