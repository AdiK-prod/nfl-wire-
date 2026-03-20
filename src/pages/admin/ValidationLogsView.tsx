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
      <h2 className="admin-dash-page-title">Validation logs</h2>
      <p className="admin-dash-page-lede">Recent article validation outcomes and categories.</p>
      {rows.length === 0 ? (
        <p className="admin-dash-section-empty m-0">No articles logged yet.</p>
      ) : (
        <div className="space-y-3">
          {rows.map((row) => (
            <article key={row.id} className="admin-list-card">
              <h3 className="admin-list-card-title">{row.title}</h3>
              <p className="admin-list-card-meta">
                {(row.teams && `${row.teams.city} ${row.teams.name}`) || 'Unknown team'} ·{' '}
                {row.category ?? 'uncategorized'} · {row.relevance_confirmed ? 'confirmed' : 'not confirmed'} ·{' '}
                {new Date(row.published_at).toLocaleString()}
              </p>
            </article>
          ))}
        </div>
      )}
    </div>
  );
}
