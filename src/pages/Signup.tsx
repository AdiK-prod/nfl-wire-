import React, { useEffect, useState } from 'react';
import { useSearchParams, Link, useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import type { Team } from '../types/database';

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export default function Signup() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const teamSlug = searchParams.get('team') ?? '';

  const [team, setTeam] = useState<Team | null>(null);
  const [loadingTeam, setLoadingTeam] = useState(!!teamSlug);
  const [email, setEmail] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [emailError, setEmailError] = useState<string | null>(null);

  useEffect(() => {
    if (!teamSlug) {
      setLoadingTeam(false);
      return;
    }
    async function fetchTeam() {
      try {
        const { data, error: e } = await supabase
          .from('teams')
          .select('*')
          .eq('slug', teamSlug)
          .single();

        if (e) throw e;
        setTeam(data);
      } catch {
        setTeam(null);
      } finally {
        setLoadingTeam(false);
      }
    }
    fetchTeam();
  }, [teamSlug]);

  const validateEmail = (value: string): boolean => {
    if (!value.trim()) {
      setEmailError('Email is required');
      return false;
    }
    if (!EMAIL_REGEX.test(value.trim())) {
      setEmailError('Please enter a valid email address');
      return false;
    }
    setEmailError(null);
    return true;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!validateEmail(email) || !team) return;

    setSubmitting(true);
    try {
      const { error: insertError } = await supabase.from('subscribers').insert({
        email: email.trim().toLowerCase(),
        team_id: team.id,
        subscribed_at: new Date().toISOString(),
        is_active: true,
      });

      if (insertError) {
        if (insertError.code === '23505') {
          setError('You are already subscribed to this team’s newsletter.');
        } else {
          setError(insertError.message);
        }
        setSubmitting(false);
        return;
      }

      navigate('/confirmed', { replace: true });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong');
    } finally {
      setSubmitting(false);
    }
  };

  if (teamSlug && loadingTeam) {
    return (
      <div className="min-h-screen bg-slate-950 text-slate-50 flex items-center justify-center">
        <div className="animate-pulse text-slate-400 font-ui">Loading…</div>
      </div>
    );
  }

  if (teamSlug && !team) {
    return (
      <div className="min-h-screen bg-slate-950 text-slate-50 flex items-center justify-center px-4">
        <div className="text-center max-w-md">
          <p className="text-slate-400 font-ui mb-4">Team not found.</p>
          <Link
            to="/"
            className="text-emerald-400 hover:underline font-ui"
          >
            Choose your team
          </Link>
        </div>
      </div>
    );
  }

  if (!teamSlug) {
    return (
      <div className="min-h-screen bg-slate-950 text-slate-50 flex items-center justify-center px-4">
        <div className="text-center max-w-md">
          <p className="text-slate-400 font-ui mb-4">Select a team first.</p>
          <Link
            to="/"
            className="text-emerald-400 hover:underline font-ui"
          >
            Choose your team
          </Link>
        </div>
      </div>
    );
  }

  const displayName = `${team.city} ${team.name}`;

  return (
    <div className="min-h-screen bg-slate-950 text-slate-50">
      <div className="max-w-md mx-auto px-4 py-10 sm:py-14">
        <Link
          to="/"
          className="text-slate-400 hover:text-emerald-400 text-sm font-ui mb-6 inline-block"
        >
          ← Change team
        </Link>

        <section className="rounded-2xl border border-slate-800 bg-slate-900/60 p-5 sm:p-6">
          <div className="flex items-center gap-4 mb-5">
            <div
              className="w-16 h-16 rounded-full flex items-center justify-center text-xl font-bold text-white shrink-0 border border-slate-700"
              style={{ backgroundColor: team.primary_color }}
            >
              {team.logo_url ? (
                <img
                  src={team.logo_url}
                  alt={`${displayName} logo`}
                  className="w-full h-full rounded-full object-contain"
                />
              ) : (
                <span style={{ color: team.secondary_color || '#fff' }}>
                  {team.abbreviation.slice(0, 2)}
                </span>
              )}
            </div>
            <div>
              <h1 className="font-headline text-2xl font-bold leading-tight">{displayName}</h1>
              <p className="text-slate-300 text-sm font-ui mt-1">Get a concise daily team briefing.</p>
            </div>
          </div>

          <div className="mb-5 rounded-lg border border-slate-800 bg-slate-950/50 px-3 py-2">
            <p className="text-xs text-slate-400 font-ui">
              Delivery target: <span className="text-slate-200">22:00 Pacific (default)</span>
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label htmlFor="signup-email" className="block text-sm font-medium text-slate-200 mb-1 font-ui">
                Email address
              </label>
              <input
                id="signup-email"
                type="email"
                autoComplete="email"
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value);
                  if (emailError) setEmailError(null);
                }}
                onBlur={() => email && validateEmail(email)}
                placeholder="you@example.com"
                className="w-full rounded-lg border border-slate-700 bg-slate-900 px-4 py-3 text-slate-100 placeholder-slate-500 focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500 font-ui"
                aria-invalid={!!emailError}
                aria-describedby={emailError ? 'email-error' : 'email-help'}
              />
              {!emailError && (
                <p id="email-help" className="mt-1 text-xs text-slate-500 font-ui">
                  We only send your team’s newsletter. No spam.
                </p>
              )}
              {emailError && (
                <p id="email-error" className="mt-1 text-sm text-red-400 font-ui">
                  {emailError}
                </p>
              )}
            </div>

            {error && (
              <div className="rounded-lg border border-red-800 bg-red-950/40 px-3 py-2">
                <p className="text-sm text-red-300 font-ui">{error}</p>
              </div>
            )}

            <button
              type="submit"
              disabled={submitting}
              className="w-full rounded-lg px-4 py-3 font-ui font-semibold text-white transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              style={{
                backgroundColor: team.primary_color,
              }}
            >
              {submitting ? 'Subscribing…' : `Subscribe to ${team.abbreviation}`}
            </button>
          </form>
        </section>
      </div>
    </div>
  );
}
