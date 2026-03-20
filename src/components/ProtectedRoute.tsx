import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../lib/auth';

export default function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { loading, user, isAdmin } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[var(--bg)] text-[var(--ink-muted)]">
        Checking access...
      </div>
    );
  }

  if (!user) return <Navigate to="/admin" replace />;
  if (!isAdmin) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[var(--bg)] px-4">
        <div className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-6 text-center max-w-md">
          <h2 className="font-bold text-lg text-[var(--ink)]">Admin access required</h2>
          <p className="text-sm text-[var(--ink-muted)] mt-2">
            Your account is authenticated but not in the admin allowlist.
          </p>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
