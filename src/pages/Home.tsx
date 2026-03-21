import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase, supabaseAnon } from '../lib/supabase';
import type { Team } from '../types/database';

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
type ConferenceTab = 'ALL' | 'AFC' | 'NFC';

function getFetchErrorMessage(err: unknown): string {
  if (err instanceof Error) return err.message;
  if (typeof err === 'object' && err !== null && 'message' in err) {
    const m = (err as { message: unknown }).message;
    if (typeof m === 'string' && m.length) return m;
  }
  return 'Failed to load teams';
}

function isLight(hex: string): boolean {
  const value = hex.startsWith('#') ? hex : `#${hex}`;
  if (!/^#[0-9a-fA-F]{6}$/.test(value)) return false;
  const r = Number.parseInt(value.slice(1, 3), 16);
  const g = Number.parseInt(value.slice(3, 5), 16);
  const b = Number.parseInt(value.slice(5, 7), 16);
  return (r * 299 + g * 587 + b * 114) / 1000 > 160;
}

export default function Home() {
  const navigate = useNavigate();
  const signupRef = useRef<HTMLElement | null>(null);
  const [teams, setTeams] = useState<Team[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  /** Multiple teams can be selected; one subscription row per team per email. */
  const [selectedTeamIds, setSelectedTeamIds] = useState<string[]>([]);
  const [conferenceTab, setConferenceTab] = useState<ConferenceTab>('ALL');
  const [email, setEmail] = useState('');
  const [emailError, setEmailError] = useState<string | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    async function fetchTeams() {
      try {
        setError(null);
        const { data, error: e } = await supabaseAnon
          .from('teams')
          .select('*')
          .order('conference')
          .order('division')
          .order('name');

        if (e) throw e;
        setTeams(data ?? []);
      } catch (err) {
        setError(getFetchErrorMessage(err));
        setTeams([]);
      } finally {
        setLoading(false);
      }
    }
    fetchTeams();
  }, []);

  const selectedTeams = useMemo(() => {
    const map = new Map(teams.map((t) => [t.id, t]));
    return selectedTeamIds.map((id) => map.get(id)).filter(Boolean) as Team[];
  }, [teams, selectedTeamIds]);

  const primarySelectedTeam = selectedTeams[0] ?? null;
  const selectedTeamNames = selectedTeams.map((t) => `${t.city} ${t.name}`);
  const heroTeamLine =
    selectedTeams.length === 0
      ? null
      : selectedTeams.length === 1
        ? selectedTeamNames[0]
        : `${selectedTeams.length} teams: ${selectedTeams.map((t) => t.abbreviation).join(', ')}`;

  const filteredTeams = useMemo(() => {
    if (conferenceTab === 'ALL') return teams;
    return teams.filter((team) => team.conference === conferenceTab);
  }, [conferenceTab, teams]);

  const groupedTeams = useMemo(() => {
    const grouped = new Map<string, Team[]>();
    filteredTeams.forEach((team) => {
      const key = conferenceTab === 'ALL' ? `${team.conference} ${team.division}` : team.division;
      const existing = grouped.get(key) ?? [];
      existing.push(team);
      grouped.set(key, existing);
    });
    return Array.from(grouped.entries()).sort((a, b) => a[0].localeCompare(b[0]));
  }, [conferenceTab, filteredTeams]);

  useEffect(() => {
    const root = document.documentElement;
    const color = primarySelectedTeam?.primary_color ?? '#111111';
    root.style.setProperty('--team-color', color);
    return () => {
      root.style.setProperty('--team-color', '#111111');
    };
  }, [primarySelectedTeam]);

  useEffect(() => {
    if (!primarySelectedTeam || !signupRef.current) return;
    const timer = window.setTimeout(() => {
      signupRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 100);
    return () => window.clearTimeout(timer);
  }, [primarySelectedTeam]);

  const validateEmail = (value: string): boolean => {
    const normalized = value.trim();
    if (!normalized) {
      setEmailError('Email is required');
      return false;
    }
    if (!EMAIL_REGEX.test(normalized)) {
      setEmailError('Please enter a valid email address');
      return false;
    }
    setEmailError(null);
    return true;
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setSubmitError(null);
    if (selectedTeams.length === 0) {
      setSubmitError('Select at least one team to continue.');
      return;
    }
    if (!validateEmail(email)) return;

    const normalizedEmail = email.trim().toLowerCase();
    setSubmitting(true);
    try {
      const added: string[] = [];
      const skippedDuplicate: string[] = [];

      for (const team of selectedTeams) {
        const { error: insertError } = await supabase.from('subscribers').insert({
          email: normalizedEmail,
          team_id: team.id,
          subscribed_at: new Date().toISOString(),
          is_active: true,
        });

        if (insertError) {
          if (insertError.code === '23505') {
            skippedDuplicate.push(team.abbreviation);
          } else {
            setSubmitError(insertError.message);
            return;
          }
        } else {
          added.push(team.abbreviation);
        }
      }

      if (added.length === 0) {
        setSubmitError(
          skippedDuplicate.length
            ? `You're already subscribed to: ${skippedDuplicate.join(', ')}.`
            : 'Could not add subscriptions.',
        );
        return;
      }

      navigate('/confirmed', {
        replace: true,
        state: {
          teamCount: added.length,
          skippedAbbrevs: skippedDuplicate,
        },
      });
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : 'Something went wrong.');
    } finally {
      setSubmitting(false);
    }
  };

  const buttonTextColor =
    primarySelectedTeam && isLight(primarySelectedTeam.primary_color) ? 'var(--ink)' : 'var(--btn-light)';

  return (
    <div className="landing-root">
      <div className={`landing-glow ${primarySelectedTeam ? 'active' : ''}`} />
      <div className="landing-shell">
        <nav className="landing-nav fade-up" style={{ animationDelay: '0ms' }}>
          <p className="landing-logo">NFL WIRE</p>
          <p className="landing-tag">Free · Daily · 5 min</p>
        </nav>

        <header className="landing-hero fade-up" style={{ animationDelay: '80ms' }}>
          <p className="hero-eyebrow">
            <span className="eyebrow-dot" />
            DAILY TEAM BRIEFING
          </p>
          <h1 className="hero-title">
            <span>Everything that matters.</span>
            <span className={`hero-team-line ${primarySelectedTeam ? 'selected' : ''}`}>
              {heroTeamLine ?? 'Pick your team.'}
            </span>
          </h1>
          <p className="hero-copy">Daily briefings for your teams. Every morning.</p>
          <div className="hero-chips">
            <span className="hero-chip">Top Stories</span>
            <span className="hero-chip">Injuries</span>
            <span className="hero-chip">Stat of the Day</span>
          </div>
        </header>

        <section className="team-picker">
          <div className="picker-header fade-up" style={{ animationDelay: '160ms' }}>
            <p className="picker-label">Choose your teams</p>
            <div className="tab-switcher" role="tablist" aria-label="Conference filter">
              {(['ALL', 'AFC', 'NFC'] as ConferenceTab[]).map((tab) => (
                <button
                  key={tab}
                  type="button"
                  role="tab"
                  aria-selected={conferenceTab === tab}
                  className={`tab-button ${conferenceTab === tab ? 'active' : ''}`}
                  onClick={() => setConferenceTab(tab)}
                >
                  {tab}
                </button>
              ))}
            </div>
          </div>

          <div className="picker-groups fade-up" style={{ animationDelay: '220ms' }}>
            {!loading && !error && teams.length === 0 && (
              <div className="error-box" role="status">
                <p className="m-0 font-medium text-[var(--ink)]">No teams loaded</p>
                <p className="mt-2 mb-0 text-sm text-[var(--ink-mid)]">
                  The <code className="text-xs">teams</code> table is empty or not readable with the browser key.
                  Run migrations and seed data on your Supabase project, and ensure RLS allows{' '}
                  <code className="text-xs">SELECT</code> for <code className="text-xs">anon</code> on{' '}
                  <code className="text-xs">public.teams</code> (see migration <code className="text-xs">0012_teams_public_select.sql</code>
                  ).
                </p>
              </div>
            )}
            {!loading && !error && teams.length > 0 && groupedTeams.map(([divisionLabel, divisionTeams]) => (
              <section key={divisionLabel} className="division-group">
                <p className="division-label">{divisionLabel}</p>
                <div className="team-grid">
                  {divisionTeams.map((team) => {
                    const isSelected = selectedTeamIds.includes(team.id);
                    const teamLabel = `${team.city} ${team.name}`;
                    return (
                      <button
                        key={team.id}
                        type="button"
                        className={`team-card ${isSelected ? 'selected' : ''}`}
                        style={{ '--card-team-color': team.primary_color } as React.CSSProperties}
                        onClick={() =>
                          setSelectedTeamIds((prev) =>
                            prev.includes(team.id) ? prev.filter((id) => id !== team.id) : [...prev, team.id],
                          )
                        }
                        aria-pressed={isSelected}
                        aria-label={`${isSelected ? 'Deselect' : 'Select'} ${teamLabel}`}
                      >
                        <span className="team-card-strip" />
                        <span className="team-check-badge" aria-hidden="true">
                          <svg viewBox="0 0 12 12" fill="none">
                            <path d="M2.2 6.2 4.9 8.9 9.8 3.4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                          </svg>
                        </span>
                        <span className="team-icon">{team.abbreviation}</span>
                        <span className="team-name">{teamLabel}</span>
                      </button>
                    );
                  })}
                </div>
              </section>
            ))}
          </div>
        </section>

        {loading && (
          <div className="loading-grid mt-4" aria-busy="true" aria-label="Loading teams">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="loading-card" />
            ))}
          </div>
        )}

        {error && (
          <div className="error-box" role="alert">
            <p>{error}</p>
          </div>
        )}

        <section
          ref={signupRef}
          className={`signup-panel ${primarySelectedTeam ? 'visible' : ''}`}
          aria-hidden={!primarySelectedTeam}
        >
          {primarySelectedTeam && (
            <form onSubmit={handleSubmit}>
              <div className="signup-head">
                <div>
                  <h2 className="signup-title">
                    {selectedTeams.length === 1 ? (
                      <>
                        Get <span>{selectedTeamNames[0]}</span> Wire
                      </>
                    ) : (
                      <>
                        Get <span>{selectedTeams.length} team newsletters</span>
                      </>
                    )}
                  </h2>
                  <p className="signup-description">
                    Delivered every morning — one email per team you select.
                  </p>
                </div>
                <p className="team-badge">
                  <span className="team-badge-dot" />
                  {selectedTeams.length === 1
                    ? selectedTeams[0].abbreviation
                    : `${selectedTeams[0].abbreviation} +${selectedTeams.length - 1}`}
                </p>
              </div>

              <div className="signup-row">
                <label htmlFor="signup-email" className="sr-only">
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
                  className="signup-input"
                  aria-invalid={!!emailError}
                />
                <button
                  type="submit"
                  disabled={submitting}
                  className="signup-button"
                  style={{ color: buttonTextColor }}
                >
                  {submitting
                    ? 'Submitting...'
                    : selectedTeams.length === 1
                      ? `Get ${selectedTeams[0].abbreviation} Wire →`
                      : `Subscribe to ${selectedTeams.length} teams →`}
                </button>
              </div>

              {emailError && <p className="form-help error">{emailError}</p>}
              {submitError && <p className="form-help error">{submitError}</p>}
              {!emailError && !submitError && (
                <p className="form-help">Free forever · No spam · Unsubscribe anytime</p>
              )}
            </form>
          )}
        </section>
      </div>
    </div>
  );
}
