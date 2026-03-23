import React, { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';
import type { Source } from '../../types/database';

export default function SourceQueueView() {
  const [sources, setSources] = useState<Source[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [validatingId, setValidatingId] = useState<string | null>(null);
  const [removingId, setRemovingId] = useState<string | null>(null);

  const loadSources = async () => {
    setLoading(true);
    setError(null);
    const { data, error: loadError } = await supabase
      .from('sources')
      .select('*')
      .in('status', ['pending', 'flagged', 'approved'])
      .order('updated_at', { ascending: false })
      .limit(100);

    if (loadError) {
      setSources([]);
      setError(loadError.message);
      setLoading(false);
      return;
    }

    setSources((data as Source[]) ?? []);
    setLoading(false);
  };

  useEffect(() => {
    void loadSources();
  }, []);

  const onValidateSource = async (sourceId: string) => {
    setNotice(null);
    setError(null);
    setValidatingId(sourceId);

    try {
      const { data: invokeData, error: invokeError } = await supabase.functions.invoke('validate-source', {
        body: { source_id: sourceId },
      });

      if (invokeError) {
        throw new Error(invokeError.message);
      }

      const { data: refreshedRow, error: rowError } = await supabase
        .from('sources')
        .select('*')
        .eq('id', sourceId)
        .single();

      if (rowError) {
        throw new Error(rowError.message);
      }

      setSources((prev) => prev.map((row) => (row.id === sourceId ? (refreshedRow as Source) : row)));

      const nextStatus =
        typeof (invokeData as { status?: unknown } | null)?.status === 'string'
          ? (invokeData as { status: string }).status
          : (refreshedRow as Source).status;

      setNotice(`Validation completed for source (${nextStatus}).`);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to validate source');
    } finally {
      setValidatingId(null);
    }
  };

  const onRemoveSource = async (source: Source) => {
    setNotice(null);
    setError(null);
    const confirmed = window.confirm(
      `Remove source "${source.name}"?\n\nThis action permanently deletes the source.`,
    );
    if (!confirmed) return;

    setRemovingId(source.id);
    try {
      const { error: deleteError } = await supabase.from('sources').delete().eq('id', source.id);
      if (deleteError) {
        throw new Error(deleteError.message);
      }

      setSources((prev) => prev.filter((row) => row.id !== source.id));
      setNotice('Source removed.');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to remove source');
    } finally {
      setRemovingId(null);
    }
  };

  return (
    <div>
      <div className="admin-dash-outlet-heading-block">
        <h2 className="admin-dash-page-title">Source queue</h2>
        <p className="admin-dash-page-lede">Review pending, flagged, and approved sources.</p>
      </div>

      {error && (
        <p className="form-help error m-0 mb-4" role="alert">
          {error}
        </p>
      )}
      {notice && (
        <p className="form-help m-0 mb-4" role="status">
          {notice}
        </p>
      )}

      {loading ? (
        <p className="admin-dash-section-empty m-0">Loading sources…</p>
      ) : sources.length === 0 ? (
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
                <th>Actions</th>
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
                  <td>
                    <div className="flex flex-wrap gap-2">
                      <button
                        type="button"
                        className="admin-btn-secondary"
                        onClick={() => void onValidateSource(source.id)}
                        disabled={Boolean(validatingId || removingId)}
                      >
                        {validatingId === source.id ? 'Validating…' : 'Validate'}
                      </button>
                      <button
                        type="button"
                        className="admin-btn-secondary"
                        onClick={() => void onRemoveSource(source)}
                        disabled={Boolean(validatingId || removingId)}
                      >
                        {removingId === source.id ? 'Removing…' : 'Remove'}
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
