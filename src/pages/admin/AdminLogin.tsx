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
    <div className="admin-root min-h-screen flex flex-col">
      <div className="admin-glow" aria-hidden />
      <div className="admin-shell admin-shell-narrow flex flex-col flex-1 min-h-0">
        <nav className="landing-nav fade-up shrink-0" style={{ animationDelay: '0ms' }}>
          <Link to="/" className="landing-logo hover:opacity-80 transition-opacity">
            NFL WIRE
          </Link>
          <p className="landing-tag">Admin</p>
        </nav>

        <div className="admin-login-stack fade-up" style={{ animationDelay: '80ms' }}>
          <header className="admin-login-header-block mx-auto w-full">
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

          <form className="admin-login-card" onSubmit={onSubmit}>
            <div className="admin-login-form">
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                autoComplete="email"
                className="admin-login-input"
                aria-label="Admin email"
              />
              {error && (
                <p className="form-help error m-0" role="alert">
                  {error}
                </p>
              )}
              {sent && (
                <p className="form-help text-[var(--ink-muted)] m-0">
                  Check your inbox for the login link. It may take a minute to arrive.
                </p>
              )}
              <button type="submit" disabled={submitting} className="admin-login-submit">
                {submitting ? 'Sending…' : 'Send magic link'}
              </button>
            </div>
          </form>

          <p className="admin-login-back-wrap w-full max-w-[420px] mx-auto">
            <Link to="/" className="admin-login-back">
              ← Back to subscriber site
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
