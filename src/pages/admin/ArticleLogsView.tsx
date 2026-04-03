import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { supabase } from '../../lib/supabase';

type TeamOption = {
  id: string;
  city: string;
  name: string;
  abbreviation: string;
};

type PipelineRunRow = {
  id: string;
  team_id: string;
  run_at: string;
  articles_fetched: number;
  articles_passed_quality_gate: number;
  articles_scored: number;
  articles_selected: number;
  status: string;
  notes: string | null;
};

type ArticleScoreLogRow = {
  id: string;
  pipeline_run_id: string;
  article_id: string;
  team_id: string;
  source_id: string;
  source_name: string;
  fetch_date: string;
  headline: string;
  original_url: string;
  word_count: number | null;
  relevance_score: number | null;
  significance_score: number | null;
  credibility_score: number | null;
  uniqueness_score: number | null;
  composite_score: number;
  selection_reasoning: string | null;
  passed_quality_gate: boolean;
  passed_threshold: boolean;
  rejection_reason: string | null;
  threshold_at_time: number | null;
  summary_generated: boolean;
  sources: { name: string; type: string } | null;
  teams: { city: string; name: string; primary_color: string } | null;
};

type SourceOption = { id: string; name: string };

type StatusFilter = 'all' | 'passed' | 'rejected' | 'duplicate' | 'paywall';

function todayLocalYmd(): string {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

/** Local calendar day → ISO bounds for filtering `run_at` timestamps. */
function localDayBoundsIso(ymd: string): { start: string; end: string } {
  const [y, m, d] = ymd.split('-').map(Number);
  if (!y || !m || !d) {
    const fallback = new Date();
    const s = new Date(fallback.getFullYear(), fallback.getMonth(), fallback.getDate(), 0, 0, 0, 0);
    const e = new Date(fallback.getFullYear(), fallback.getMonth(), fallback.getDate(), 23, 59, 59, 999);
    return { start: s.toISOString(), end: e.toISOString() };
  }
  const start = new Date(y, m - 1, d, 0, 0, 0, 0);
  const end = new Date(y, m - 1, d, 23, 59, 59, 999);
  return { start: start.toISOString(), end: end.toISOString() };
}

function scoreTone(score: number | null | undefined): 'high' | 'mid' | 'low' {
  if (score == null || Number.isNaN(score)) return 'low';
  if (score >= 80) return 'high';
  if (score >= 60) return 'mid';
  return 'low';
}

function compositeBadgeClass(score: number): string {
  const t = scoreTone(score);
  if (t === 'high') return 'admin-article-log-composite admin-article-log-composite--high';
  if (t === 'mid') return 'admin-article-log-composite admin-article-log-composite--mid';
  return 'admin-article-log-composite admin-article-log-composite--low';
}

function rowAccentClass(row: ArticleScoreLogRow): string {
  if (row.rejection_reason === 'duplicate') return 'admin-article-log-row--accent-amber';
  if (row.rejection_reason === 'paywall' || row.rejection_reason === 'not_relevant') {
    return 'admin-article-log-row--accent-muted';
  }
  if (row.passed_threshold) return 'admin-article-log-row--accent-green';
  if (row.rejection_reason === 'below_threshold') return 'admin-article-log-row--accent-red';
  return 'admin-article-log-row--accent-muted';
}

function rowSurfaceClass(row: ArticleScoreLogRow): string {
  if (row.passed_threshold) return 'admin-article-log-row--surface-pass';
  return '';
}

function displayStatus(row: ArticleScoreLogRow): string {
  if (row.rejection_reason === 'duplicate') return 'duplicate';
  if (row.rejection_reason === 'paywall') return 'paywall';
  if (row.passed_threshold) return 'passed';
  return 'rejected';
}

function matchesStatusFilter(row: ArticleScoreLogRow, filter: StatusFilter): boolean {
  if (filter === 'all') return true;
  if (filter === 'passed') return row.passed_threshold === true;
  if (filter === 'duplicate') return row.rejection_reason === 'duplicate';
  if (filter === 'paywall') return row.rejection_reason === 'paywall';
  if (filter === 'rejected') {
    return (
      row.passed_threshold === false &&
      row.rejection_reason !== 'duplicate' &&
      row.rejection_reason !== 'paywall'
    );
  }
  return true;
}

function formatRunWhen(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleString(undefined, {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

function formatFetchMeta(dateStr: string): string {
  const d = new Date(`${dateStr}T12:00:00`);
  return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
}

export default function ArticleLogsView() {
  const [teams, setTeams] = useState<TeamOption[]>([]);
  const [selectedTeamId, setSelectedTeamId] = useState<string>('');
  const [selectedDate, setSelectedDate] = useState<string>(todayLocalYmd);
  const [sourceOptions, setSourceOptions] = useState<SourceOption[]>([]);
  const [selectedSourceId, setSelectedSourceId] = useState<string>('all');
  const [scoreMin, setScoreMin] = useState<string>('0');
  const [scoreMax, setScoreMax] = useState<string>('100');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');

  const [runSummary, setRunSummary] = useState<PipelineRunRow | null>(null);
  const [logsRaw, setLogsRaw] = useState<ArticleScoreLogRow[]>([]);
  const [pipelineRunCount, setPipelineRunCount] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [expandedReason, setExpandedReason] = useState<Record<string, boolean>>({});

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const { data, error } = await supabase
        .from('teams')
        .select('id,city,name,abbreviation')
        .eq('is_active', true)
        .order('city');
      if (cancelled) return;
      if (error) {
        setLoadError(error.message);
        setTeams([]);
        return;
      }
      const list = (data ?? []) as TeamOption[];
      setTeams(list);
      setSelectedTeamId((prev) => prev || (list[0]?.id ?? ''));
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const { count, error } = await supabase.from('pipeline_runs').select('*', { count: 'exact', head: true });
      if (cancelled) return;
      if (error) {
        setPipelineRunCount(0);
        return;
      }
      setPipelineRunCount(count ?? 0);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!selectedTeamId) return;
    let cancelled = false;
    (async () => {
      const { data, error } = await supabase
        .from('sources')
        .select('id,name')
        .or(`team_id.is.null,team_id.eq.${selectedTeamId}`)
        .order('name');
      if (cancelled) return;
      if (error) {
        setSourceOptions([]);
        return;
      }
      setSourceOptions((data ?? []) as SourceOption[]);
    })();
    return () => {
      cancelled = true;
    };
  }, [selectedTeamId]);

  const loadRunAndLogs = useCallback(async () => {
    if (!selectedTeamId) {
      setLoading(false);
      return;
    }
    setLoading(true);
    const { start, end } = localDayBoundsIso(selectedDate);

    const [runRes, logsRes] = await Promise.all([
      supabase
        .from('pipeline_runs')
        .select('*')
        .eq('team_id', selectedTeamId)
        .gte('run_at', start)
        .lte('run_at', end)
        .order('run_at', { ascending: false })
        .limit(1)
        .maybeSingle(),
      supabase
        .from('article_scores_log')
        .select(
          `
          *,
          sources(name, type),
          teams(city, name, primary_color)
        `,
        )
        .eq('team_id', selectedTeamId)
        .eq('fetch_date', selectedDate)
        .order('composite_score', { ascending: false }),
    ]);

    if (runRes.error?.message.includes('does not exist') || logsRes.error?.message.includes('does not exist')) {
      setLoadError('Article log tables are not deployed yet. Apply migration 0020 in Supabase.');
      setRunSummary(null);
      setLogsRaw([]);
      setLoading(false);
      return;
    }

    if (runRes.error || logsRes.error) {
      const err = runRes.error ?? logsRes.error;
      setLoadError(err?.message ?? 'Failed to load article logs');
      setRunSummary(null);
      setLogsRaw([]);
      setLoading(false);
      return;
    }

    setLoadError(null);
    setRunSummary((runRes.data as PipelineRunRow | null) ?? null);
    setLogsRaw((logsRes.data as ArticleScoreLogRow[]) ?? []);
    setLoading(false);
  }, [selectedTeamId, selectedDate]);

  useEffect(() => {
    void loadRunAndLogs();
  }, [loadRunAndLogs]);

  const selectedTeam = useMemo(
    () => teams.find((t) => t.id === selectedTeamId) ?? null,
    [teams, selectedTeamId],
  );

  const teamLabel = selectedTeam ? `${selectedTeam.city} ${selectedTeam.name}` : '—';

  const minN = Number.parseInt(scoreMin, 10);
  const maxN = Number.parseInt(scoreMax, 10);
  const minOk = !Number.isNaN(minN) ? minN : 0;
  const maxOk = !Number.isNaN(maxN) ? maxN : 100;

  const filteredLogs = useMemo(() => {
    return logsRaw.filter((row) => {
      if (selectedSourceId !== 'all' && row.source_id !== selectedSourceId) return false;
      const c = row.composite_score;
      if (c < minOk || c > maxOk) return false;
      if (!matchesStatusFilter(row, statusFilter)) return false;
      return true;
    });
  }, [logsRaw, selectedSourceId, minOk, maxOk, statusFilter]);

  const globalEmpty = pipelineRunCount === 0;
  const countReady = pipelineRunCount !== null;
  const noDataForSelection = !loading && !globalEmpty && logsRaw.length === 0 && !runSummary;

  const emptyMessage = useMemo(() => {
    if (loadError) return null;
    if (loading) return null;
    if (globalEmpty) return null;
    if (noDataForSelection) {
      return 'No pipeline runs recorded for this team and date.';
    }
    if (filteredLogs.length === 0 && logsRaw.length > 0) {
      return 'No articles match these filters.\nTry adjusting the score range or date.';
    }
    return null;
  }, [loadError, loading, globalEmpty, noDataForSelection, filteredLogs.length, logsRaw.length]);

  const toggleReason = (id: string) => {
    setExpandedReason((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  return (
    <div>
      <div className="admin-dash-outlet-heading-block">
        <h2 className="admin-dash-page-title">Article logs</h2>
        <p className="admin-dash-page-lede">
          Read-only pipeline scoring and selection history — no mutations or triggers. Rows appear after each{' '}
          <code className="text-xs">run-content-pipeline</code> execution; fetch date matches the
          pipeline&apos;s UTC run day — if you see nothing for &quot;today&quot;, try yesterday or the day your cron
          last ran (see date picker).
        </p>
      </div>

      {loadError ? (
        <p className="admin-article-log-empty">{loadError}</p>
      ) : null}

      {!loadError && !countReady ? (
        <p className="admin-dash-section-empty m-0 border-none bg-transparent">Loading…</p>
      ) : null}

      {!loadError && countReady && globalEmpty && !loading ? (
        <p className="admin-article-log-empty admin-article-log-empty--tall">
          No pipeline runs recorded yet.
          <br />
          Article logs will appear after the first pipeline execution.
        </p>
      ) : null}

      {!loadError && countReady && !globalEmpty ? (
        <>
          <section className="admin-article-log-run-card" aria-labelledby="article-log-run-heading">
            <div className="admin-article-log-run-top">
              <div>
                <p id="article-log-run-heading" className="admin-article-log-run-line">
                  <span className="admin-article-log-run-label">Run:</span>{' '}
                  {runSummary
                    ? formatRunWhen(runSummary.run_at)
                    : loading
                      ? '…'
                      : 'No run for this date'}
                </p>
                <p className="admin-article-log-run-line">
                  <span className="admin-article-log-run-label">Team:</span> {teamLabel}
                </p>
              </div>
            </div>
            <div className="admin-article-log-run-grid">
              <div>
                <p className="admin-article-log-run-stat">
                  {loading && !runSummary ? '—' : (runSummary?.articles_fetched ?? 0)}
                </p>
                <p className="admin-article-log-run-stat-label">Fetched</p>
              </div>
              <div>
                <p className="admin-article-log-run-stat">
                  {loading && !runSummary ? '—' : (runSummary?.articles_passed_quality_gate ?? 0)}
                </p>
                <p className="admin-article-log-run-stat-label">Quality gate</p>
              </div>
              <div>
                <p className="admin-article-log-run-stat">
                  {loading && !runSummary ? '—' : (runSummary?.articles_scored ?? 0)}
                </p>
                <p className="admin-article-log-run-stat-label">Scored</p>
              </div>
              <div>
                <p
                  className={`admin-article-log-run-stat${
                    (runSummary?.articles_selected ?? 0) === 0 ? ' admin-article-log-run-stat--alert' : ''
                  }${
                    (runSummary?.articles_selected ?? 0) > 0 ? ' admin-article-log-run-stat--ok' : ''
                  }`}
                >
                  {loading && !runSummary ? '—' : (runSummary?.articles_selected ?? 0)}
                </p>
                <p className="admin-article-log-run-stat-label">Selected</p>
              </div>
            </div>
          </section>

          <div className="admin-article-log-filters">
            <div className="admin-article-log-filter">
              <label className="admin-article-log-filter-label" htmlFor="article-log-team">
                Team
              </label>
              <select
                id="article-log-team"
                className="admin-article-log-filter-control"
                value={selectedTeamId}
                onChange={(e) => {
                  setSelectedTeamId(e.target.value);
                  setSelectedSourceId('all');
                }}
              >
                {teams.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.city} {t.name} ({t.abbreviation})
                  </option>
                ))}
              </select>
            </div>
            <div className="admin-article-log-filter">
              <label className="admin-article-log-filter-label" htmlFor="article-log-date">
                Date
              </label>
              <input
                id="article-log-date"
                type="date"
                className="admin-article-log-filter-control"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
              />
            </div>
            <div className="admin-article-log-filter">
              <label className="admin-article-log-filter-label" htmlFor="article-log-source">
                Source
              </label>
              <select
                id="article-log-source"
                className="admin-article-log-filter-control"
                value={selectedSourceId}
                onChange={(e) => setSelectedSourceId(e.target.value)}
              >
                <option value="all">All sources</option>
                {sourceOptions.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </select>
            </div>
            <div className="admin-article-log-filter admin-article-log-filter--range">
              <span className="admin-article-log-filter-label">Score range</span>
              <div className="admin-article-log-range-inputs">
                <input
                  type="number"
                  min={0}
                  max={100}
                  className="admin-article-log-filter-control admin-article-log-filter-control--num"
                  aria-label="Minimum composite score"
                  value={scoreMin}
                  onChange={(e) => setScoreMin(e.target.value)}
                />
                <span className="admin-article-log-range-sep">–</span>
                <input
                  type="number"
                  min={0}
                  max={100}
                  className="admin-article-log-filter-control admin-article-log-filter-control--num"
                  aria-label="Maximum composite score"
                  value={scoreMax}
                  onChange={(e) => setScoreMax(e.target.value)}
                />
              </div>
            </div>
            <div className="admin-article-log-filter">
              <label className="admin-article-log-filter-label" htmlFor="article-log-status">
                Status
              </label>
              <select
                id="article-log-status"
                className="admin-article-log-filter-control"
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value as StatusFilter)}
              >
                <option value="all">All</option>
                <option value="passed">Passed</option>
                <option value="rejected">Rejected</option>
                <option value="duplicate">Duplicate</option>
                <option value="paywall">Paywall</option>
              </select>
            </div>
          </div>

          {emptyMessage && !loading ? (
            <p className="admin-article-log-empty admin-article-log-empty--tall whitespace-pre-line">{emptyMessage}</p>
          ) : null}

          {loading && !logsRaw.length ? (
            <p className="admin-dash-section-empty m-0 border-none bg-transparent">Loading article logs…</p>
          ) : null}

          {!loading && filteredLogs.length > 0 ? (
            <ul className="admin-article-log-list">
              {filteredLogs.map((row) => {
                const sourceLabel = row.sources?.name ?? row.source_name;
                const reasoning = row.selection_reasoning?.trim() ?? '';
                const preview = reasoning.length > 100 ? `${reasoning.slice(0, 100)}…` : reasoning;
                const expanded = expandedReason[row.id];
                const status = displayStatus(row);
                return (
                  <li
                    key={row.id}
                    className={`admin-article-log-row ${rowAccentClass(row)} ${rowSurfaceClass(row)}`}
                  >
                    <div className="admin-article-log-row-inner">
                      <div className="admin-article-log-row-main">
                        <a
                          href={row.original_url}
                          target="_blank"
                          rel="noreferrer noopener"
                          className="admin-article-log-headline"
                        >
                          {row.headline}
                        </a>
                        <p className="admin-article-log-meta">
                          {sourceLabel} · {formatFetchMeta(row.fetch_date)} ·{' '}
                          {row.word_count != null ? `${row.word_count} words` : '— words'}
                        </p>
                        <div className="admin-article-log-scores">
                          <span className="admin-article-log-score-pair">
                            <span className="admin-article-log-score-label">REL</span>
                            <span className={`admin-article-log-score-val admin-article-log-score-val--${scoreTone(row.relevance_score)}`}>
                              {row.relevance_score ?? '—'}
                            </span>
                          </span>
                          <span className="admin-article-log-score-pair">
                            <span className="admin-article-log-score-label">SIG</span>
                            <span className={`admin-article-log-score-val admin-article-log-score-val--${scoreTone(row.significance_score)}`}>
                              {row.significance_score ?? '—'}
                            </span>
                          </span>
                          <span className="admin-article-log-score-pair">
                            <span className="admin-article-log-score-label">CRED</span>
                            <span className={`admin-article-log-score-val admin-article-log-score-val--${scoreTone(row.credibility_score)}`}>
                              {row.credibility_score ?? '—'}
                            </span>
                          </span>
                          <span className="admin-article-log-score-pair">
                            <span className="admin-article-log-score-label">UNI</span>
                            <span className={`admin-article-log-score-val admin-article-log-score-val--${scoreTone(row.uniqueness_score)}`}>
                              {row.uniqueness_score ?? '—'}
                            </span>
                          </span>
                        </div>
                        {reasoning ? (
                          <div className="admin-article-log-reasoning">
                            <p className="m-0">
                              {expanded ? reasoning : preview}
                              {!expanded && reasoning.length > 100 ? '…' : null}
                            </p>
                            {reasoning.length > 100 ? (
                              <button
                                type="button"
                                className="admin-article-log-expand"
                                onClick={() => toggleReason(row.id)}
                              >
                                {expanded ? 'Show less ▴' : 'Show more ▾'}
                              </button>
                            ) : null}
                          </div>
                        ) : null}
                      </div>
                      <div className="admin-article-log-row-badges">
                        <span className={`admin-article-log-status admin-article-log-status--${status}`}>
                          {status}
                        </span>
                        <span className={compositeBadgeClass(row.composite_score)}>
                          composite: {row.composite_score}
                        </span>
                      </div>
                    </div>
                  </li>
                );
              })}
            </ul>
          ) : null}
        </>
      ) : null}
    </div>
  );
}
