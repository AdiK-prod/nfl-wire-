import { supabase } from '../supabase';

export async function ensureTeamActive(teamId: string): Promise<void> {
  const { error } = await supabase.from('teams').update({ is_active: true }).eq('id', teamId);
  if (error) {
    throw new Error(`Failed to activate team for subscription: ${error.message}`);
  }
}

export async function ensureTeamsActive(teamIds: string[]): Promise<void> {
  const uniqueTeamIds = Array.from(new Set(teamIds));
  for (const teamId of uniqueTeamIds) {
    await ensureTeamActive(teamId);
  }
}

