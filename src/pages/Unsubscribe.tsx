import React, { useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { supabase } from '../lib/supabase';

export default function Unsubscribe() {
  const [searchParams] = useSearchParams();
  const subscriberId = searchParams.get('subscriber_id');
  const email = searchParams.get('email');
  const [done, setDone] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const canUnsubscribe = useMemo(() => Boolean(subscriberId || email), [subscriberId, email]);

  const onUnsubscribe = async () => {
    if (!canUnsubscribe) return;
    setLoading(true);
    setError(null);
    let query = supabase.from('subscribers').update({ is_active: false });
    if (subscriberId) query = query.eq('id', subscriberId);
    else if (email) query = query.eq('email', email.toLowerCase());
    const { error: updateError } = await query;
    if (updateError) setError(updateError.message);
    else setDone(true);
    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-[var(--bg)] flex items-center justify-center px-4">
      <div className="w-full max-w-md rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-6 text-center">
        <h1 className="text-xl font-bold text-[var(--ink)]">Unsubscribe</h1>
        {!canUnsubscribe && (
          <p className="text-sm text-[var(--ink-muted)] mt-2">Missing unsubscribe identifier.</p>
        )}
        {canUnsubscribe && !done && (
          <>
            <p className="text-sm text-[var(--ink-muted)] mt-2">
              Confirm you want to stop receiving NFL Wire newsletters.
            </p>
            <button
              type="button"
              onClick={onUnsubscribe}
              disabled={loading}
              className="mt-4 rounded-lg bg-[var(--ink)] px-4 py-2 text-sm text-white disabled:opacity-60"
            >
              {loading ? 'Updating...' : 'Confirm unsubscribe'}
            </button>
          </>
        )}
        {done && <p className="text-sm text-[var(--ink-muted)] mt-3">You are unsubscribed successfully.</p>}
        {error && <p className="text-sm text-red-700 mt-3">{error}</p>}
        <Link className="inline-block mt-4 text-sm text-[var(--ink-mid)] underline" to="/">
          Back to home
        </Link>
      </div>
    </div>
  );
}
