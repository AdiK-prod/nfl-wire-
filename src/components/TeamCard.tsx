import React from 'react';
import { useNavigate } from 'react-router-dom';
import type { Team } from '../types/database';

interface TeamCardProps {
  team: Team;
}

export default function TeamCard({ team }: TeamCardProps) {
  const navigate = useNavigate();
  const displayName = `${team.city} ${team.name}`;

  const handleClick = () => {
    navigate(`/signup?team=${encodeURIComponent(team.slug)}`);
  };

  return (
    <button
      type="button"
      onClick={handleClick}
      className="flex flex-col items-center gap-3 p-4 rounded-xl border-2 bg-slate-900/60 text-left transition-all duration-200 hover:scale-105 hover:shadow-xl focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950"
      style={{
        borderColor: team.primary_color,
        boxShadow: `0 0 0 1px ${team.primary_color}20`,
      }}
      aria-label={`Choose ${displayName}`}
    >
      <div
        className="w-16 h-16 rounded-full flex items-center justify-center text-xl font-bold text-white shrink-0"
        style={{ backgroundColor: team.primary_color }}
      >
        {team.logo_url ? (
          <img
            src={team.logo_url}
            alt=""
            className="w-full h-full rounded-full object-contain"
          />
        ) : (
          <span style={{ color: team.secondary_color || '#fff' }}>
            {team.abbreviation.slice(0, 2)}
          </span>
        )}
      </div>
      <span className="font-ui font-semibold text-slate-100 text-sm sm:text-base text-center">
        {displayName}
      </span>
    </button>
  );
}
