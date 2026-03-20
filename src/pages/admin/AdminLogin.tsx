import React, { useState } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../../lib/auth';

export default function AdminLogin() {
  const { user, isAdmin, signInWithEmail, loading } = useAuth();
  const [email, setEmail] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  if (!loading && user && isAdmin) return <Navigate to="/admin/dashboard" replace />;

  const onSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setSubmitting(true);
    setError(null);
    const normalized = email.trim().toLowerCase();
    if (!normalized) {
      setError('Email is required');
      setSubmitting(false);
      return;
    }
    const result = await signInWithEmail(normalized);
    if (result.error) {
      setError(result.error);
    } else {
      setSent(true);
    }
    setSubmitting(false);
  };

  return (
    <div className="min-h-screen bg-[var(--bg)] flex items-center justify-center px-4">
      <div className="w-full max-w-md rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-6">
        <p className="text-xs tracking-[0.22em] uppercase text-[var(--ink-muted)]">NFL Wire Admin</p>
        <h1 className="mt-2 text-2xl font-bold text-[var(--ink)]">Sign in</h1>
        <p className="mt-2 text-sm text-[var(--ink-muted)]">
          Use your admin email to receive a secure magic-link login.
        </p>
        <form className="mt-5 space-y-4" onSubmit={onSubmit}>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="admin@example.com"
            className="w-full rounded-lg border border-[var(--border)] bg-[var(--bg)] px-3 py-2 text-sm"
          />
          {error && <p className="text-sm text-red-700">{error}</p>}
          {sent && <p className="text-sm text-[var(--ink-muted)]">Check your inbox for the login link.</p>}
          <button
            type="submit"
            disabled={submitting}
            className="w-full rounded-lg bg-[var(--ink)] px-4 py-2 text-sm font-semibold text-white disabled:opacity-60"
          >
            {submitting ? 'Sending...' : 'Send magic link'}
          </button>
        </form>
      </div>
    </div>
  );
}
