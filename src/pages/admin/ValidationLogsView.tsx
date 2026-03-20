import React, { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';

type LogRow = {
  id: string;
  title: string;
  relevance_confirmed: boolean;
  category: string | null;
  published_at: string;
  teams: { city: string; name: string } | null;
};

export default function ValidationLogsView() {
  const [rows, setRows] = useState<LogRow[]>([]);

  useEffect(() => {
    supabase
      .from('articles')
      .select('id,title,relevance_confirmed,category,published_at,teams(city,name)')
      .order('published_at', { ascending: false })
      .limit(100)
      .then(({ data }) => setRows((data as LogRow[]) ?? []));
  }, []);

  return (
    <div>
      <h2 className="text-lg font-semibold text-[var(--ink)]">Validation Logs</h2>
      <p className="text-sm text-[var(--ink-muted)] mb-3">Recent article validation outcomes and categories.</p>
      <div className="space-y-2">
        {rows.map((row) => (
          <div key={row.id} className="rounded-lg border border-[var(--border)] bg-[var(--bg)] p-3">
            <p className="text-sm font-medium text-[var(--ink)]">{row.title}</p>
            <p className="text-xs text-[var(--ink-muted)] mt-1">
              {(row.teams && `${row.teams.city} ${row.teams.name}`) || 'Unknown team'} · {row.category ?? 'uncategorized'} ·{' '}
              {row.relevance_confirmed ? 'confirmed' : 'not confirmed'} · {new Date(row.published_at).toLocaleString()}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}
