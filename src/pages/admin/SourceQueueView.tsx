import React, { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';
import type { Source } from '../../types/database';

export default function SourceQueueView() {
  const [sources, setSources] = useState<Source[]>([]);

  useEffect(() => {
    supabase
      .from('sources')
      .select('*')
      .in('status', ['pending', 'flagged', 'approved'])
      .order('updated_at', { ascending: false })
      .limit(100)
      .then(({ data }) => setSources((data as Source[]) ?? []));
  }, []);

  return (
    <div>
      <h2 className="text-lg font-semibold text-[var(--ink)]">Source Queue</h2>
      <p className="text-sm text-[var(--ink-muted)] mb-3">Review pending, flagged, and approved sources.</p>
      <div className="overflow-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-[var(--ink-muted)]">
              <th className="py-2">Name</th>
              <th className="py-2">Type</th>
              <th className="py-2">Status</th>
              <th className="py-2">URL</th>
            </tr>
          </thead>
          <tbody>
            {sources.map((source) => (
              <tr key={source.id} className="border-t border-[var(--border)]">
                <td className="py-2">{source.name}</td>
                <td className="py-2">{source.type}</td>
                <td className="py-2">{source.status}</td>
                <td className="py-2 truncate max-w-[360px]">{source.url}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
