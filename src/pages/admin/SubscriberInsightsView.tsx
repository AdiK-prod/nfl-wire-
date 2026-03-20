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
      <h2 className="text-lg font-semibold text-[var(--ink)]">Subscriber Insights</h2>
      <div className="grid grid-cols-2 gap-3 mt-3 mb-4">
        <Stat label="Active subscribers" value={totalActive} />
        <Stat label="Opens (24h)" value={opened24h} />
      </div>
      <div className="space-y-2">
        {byTeam.map((row) => (
          <div key={row.team_id} className="rounded-lg border border-[var(--border)] bg-[var(--bg)] p-3 text-sm">
            {(row.teams && `${row.teams.city} ${row.teams.name}`) || row.team_id}: {row.count}
          </div>
        ))}
      </div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-lg border border-[var(--border)] bg-[var(--bg)] p-3">
      <p className="text-xs text-[var(--ink-muted)]">{label}</p>
      <p className="text-xl font-bold text-[var(--ink)]">{value}</p>
    </div>
  );
}
