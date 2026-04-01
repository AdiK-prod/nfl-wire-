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

function stripHtml(input: string): string {
  return input
    .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function extractFeedItems(xml: string): Array<{ title: string; description: string }> {
  const items: Array<{ title: string; description: string }> = [];
  const itemRegex = /<item[^>]*>([\s\S]*?)<\/item>/gi;
  let match: RegExpExecArray | null;
  while ((match = itemRegex.exec(xml)) !== null) {
    const block = match[1];
    const titleMatch = block.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
    const descriptionMatch = block.match(/<description[^>]*>([\s\S]*?)<\/description>/i);
    const title = (titleMatch?.[1] ?? '').replace(/<!\[CDATA\[([\s\S]*?)\]\]>/gi, '$1').trim();
    const description = (descriptionMatch?.[1] ?? '').replace(/<!\[CDATA\[([\s\S]*?)\]\]>/gi, '$1').trim();
    if (title) items.push({ title, description });
  }
  return items;
}

function buildTeamTerms(teamName: string): string[] {
  const terms = new Set<string>();
  const cleaned = teamName.toLowerCase().trim();
  const parts = cleaned.split(/\s+/).filter(Boolean);
  const city = parts.slice(0, -1).join(' ');
  const mascot = parts[parts.length - 1] ?? cleaned;
  if (cleaned) terms.add(cleaned);
  if (city) terms.add(city);
  if (mascot) terms.add(mascot);

  const aliases: Record<string, string[]> = {
    'chicago bears': ['da bears', 'chi'],
    'seattle seahawks': ['hawks', 'sea'],
    'san francisco 49ers': ['49ers', 'niners', 'sf'],
    'new england patriots': ['pats', 'ne'],
    'kansas city chiefs': ['kc'],
    'green bay packers': ['gb'],
    'new york giants': ['nyg'],
    'new york jets': ['nyj'],
  };
  (aliases[cleaned] ?? []).forEach((alias) => terms.add(alias));
  return [...terms].filter((t) => t.length >= 2);
}

function scoreTeamSpecificity(texts: string[], teamName: string): { ratio: number; hits: number; total: number } {
  const terms = buildTeamTerms(teamName);
  if (!texts.length) return { ratio: 0, hits: 0, total: 0 };
  let hits = 0;
  for (const text of texts) {
    const lower = text.toLowerCase();
    if (terms.some((term) => lower.includes(term))) hits += 1;
  }
  return { ratio: hits / texts.length, hits, total: texts.length };
}

async function checkTeamRelevance(url: string, teamName: string): Promise<RelevanceResult> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 12_000);
  const response = await fetch(url, { signal: controller.signal });
  clearTimeout(timeoutId);
  if (!response.ok) {
    return {
      relevant: false,
      confidence: 0,
      reason: `Failed to fetch source content: HTTP ${response.status}`,
    };
  }
  const body = await response.text();
  const lowerBody = body.toLowerCase();
  const looksLikeFeed = lowerBody.includes('<rss') || lowerBody.includes('<feed') || lowerBody.includes('<item>');

  // Deterministic feed-specific relevance check to prevent "global masquerading as team-specific".
  if (looksLikeFeed) {
    const feedItems = extractFeedItems(body).slice(0, 25);
    const sampleTexts = feedItems.map((it) => `${it.title} ${it.description}`).filter(Boolean);
    const specificity = scoreTeamSpecificity(sampleTexts, teamName);
    if (specificity.total === 0) {
      return {
        relevant: false,
        confidence: 0,
        reason: 'Feed has no parseable items for team relevance check',
      };
    }
    if (specificity.ratio < 0.3) {
      return {
        relevant: false,
        confidence: Math.round(specificity.ratio * 100),
        reason: `Feed appears non-team-specific (${specificity.hits}/${specificity.total} items mention ${teamName})`,
      };
    }
    // Strong deterministic pass for team-specific feeds.
    return {
      relevant: true,
      confidence: Math.min(100, Math.round(70 + specificity.ratio * 30)),
      reason: `Feed appears team-specific (${specificity.hits}/${specificity.total} items match ${teamName})`,
    };
  }

  const textContent = stripHtml(body).slice(0, 4000);

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

  let parsed: { relevant: boolean; confidence: number };
  try {
    parsed = await callClaudeJSON<{ relevant: boolean; confidence: number }>([
      { role: 'user', content: prompt },
    ]);
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    return {
      relevant: false,
      confidence: 0,
      reason: `AI relevance check failed: ${msg}`,
    };
  }

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
      .select('id, url, type, team_id, teams(name)')
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

    if (source.team_id || source.type === 'team_specific') {
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
            reason: relevance.reason ?? 'Low team relevance confidence',
          },
        }).catch((err) => console.error('[validate-source] notifyAdmin failed', err));
      }

      return new Response(
        JSON.stringify({
          status: finalStatus,
          confidence: relevance.confidence,
          reason: relevance.reason,
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

