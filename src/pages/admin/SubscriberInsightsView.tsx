import React, { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';

type TeamSubs = {
  team_id: string;
  count: number;
  teams: { city: string; name: string } | null;
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

  return (
    <div>
      <h2 className="admin-section-title">Subscriber insights</h2>
      <p className="admin-section-lede">Active subscriptions and recent opens.</p>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-6">
        <Stat label="Active subscribers" value={totalActive} />
        <Stat label="Opens (24h)" value={opened24h} />
      </div>
      <p className="picker-label mb-3">By team</p>
      <div className="space-y-3">
        {byTeam.map((row) => (
          <div key={row.team_id} className="admin-list-card flex items-center justify-between gap-4">
            <span className="text-sm font-medium text-[var(--ink)]">
              {(row.teams && `${row.teams.city} ${row.teams.name}`) || row.team_id}
            </span>
            <span className="admin-stat-value text-xl tabular-nums">{row.count}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="admin-stat-card">
      <p className="admin-stat-label">{label}</p>
      <p className="admin-stat-value">{value}</p>
    </div>
  );
}
