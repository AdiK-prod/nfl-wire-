import { supabase } from '../supabase';

interface SubmitSourceInput {
  url: string;
  name?: string;
  teamId: string | null;
  submittedBy?: string | null;
}

export async function submitSource(input: SubmitSourceInput) {
  const { url, name, teamId, submittedBy } = input;

  const existing = await supabase
    .from('sources')
    .select('id')
    .eq('url', url)
    .maybeSingle();

  if (existing.data) {
    return {
      ok: false as const,
      error: 'Source already exists.',
    };
  }

  const { data, error } = await supabase
    .from('sources')
    .insert({
      url,
      name: name ?? url,
      type: teamId ? 'user_submitted' : 'global',
      status: 'pending',
      team_id: teamId,
      submitted_by: submittedBy ?? null,
    })
    .select()
    .single();

  if (error) {
    return { ok: false as const, error: error.message };
  }

  // Kick off async validation via Supabase Edge Function.
  // Failure here should not block the user-facing submission.
  if (data?.id) {
    supabase.functions
      .invoke('validate-source', {
        body: { source_id: data.id },
      })
      .catch((fnError) => {
        console.error('[submitSource] validate-source failed', fnError);
      });
  }

  return { ok: true as const, source: data };
}

