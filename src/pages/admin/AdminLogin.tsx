import React, { useState } from 'react';
import { Link, Navigate } from 'react-router-dom';
import { useAuth } from '../../lib/auth';

export default function AdminLogin() {
  const { user, isAdmin, signInWithPassword, signOut, loading } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  if (!loading && user && isAdmin) return <Navigate to="/admin/dashboard" replace />;

  const signedInNotAllowlisted = !loading && Boolean(user) && !isAdmin;

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
    if (!password) {
      setError('Password is required');
      setSubmitting(false);
      return;
    }
    const result = await signInWithPassword(normalized, password);
    if (result.error) {
      setError(result.error);
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
              Sign in with the admin email and password for your account. Access is limited to users listed in{' '}
              <code className="text-xs">admin_users</code>.
            </p>
          </header>

          {signedInNotAllowlisted && (
            <div
              className="admin-login-card mb-4 w-full max-w-[420px] mx-auto border-[var(--border)] bg-[var(--bg)]"
              role="status"
            >
              <p className="m-0 text-sm text-[var(--ink-mid)]">
                You’re signed in as <strong className="text-[var(--ink)]">{user?.email}</strong>, but this account
                isn’t on the admin allowlist yet. Ask an owner to add your user in Supabase{' '}
                <code className="text-xs">admin_users</code>, or sign out and try another account.
              </p>
              <button
                type="button"
                className="admin-btn-secondary mt-4 w-full sm:w-auto"
                onClick={() => void signOut()}
              >
                Sign out
              </button>
            </div>
          )}

          <form className="admin-login-card" onSubmit={onSubmit}>
            <div className="admin-login-form">
              <label htmlFor="admin-email" className="sr-only">
                Email
              </label>
              <input
                id="admin-email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                autoComplete="email"
                className="admin-login-input"
                aria-label="Admin email"
              />
              <label htmlFor="admin-password" className="sr-only">
                Password
              </label>
              <input
                id="admin-password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Password"
                autoComplete="current-password"
                className="admin-login-input"
                aria-label="Password"
              />
              {error && (
                <p className="form-help error m-0" role="alert">
                  {error}
                </p>
              )}
              <button type="submit" disabled={submitting} className="admin-login-submit">
                {submitting ? 'Signing in…' : 'Sign in'}
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
