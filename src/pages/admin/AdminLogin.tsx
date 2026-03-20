import React, { useState } from 'react';
import { Link, Navigate } from 'react-router-dom';
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
    <div className="admin-root">
      <div className="admin-glow" aria-hidden />
      <div className="admin-shell admin-shell-narrow">
        <nav className="landing-nav fade-up" style={{ animationDelay: '0ms' }}>
          <Link to="/" className="landing-logo hover:opacity-80 transition-opacity">
            NFL WIRE
          </Link>
          <p className="landing-tag">Admin</p>
        </nav>

        <header className="fade-up" style={{ animationDelay: '80ms' }}>
          <p className="hero-eyebrow">
            <span className="eyebrow-dot" />
            OPERATIONS
          </p>
          <h1 className="admin-login-title">Sign in</h1>
          <p className="admin-login-lede">
            Use your admin email to receive a secure magic link. You’ll be redirected to the dashboard after
            you open the link.
          </p>
        </header>

        <div className="fade-up" style={{ animationDelay: '140ms' }}>
          <form className="admin-panel" onSubmit={onSubmit}>
            <div className="signup-head">
              <div>
                <h2 className="signup-title">
                  Magic link <span>login</span>
                </h2>
                <p className="signup-description">No password — we email you a one-time link.</p>
              </div>
            </div>
            <div className="space-y-4">
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                autoComplete="email"
                className="admin-form-input"
              />
              {error && (
                <p className="form-help error" role="alert">
                  {error}
                </p>
              )}
              {sent && (
                <p className="form-help text-[var(--ink-muted)]">
                  Check your inbox for the login link. It may take a minute to arrive.
                </p>
              )}
              <button type="submit" disabled={submitting} className="admin-btn-primary w-full sm:w-auto">
                {submitting ? 'Sending…' : 'Send magic link'}
              </button>
            </div>
          </form>
        </div>

        <p className="mt-8 text-center text-xs text-[var(--ink-faint)] fade-up" style={{ animationDelay: '200ms' }}>
          <Link to="/" className="text-[var(--ink-muted)] hover:text-[var(--ink-mid)] underline-offset-4 hover:underline">
            ← Back to subscriber site
          </Link>
        </p>
      </div>
    </div>
  );
}
