import React, { useEffect, useMemo, useState } from 'react';
import { supabase } from '../../lib/supabase';

type TeamSubs = {
  team_id: string;
  count: number;
  teams: { city: string; name: string } | null;
};

type MetricDef =
  | { label: string; value: number; emptyHint?: string }
  | { label: string; value: null };

export default function SubscriberInsightsView() {
  const [totalActive, setTotalActive] = useState(0);
  const [opened24h, setOpened24h] = useState(0);
  const [byTeam, setByTeam] = useState<TeamSubs[]>([]);

  useEffect(() => {
    const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
    Promise.all([
      supabase.from('subscribers').select('*', { count: 'exact', head: true }).eq('is_active', true),
      supabase.from('newsletter_metrics').select('*', { count: 'exact', head: true }).gte('opened_at', since),
      supabase.from('subscribers').select('team_id, teams(city,name)').eq('is_active', true),
    ]).then(([subsCount, opensCount, subs]) => {
      setTotalActive(subsCount.count ?? 0);
      setOpened24h(opensCount.count ?? 0);
      const map = new Map<string, TeamSubs>();
      ((subs.data ?? []) as Array<{ team_id: string; teams: { city: string; name: string } | null }>).forEach((row) => {
        const current = map.get(row.team_id);
        if (current) current.count += 1;
        else map.set(row.team_id, { team_id: row.team_id, teams: row.teams, count: 1 });
      });
      setByTeam(Array.from(map.values()).sort((a, b) => b.count - a.count));
    });
  }, []);

  const metrics = useMemo<MetricDef[]>(
    () => [
      {
        label: 'Active subscribers',
        value: totalActive,
        emptyHint: 'No subscribers yet. Share your landing page to get started.',
      },
      {
        label: 'Opens (24h)',
        value: opened24h,
        emptyHint: 'No opens recorded in the last 24 hours.',
      },
      { label: 'Day 1 Open Rate', value: null },
      { label: '5-of-7 Weekly Engagement Rate', value: null },
      { label: '👍 Satisfaction Rate', value: null },
      { label: 'Churned This Week', value: null },
    ],
    [totalActive, opened24h],
  );

  return (
    <div>
      <h2 className="admin-dash-page-title">Subscriber insights</h2>
      <p className="admin-dash-page-lede">Active subscriptions, engagement targets, and opens.</p>

      <div className="admin-dash-metric-grid">
        {metrics.map((m) => (
          <InsightMetricCard key={m.label} metric={m} />
        ))}
      </div>

      <div className="admin-dash-by-team">
        <hr className="admin-dash-by-team-rule" aria-hidden />
        <p className="admin-dash-by-team-label">By team</p>
        {byTeam.length === 0 ? (
          <p className="admin-dash-by-team-empty">No subscriber data by team yet.</p>
        ) : (
          <div className="space-y-3">
            {byTeam.map((row) => (
              <div key={row.team_id} className="admin-list-card flex items-center justify-between gap-4">
                <span className="text-sm font-medium text-[var(--ink)]">
                  {(row.teams && `${row.teams.city} ${row.teams.name}`) || row.team_id}
                </span>
                <span className="admin-dash-metric-value text-xl tabular-nums">{row.count}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function InsightMetricCard({ metric }: { metric: MetricDef }) {
  if (metric.value === null) {
    return (
      <div className="admin-dash-metric-card">
        <p className="admin-dash-metric-label">{metric.label}</p>
        <p className="admin-dash-metric-value">—</p>
      </div>
    );
  }

  const showEmpty = metric.value === 0 && metric.emptyHint;

  return (
    <div className="admin-dash-metric-card">
      <p className="admin-dash-metric-label">{metric.label}</p>
      <p className="admin-dash-metric-value">{metric.value}</p>
      {showEmpty ? <p className="admin-dash-metric-empty">{metric.emptyHint}</p> : null}
    </div>
  );
}
