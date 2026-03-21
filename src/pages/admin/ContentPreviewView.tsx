import React, { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';

type Row = {
  id: string;
  subject_line: string;
  status: string;
  created_at: string;
  teams: { city: string; name: string } | null;
};

export default function ContentPreviewView() {
  const [rows, setRows] = useState<Row[]>([]);

  useEffect(() => {
    supabase
      .from('newsletters')
      .select('id, subject_line, status, created_at, teams(city,name)')
      .order('created_at', { ascending: false })
      .limit(50)
      .then(({ data }) => setRows((data as Row[]) ?? []));
  }, []);

  return (
    <div>
      <div className="admin-dash-outlet-heading-block">
        <h2 className="admin-dash-page-title">Content preview</h2>
        <p className="admin-dash-page-lede">Recent newsletter drafts and sent issues.</p>
      </div>
      {rows.length === 0 ? (
        <p className="admin-dash-section-empty m-0">No newsletters yet.</p>
      ) : (
        <div className="space-y-3">
          {rows.map((row) => (
            <article key={row.id} className="admin-list-card">
              <h3 className="admin-list-card-title">{row.subject_line}</h3>
              <p className="admin-list-card-meta">
                {(row.teams && `${row.teams.city} ${row.teams.name}`) || 'Unknown team'} ·{' '}
                <span className="hero-chip inline align-middle">{row.status}</span>
                {' · '}
                {new Date(row.created_at).toLocaleString()}
              </p>
            </article>
          ))}
        </div>
      )}
    </div>
  );
}
