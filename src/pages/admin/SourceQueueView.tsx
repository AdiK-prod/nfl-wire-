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
      <h2 className="admin-dash-page-title">Source queue</h2>
      <p className="admin-dash-page-lede">Review pending, flagged, and approved sources.</p>
      {sources.length === 0 ? (
        <p className="admin-dash-section-empty m-0">No sources to show yet.</p>
      ) : (
        <div className="admin-table-wrap">
          <table className="admin-table">
            <thead>
              <tr>
                <th>Name</th>
                <th>Type</th>
                <th>Status</th>
                <th>URL</th>
              </tr>
            </thead>
            <tbody>
              {sources.map((source) => (
                <tr key={source.id}>
                  <td className="font-medium text-[var(--ink)]">{source.name}</td>
                  <td>{source.type}</td>
                  <td>
                    <span className="hero-chip inline-block">{source.status}</span>
                  </td>
                  <td className="truncate max-w-[min(360px,40vw)]">{source.url}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
