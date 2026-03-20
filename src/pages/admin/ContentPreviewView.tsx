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
      <h2 className="text-lg font-semibold text-[var(--ink)]">Content Preview</h2>
      <p className="text-sm text-[var(--ink-muted)] mb-3">Recent newsletter drafts and sent issues.</p>
      <div className="space-y-2">
        {rows.map((row) => (
          <div key={row.id} className="rounded-lg border border-[var(--border)] bg-[var(--bg)] p-3">
            <p className="font-medium text-[var(--ink)]">{row.subject_line}</p>
            <p className="text-xs text-[var(--ink-muted)] mt-1">
              {(row.teams && `${row.teams.city} ${row.teams.name}`) || 'Unknown team'} · {row.status} ·{' '}
              {new Date(row.created_at).toLocaleString()}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}
