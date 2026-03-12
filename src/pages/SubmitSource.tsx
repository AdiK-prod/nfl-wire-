import React, { useState } from 'react';
import { submitSource } from '../lib/services/sourceService';

function SubmitSource() {
  const [url, setUrl] = useState('');
  const [label, setLabel] = useState('');
  const [teamId, setTeamId] = useState<string | null>(null);
  const [email, setEmail] = useState('');
  const [status, setStatus] = useState<'idle' | 'submitting' | 'success' | 'error'>('idle');
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatus('submitting');
    setError(null);

    try {
      const result = await submitSource({
        url: url.trim(),
        name: label.trim() || undefined,
        teamId,
        submittedBy: email.trim() || undefined,
      });

      if (!result.ok) {
        setError(result.error);
        setStatus('error');
        return;
      }

      setStatus('success');
      setUrl('');
      setLabel('');
    } catch (err) {
      setError((err as Error).message);
      setStatus('error');
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-50 flex items-center justify-center">
      <div className="w-full max-w-xl px-6 py-8 rounded-3xl bg-slate-900/80 shadow-2xl shadow-slate-900/60 border border-slate-800">
        <p className="text-xs font-ui tracking-[0.25em] text-emerald-400 uppercase mb-3">
          NFL Wire
        </p>
        <h1 className="font-headline text-2xl sm:text-3xl tracking-tight mb-2">
          Submit a news source
        </h1>
        <p className="text-sm text-slate-300 mb-6">
          Share a URL you trust for your team. We&apos;ll automatically validate reachability and
          team relevance before it&apos;s added.
        </p>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1" htmlFor="url">
              Source URL
            </label>
            <input
              id="url"
              type="url"
              required
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              className="w-full rounded-lg border border-slate-700 bg-slate-950/60 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400 focus:border-emerald-400"
              placeholder="https://example.com/team-news"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1" htmlFor="label">
              Optional label
            </label>
            <input
              id="label"
              type="text"
              value={label}
              onChange={(e) => setLabel(e.target.value)}
              className="w-full rounded-lg border border-slate-700 bg-slate-950/60 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400 focus:border-emerald-400"
              placeholder="e.g. Seahawks beat reporter"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1" htmlFor="email">
              Your email (optional)
            </label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full rounded-lg border border-slate-700 bg-slate-950/60 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400 focus:border-emerald-400"
              placeholder="We’ll notify you when it’s approved"
            />
          </div>

          {/* Placeholder for team selection wiring later */}
          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1" htmlFor="team">
              Team (optional)
            </label>
            <select
              id="team"
              value={teamId ?? ''}
              onChange={(e) => setTeamId(e.target.value || null)}
              className="w-full rounded-lg border border-slate-700 bg-slate-950/60 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400 focus:border-emerald-400"
            >
              <option value="">All teams / global</option>
              {/* TODO: hydrate with real teams from Supabase */}
            </select>
          </div>

          {error && (
            <p className="text-xs text-red-400" role="alert">
              {error}
            </p>
          )}

          {status === 'success' && (
            <p className="text-xs text-emerald-400">
              Source submitted! Validation is running in the background.
            </p>
          )}

          <button
            type="submit"
            disabled={status === 'submitting'}
            className="inline-flex items-center justify-center rounded-lg bg-emerald-400 px-4 py-2 text-sm font-semibold text-slate-950 hover:bg-emerald-300 disabled:opacity-60 disabled:cursor-not-allowed transition-colors"
          >
            {status === 'submitting' ? 'Submitting…' : 'Submit source'}
          </button>
        </form>
      </div>
    </div>
  );
}

export default SubmitSource;

