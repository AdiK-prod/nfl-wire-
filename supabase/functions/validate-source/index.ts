import { supabase } from '../_shared/supabase-client.ts';
import { callClaudeJSON } from '../_shared/anthropic-client.ts';
import { notifyAdmin } from '../_shared/notify-admin.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface ReachabilityResult {
  reachable: boolean;
  reason?: string;
}

async function checkReachability(url: string): Promise<ReachabilityResult> {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10_000);

    const response = await fetch(url, {
      method: 'HEAD',
      signal: controller.signal,
      headers: { 'User-Agent': 'NFL Wire Bot/1.0' },
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      return { reachable: false, reason: `HTTP ${response.status}` };
    }

    const contentType = response.headers.get('content-type') ?? '';
    if (
      !contentType.includes('html') &&
      !contentType.includes('xml') &&
      !contentType.includes('rss')
    ) {
      return { reachable: false, reason: 'Invalid content type' };
    }

    return { reachable: true };
  } catch (error) {
    if (error instanceof DOMException && error.name === 'AbortError') {
      return { reachable: false, reason: 'Timeout after 10s' };
    }
    return { reachable: false, reason: (error as Error).message };
  }
}

interface RelevanceResult {
  relevant: boolean;
  confidence: number;
  reason?: string;
}

async function checkTeamRelevance(url: string, teamName: string): Promise<RelevanceResult> {
  const response = await fetch(url);
  const html = await response.text();

  const textContent = html
    .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 4000);

  const letters = textContent.match(/[a-zA-Z]/g) ?? [];
  const englishRatio = letters.length / Math.max(textContent.length, 1);
  if (englishRatio < 0.7) {
    return {
      relevant: false,
      confidence: 0,
      reason: 'Non-English content detected',
    };
  }

  const prompt = [
    `Analyze if the following content contains news specifically about the ${teamName} NFL team.`,
    'Consider mentions of team name, players, coaches, games, transactions.',
    'Reply with JSON only: { "relevant": true/false, "confidence": 0-100 }',
    '',
    `Content: ${textContent}`,
  ].join('\n');

  const parsed = await callClaudeJSON<{ relevant: boolean; confidence: number }>([
    { role: 'user', content: prompt },
  ]);

  const confidence = parsed.confidence ?? 0;
  const relevant = !!parsed.relevant && confidence >= 60;

  return { relevant, confidence };
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: corsHeaders });
  }

  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  try {
    const { source_id } = await req.json();
    if (!source_id) {
      return new Response(JSON.stringify({ error: 'source_id is required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { data: source, error: sourceError } = await supabase
      .from('sources')
      .select('id, url, team_id, teams(name)')
      .eq('id', source_id)
      .single();

    if (sourceError || !source) {
      return new Response(JSON.stringify({ error: 'Source not found' }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const reachResult = await checkReachability(source.url);
    if (!reachResult.reachable) {
      await supabase
        .from('sources')
        .update({ status: 'rejected', relevance_score: 0 })
        .eq('id', source_id);

      return new Response(
        JSON.stringify({ status: 'rejected', reason: reachResult.reason }),
        {
          status: 200,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        },
      );
    }

    if (source.team_id) {
      const teamName =
        // deno-lint-ignore no-explicit-any
        ((source as any).teams?.name as string | undefined) ?? 'the team';
      const relevance = await checkTeamRelevance(source.url, teamName);

      const finalStatus = relevance.relevant ? 'approved' : 'flagged';

      await supabase
        .from('sources')
        .update({
          status: finalStatus,
          relevance_score: relevance.confidence,
        })
        .eq('id', source_id);

      if (finalStatus === 'flagged') {
        notifyAdmin({
          type: 'source_flagged',
          data: {
            url: source.url,
            teamName,
            confidence: relevance.confidence,
            reason: relevance.reason,
          },
        }).catch((err) => console.error('[validate-source] notifyAdmin failed', err));
      }

      return new Response(
        JSON.stringify({
          status: finalStatus,
          confidence: relevance.confidence,
        }),
        {
          status: 200,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        },
      );
    }

    await supabase
      .from('sources')
      .update({ status: 'approved', relevance_score: 100 })
      .eq('id', source_id);

    return new Response(JSON.stringify({ status: 'approved' }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('[validate-source] error', error);
    return new Response(
      JSON.stringify({ error: 'Internal error in validate-source' }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      },
    );
  }
});

