import React, { useEffect, useMemo, useState } from 'react';
import { supabase } from '../../lib/supabase';

type TeamSubs = {
  team_id: string;
  count: number;
  teams: { city: string; name: string; primary_color: string | null } | null;
};

type InsightVariant =
  | 'active'
  | 'opens'
  | 'day1'
  | 'weekly'
  | 'satisfaction'
  | 'churn';

type MetricDef =
  | {
      label: string;
      value: number;
      emptyHint?: string;
      variant: InsightVariant;
      target?: string;
    }
  | {
      label: string;
      value: null;
      variant: InsightVariant;
      target: string;
    };

export default function SubscriberInsightsView() {
  const [totalActive, setTotalActive] = useState(0);
  const [opened24h, setOpened24h] = useState(0);
  const [byTeam, setByTeam] = useState<TeamSubs[]>([]);

  useEffect(() => {
    const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
    Promise.all([
      supabase.from('subscribers').select('*', { count: 'exact', head: true }).eq('is_active', true),
      supabase.from('newsletter_metrics').select('*', { count: 'exact', head: true }).gte('opened_at', since),
      supabase.from('subscribers').select('team_id, teams(city,name,primary_color)').eq('is_active', true),
    ]).then(([subsCount, opensCount, subs]) => {
      setTotalActive(subsCount.count ?? 0);
      setOpened24h(opensCount.count ?? 0);
      const map = new Map<string, TeamSubs>();
      (
        (subs.data ?? []) as Array<{
          team_id: string;
          teams: { city: string; name: string; primary_color: string | null } | null;
        }>
      ).forEach((row) => {
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
        variant: 'active',
      },
      {
        label: 'Opens (24h)',
        value: opened24h,
        emptyHint: 'No opens recorded in the last 24 hours.',
        variant: 'opens',
      },
      { label: 'Day 1 Open Rate', value: null, variant: 'day1', target: 'Target: >50%' },
      { label: '5-of-7 Weekly Engagement Rate', value: null, variant: 'weekly', target: 'Target: >40%' },
      { label: '👍 Satisfaction Rate', value: null, variant: 'satisfaction', target: 'Target: >70%' },
      { label: 'Churned This Week', value: null, variant: 'churn', target: '' },
    ],
    [totalActive, opened24h],
  );

  return (
    <div>
      <div className="admin-dash-outlet-heading-block">
        <h2 className="admin-dash-page-title">Subscriber insights</h2>
        <p className="admin-dash-page-lede">Active subscriptions, engagement targets, and opens.</p>
      </div>

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
          <div className="admin-dash-by-team-list">
            {byTeam.map((row) => {
              const accent = row.teams?.primary_color ?? '#111111';
              const name = (row.teams && `${row.teams.city} ${row.teams.name}`) || row.team_id;
              return (
                <div
                  key={row.team_id}
                  className="admin-dash-team-row"
                  style={{ '--team-accent': accent } as React.CSSProperties}
                >
                  <div className="admin-dash-team-row-left">
                    <span className="admin-dash-team-dot" aria-hidden />
                    <span className="admin-dash-team-name">{name}</span>
                  </div>
                  <div className="admin-dash-team-row-right">
                    <span className="admin-dash-team-count">{row.count}</span>
                    <span className="admin-dash-team-sublabel">subscribers</span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

function InsightMetricCard({ metric }: { metric: MetricDef }) {
  if (metric.value === null) {
    return (
      <div className={`admin-dash-metric-card admin-dash-metric-card--${metric.variant}`}>
        <p className="admin-dash-metric-label">{metric.label}</p>
        <p className="admin-dash-metric-value admin-dash-metric-value--placeholder">—</p>
        {metric.target ? <p className="admin-dash-metric-target">{metric.target}</p> : null}
      </div>
    );
  }

  const showEmpty = metric.value === 0 && metric.emptyHint;
  const churnHot = metric.variant === 'churn' && metric.value > 0;

  return (
    <div className={`admin-dash-metric-card admin-dash-metric-card--${metric.variant}`}>
      <p className="admin-dash-metric-label">{metric.label}</p>
      <p className={`admin-dash-metric-value${churnHot ? ' admin-dash-metric-value--alert' : ''}`}>
        {metric.value}
      </p>
      {metric.target ? <p className="admin-dash-metric-target">{metric.target}</p> : null}
      {showEmpty ? <p className="admin-dash-metric-empty">{metric.emptyHint}</p> : null}
    </div>
  );
}
