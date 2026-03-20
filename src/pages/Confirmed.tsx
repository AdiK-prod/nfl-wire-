import React from 'react';
import { Link, useLocation } from 'react-router-dom';

type LocationState = { teamCount?: number; skippedAbbrevs?: string[] };

export default function Confirmed() {
  const location = useLocation();
  const state = location.state as LocationState | null;
  const teamCount = state?.teamCount ?? 1;
  const skipped = state?.skippedAbbrevs?.length
    ? ` (Some teams were already on your list: ${state.skippedAbbrevs.join(', ')}.)`
    : '';

  return (
    <div className="min-h-screen bg-slate-950 text-slate-50 flex items-center justify-center px-4">
      <div className="max-w-md text-center">
        <h1 className="font-headline text-2xl sm:text-3xl font-bold mb-4">
          Welcome aboard!
        </h1>
        <p className="text-slate-300 font-body mb-6">
          {teamCount > 1
            ? `You’re set to receive ${teamCount} daily team briefings (one email per team).${skipped}`
            : `Check your inbox. You’ll get your daily briefing soon.${skipped}`}
        </p>
        <Link
          to="/"
          className="text-emerald-400 hover:underline font-ui"
        >
          Back to home
        </Link>
      </div>
    </div>
  );
}
