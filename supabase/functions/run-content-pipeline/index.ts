import { supabase } from '../_shared/supabase-client.ts';
import { callClaudeJSON } from '../_shared/anthropic-client.ts';
import { notifyAdmin } from '../_shared/notify-admin.ts';

const SOURCE_FETCH_TIMEOUT_MS = 15_000;
const TWENTY_FOUR_HOURS_MS = 24 * 60 * 60 * 1000;

// --- Source access validation (before fetching) ---
async function validateSourceAccess(url: string): Promise<{ ok: boolean; reason?: string }> {
  try {
    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), 10_000);
    const res = await fetch(url, {
      method: 'HEAD',
      signal: ctrl.signal,
      headers: { 'User-Agent': 'NFL Wire Pipeline/1.0' },
    });
    clearTimeout(t);
    if (!res.ok) return { ok: false, reason: `HTTP ${res.status}` };
    const ct = (res.headers.get('content-type') ?? '').toLowerCase();
    if (!ct.includes('html') && !ct.includes('xml') && !ct.includes('rss') && !ct.includes('application/atom'))
      return { ok: false, reason: 'Unsupported content-type' };
    return { ok: true };
  } catch (e) {
    if (e instanceof Error) {
      if (e.name === 'AbortError') return { ok: false, reason: 'Timeout' };
      return { ok: false, reason: e.message };
    }
    return { ok: false, reason: 'Unknown error' };
  }
}

// --- Types ---
interface RawArticle {
  source_id: string;
  title: string;
  original_url: string;
  raw_content: string;
  published_at: string;
}

interface SourceRow {
  id: string;
  url: string;
  name: string;
  team_id: string | null;
}

export interface SourceFetchResult {
  url: string;
  name: string;
  access_ok: boolean;
  access_reason?: string;
  rss_detected: boolean;
  items_24h: number;
}

interface FilteredArticle extends RawArticle {
  relevance_confirmed: boolean;
  source?: SourceRow;
}

interface TeamFilterDiagnostics {
  kept_count: number;
  discarded_count: number;
  discarded_samples: Array<{ title: string; url: string; source?: string }>;
}

type Category = 'transaction' | 'injury' | 'game_analysis' | 'rumor' | 'general';

interface SummarizedArticle extends RawArticle {
  relevance_confirmed: boolean;
  team_id: string;
  ai_summary: string | null;
  category: Category | null;
}

interface SourceRelevanceCounts {
  totalItems: number;
  relevantItems: number;
}

interface GlobalSourceAggregate {
  sourceId: string;
  totalItems: number;
  relevantItems: number;
  teamsConsidered: Set<string>;
  teamsWithRelevant: Set<string>;
}

// --- Step 1: Fetch + dedup (with source access validation) ---
function extractRssItems(xml: string, sourceUrl: string): Array<{ title: string; link: string; description: string; pubDate: string }> {
  const items: Array<{ title: string; link: string; description: string; pubDate: string }> = [];
  const itemRegex = /<item[^>]*>([\s\S]*?)<\/item>/gi;
  let m: RegExpExecArray | null;
  while ((m = itemRegex.exec(xml)) !== null) {
    const block = m[1];
    const get = (tag: string): string => {
      const re = new RegExp(`<${tag}[^>]*>([\\s\\S]*?)</${tag}>`, 'i');
      const match = block.match(re);
      if (!match) return '';
      return match[1].replace(/<!\[CDATA\[([\s\S]*?)\]\]>/gi, '$1').trim();
    };
    const title = get('title');
    const link = get('link');
    const description = get('description');
    const pubDate = get('pubDate');
    if (title && link) items.push({ title, link, description, pubDate });
  }
  return items;
}

async function fetchArticles(teamId: string): Promise<{
  articles: RawArticle[];
  sourcesUsed: SourceRow[];
  sourcesCatalog: SourceRow[];
  sourceResults: SourceFetchResult[];
}> {
  const { data: sources, error: srcErr } = await supabase
    .from('sources')
    .select('id, url, name, team_id')
    .eq('status', 'approved')
    .or(`team_id.eq.${teamId},team_id.is.null`);

  if (srcErr || !sources?.length) return { articles: [], sourcesUsed: [], sourcesCatalog: [], sourceResults: [] };

  const cutoff = new Date(Date.now() - TWENTY_FOUR_HOURS_MS);
  const all: RawArticle[] = [];
  const sourcesCatalog = (sources as SourceRow[]) ?? [];
  const sourcesUsed: SourceRow[] = [];
  const sourceResults: SourceFetchResult[] = [];

  for (const source of sources as SourceRow[]) {
    const access = await validateSourceAccess(source.url);
    if (!access.ok) {
      sourceResults.push({
        url: source.url,
        name: source.name,
        access_ok: false,
        access_reason: access.reason,
        rss_detected: false,
        items_24h: 0,
      });
      console.warn(`[run-content-pipeline] Source ${source.id} (${source.url}) not accessible: ${access.reason}`);
      continue;
    }

    let rssDetected = false;
    let items24h = 0;

    try {
      const ctrl = new AbortController();
      const t = setTimeout(() => ctrl.abort(), SOURCE_FETCH_TIMEOUT_MS);
      const res = await fetch(source.url, {
        signal: ctrl.signal,
        headers: { 'User-Agent': 'NFL Wire Pipeline/1.0' },
      });
      clearTimeout(t);
      if (!res.ok) {
        sourceResults.push({
          url: source.url,
          name: source.name,
          access_ok: true,
          access_reason: `HTTP ${res.status}`,
          rss_detected: false,
          items_24h: 0,
        });
        continue;
      }
      const content = await res.text();
      rssDetected = content.includes('<rss') || content.includes('<feed') || content.includes('<item>');
      if (!rssDetected) {
        sourceResults.push({
          url: source.url,
          name: source.name,
          access_ok: true,
          rss_detected: false,
          items_24h: 0,
        });
        continue;
      }

      const items = extractRssItems(content, source.url);
      for (const it of items) {
        let pubDate: Date;
        try {
          pubDate = it.pubDate ? new Date(it.pubDate) : new Date();
        } catch {
          pubDate = new Date();
        }
        if (pubDate >= cutoff) {
          items24h += 1;
          all.push({
            source_id: source.id,
            title: it.title,
            original_url: it.link,
            raw_content: it.description || it.title,
            published_at: pubDate.toISOString(),
          });
        }
      }
      sourceResults.push({
        url: source.url,
        name: source.name,
        access_ok: true,
        rss_detected: true,
        items_24h: items24h,
      });
      sourcesUsed.push(source);
    } catch (e) {
      const errMsg = e instanceof Error ? e.message : String(e);
      sourceResults.push({
        url: source.url,
        name: source.name,
        access_ok: true,
        access_reason: errMsg,
        rss_detected: false,
        items_24h: 0,
      });
      console.warn(`[run-content-pipeline] Fetch failed for ${source.url}:`, e);
    }
  }

  const byUrl = new Map<string, RawArticle>();
  for (const a of all) {
    const u = a.original_url.trim();
    if (!byUrl.has(u)) byUrl.set(u, a);
  }
  return { articles: [...byUrl.values()], sourcesUsed, sourcesCatalog, sourceResults };
}

// --- Step 2: Filter by team relevance ---
function buildTeamMatchTerms(teamName: string, teamAbbreviation?: string): string[] {
  const terms = new Set<string>();
  const cleaned = teamName.trim().toLowerCase();
  const parts = cleaned.split(/\s+/).filter(Boolean);
  const city = parts.slice(0, -1).join(' ').trim();
  const mascot = parts[parts.length - 1] ?? cleaned;

  if (cleaned) terms.add(cleaned);
  if (city) terms.add(city);
  if (mascot) terms.add(mascot);
  if (teamAbbreviation) terms.add(teamAbbreviation.trim().toLowerCase());

  const aliasMap: Record<string, string[]> = {
    'chicago bears': ['chi', 'da bears'],
    'seattle seahawks': ['sea', 'hawks'],
    'san francisco 49ers': ['sf', 'niners', '49ers'],
    'new england patriots': ['ne', 'pats'],
    'green bay packers': ['gb'],
    'kansas city chiefs': ['kc'],
    'new york giants': ['nyg'],
    'new york jets': ['nyj'],
    'los angeles rams': ['lar'],
    'los angeles chargers': ['lac', 'bolts'],
    'tampa bay buccaneers': ['tb', 'bucs'],
    'new orleans saints': ['no'],
  };

  (aliasMap[cleaned] ?? []).forEach((alias) => terms.add(alias.toLowerCase()));
  return [...terms].filter((term) => term.length >= 2);
}

async function filterArticlesByTeam(
  articles: RawArticle[],
  teamName: string,
  teamAbbreviation: string | undefined,
  sources: SourceRow[]
): Promise<{ filtered: FilteredArticle[]; diagnostics: TeamFilterDiagnostics }> {
  const sourceMap = new Map(sources.map((s) => [s.id, s]));
  const filtered: FilteredArticle[] = [];
  const discardedSamples: Array<{ title: string; url: string; source?: string }> = [];
  const terms = buildTeamMatchTerms(teamName, teamAbbreviation);
  for (const a of articles) {
    const text = `${a.title} ${a.raw_content}`.toLowerCase();
    const mention = terms.some((term) => text.includes(term));
    const src = sourceMap.get(a.source_id);
    if (mention) {
      filtered.push({ ...a, relevance_confirmed: true, source: src });
    }
    if (!mention && discardedSamples.length < 12) {
      discardedSamples.push({
        title: a.title,
        url: a.original_url,
        source: src?.name,
      });
    }
  }
  return {
    filtered,
    diagnostics: {
      kept_count: filtered.length,
      discarded_count: Math.max(articles.length - filtered.length, 0),
      discarded_samples: discardedSamples,
    },
  };
}

function countSourceRelevance(rawArticles: RawArticle[], filteredArticles: FilteredArticle[]): Map<string, SourceRelevanceCounts> {
  const counts = new Map<string, SourceRelevanceCounts>();
  for (const article of rawArticles) {
    const cur = counts.get(article.source_id) ?? { totalItems: 0, relevantItems: 0 };
    cur.totalItems += 1;
    counts.set(article.source_id, cur);
  }
  for (const article of filteredArticles) {
    const cur = counts.get(article.source_id) ?? { totalItems: 0, relevantItems: 0 };
    cur.relevantItems += 1;
    counts.set(article.source_id, cur);
  }
  return counts;
}

async function computeIrrelevantStreakDays(sourceId: string, teamId: string | null): Promise<number> {
  const query = supabase
    .from('source_relevance_daily')
    .select('day_ymd,total_items,relevant_items')
    .eq('source_id', sourceId)
    .order('day_ymd', { ascending: false })
    .limit(30);

  const { data, error } =
    teamId === null ? await query.is('team_id', null) : await query.eq('team_id', teamId);
  if (error || !data?.length) return 0;

  let streak = 0;
  for (const row of data as Array<{ total_items: number; relevant_items: number }>) {
    if (row.total_items <= 0) continue; // neutral day: no signal
    if (row.relevant_items > 0) break;
    streak += 1;
  }
  return streak;
}

async function persistSourceRelevanceAndFlag(
  dayYmd: string,
  globalAggBySource: Map<string, GlobalSourceAggregate>,
  teamAggBySourceTeam: Map<string, { sourceId: string; teamId: string; totalItems: number; relevantItems: number }>
): Promise<void> {
  for (const agg of globalAggBySource.values()) {
    await supabase
      .from('source_relevance_daily')
      .upsert(
        {
          source_id: agg.sourceId,
          team_id: null,
          day_ymd: dayYmd,
          total_items: agg.totalItems,
          relevant_items: agg.relevantItems,
          teams_considered: agg.teamsConsidered.size,
          teams_with_relevant: agg.teamsWithRelevant.size,
        },
        { onConflict: 'source_id,team_id,day_ymd' }
      );

    const streak = await computeIrrelevantStreakDays(agg.sourceId, null);
    if (streak >= 3) {
      await supabase.from('sources').update({ status: 'flagged', updated_at: new Date().toISOString() }).eq('id', agg.sourceId);
      notifyAdmin({
        type: 'low_relevance_source',
        data: { sourceId: agg.sourceId, scope: 'global', streakDays: streak },
      }).catch(() => {});
    }
  }

  for (const agg of teamAggBySourceTeam.values()) {
    await supabase
      .from('source_relevance_daily')
      .upsert(
        {
          source_id: agg.sourceId,
          team_id: agg.teamId,
          day_ymd: dayYmd,
          total_items: agg.totalItems,
          relevant_items: agg.relevantItems,
          teams_considered: 1,
          teams_with_relevant: agg.relevantItems > 0 ? 1 : 0,
        },
        { onConflict: 'source_id,team_id,day_ymd' }
      );

    const streak = await computeIrrelevantStreakDays(agg.sourceId, agg.teamId);
    if (streak >= 3) {
      await supabase.from('sources').update({ status: 'flagged', updated_at: new Date().toISOString() }).eq('id', agg.sourceId);
      notifyAdmin({
        type: 'low_relevance_source',
        data: { sourceId: agg.sourceId, teamId: agg.teamId, scope: 'team', streakDays: streak },
      }).catch(() => {});
    }
  }
}

// --- Step 3: Summarize + categorize (Claude) ---
async function summarizeArticles(
  articles: FilteredArticle[],
  teamId: string,
  teamName: string
): Promise<SummarizedArticle[]> {
  const out: SummarizedArticle[] = [];
  for (const a of articles) {
    try {
      const content = (a.title + '\n' + a.raw_content).slice(0, 3000);
      const prompt = `Summarize this NFL article in 2-3 sentences for a busy fan. Be factual, avoid hype. Focus on ${teamName}.

Article content:
${content}

Reply with JSON only: { "summary": "...", "category": "transaction" | "injury" | "game_analysis" | "rumor" | "general" }`;

      const parsed = await callClaudeJSON<{ summary: string; category: string }>(
        [{ role: 'user', content: prompt }],
        'claude-3-haiku-20240307',
        300
      );
      const cat = ['transaction', 'injury', 'game_analysis', 'rumor', 'general'].includes(parsed.category)
        ? (parsed.category as Category)
        : 'general';
      out.push({
        ...a,
        team_id: teamId,
        ai_summary: parsed.summary ?? null,
        category: cat,
      });
    } catch (e) {
      console.warn(`[run-content-pipeline] Summarize failed for ${a.original_url}:`, e);
      out.push({
        ...a,
        team_id: teamId,
        ai_summary: null,
        category: 'general',
      });
    }
  }
  return out;
}

// --- Step 4: Rank & select ---
function rankAndSelectArticles(
  articles: SummarizedArticle[]
): { leadStory: SummarizedArticle | null; quickHits: SummarizedArticle[]; injuries: SummarizedArticle[] } {
  const prio: Record<Category, number> = {
    transaction: 5,
    injury: 4,
    game_analysis: 3,
    rumor: 2,
    general: 1,
  };
  const sorted = [...articles].sort((a, b) => {
    const pa = (a.category && prio[a.category]) ?? 0;
    const pb = (b.category && prio[b.category]) ?? 0;
    if (pb !== pa) return pb - pa;
    return new Date(b.published_at).getTime() - new Date(a.published_at).getTime();
  });
  const injuries = articles.filter((a) => a.category === 'injury');
  const leadStory = sorted.find((a) => a.category !== 'injury') ?? null;
  const quickHits = sorted.filter((a) => a !== leadStory && a.category !== 'injury').slice(0, 3);
  return { leadStory, quickHits, injuries };
}

// --- Step 5: Stat of the day ---
async function generateStatOfTheDay(
  teamName: string,
  articleTitles: string[]
): Promise<{ stat: string; context: string }> {
  if (articleTitles.length === 0) {
    return { stat: '', context: "No verifiable stat from today's curated articles." };
  }
  try {
    const context = articleTitles.slice(0, 15).join('; ');
    const parsed = await callClaudeJSON<{ stat: string; context: string }>(
      [
        {
          role: 'user',
          content: `Generate one interesting, VERIFIABLE statistic about the ${teamName} NFL team. Use ONLY: (1) facts clearly implied or stated in these recent headlines, or (2) well-known, publicly documented stats (e.g. official standings, league records). Do NOT invent, assume, or guess any numbers. If no verifiable stat fits, set stat to "" and context to "No verifiable stat from today's headlines." Recent headlines: ${context}. Reply with JSON only: { "stat": "...", "context": "2-sentence explanation of why it matters, or empty if none" }`,
        },
      ],
      'claude-3-haiku-20240307',
      250
    );
    return { stat: parsed.stat ?? '', context: parsed.context ?? '' };
  } catch (e) {
    console.warn('[run-content-pipeline] generateStatOfTheDay failed', e);
    return { stat: '', context: '' };
  }
}

// --- Insert summarized articles into DB ---
async function insertArticles(articles: SummarizedArticle[]): Promise<void> {
  if (articles.length === 0) return;
  const rows = articles.map((a) => ({
    source_id: a.source_id,
    team_id: a.team_id,
    title: a.title,
    original_url: a.original_url,
    raw_content: a.raw_content,
    ai_summary: a.ai_summary,
    published_at: a.published_at,
    relevance_confirmed: a.relevance_confirmed,
    category: a.category,
  }));
  const { error } = await supabase.from('articles').upsert(rows, {
    onConflict: 'original_url',
    ignoreDuplicates: true,
  });
  if (error) console.error('[run-content-pipeline] insert articles error', error);
}

// --- Orchestration ---
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { status: 204, headers: corsHeaders });
  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  const results: Array<{
    team_id: string;
    team_name: string;
    status: 'success' | 'failed';
    article_count?: number;
    sources_tested?: SourceFetchResult[];
    team_filter_diagnostics?: TeamFilterDiagnostics;
    error?: string;
    leadStory?: unknown;
    quickHits?: unknown[];
    injuries?: unknown[];
    stat_of_day?: { stat: string; context: string };
  }> = [];
  const dayYmd = new Date().toISOString().slice(0, 10);
  const globalAggBySource = new Map<string, GlobalSourceAggregate>();
  const teamAggBySourceTeam = new Map<string, { sourceId: string; teamId: string; totalItems: number; relevantItems: number }>();

  const { data: teams, error: teamsErr } = await supabase
    .from('teams')
    .select('id, name, city, abbreviation')
    .eq('is_active', true);

  if (teamsErr || !teams?.length) {
    return new Response(
      JSON.stringify({ results: [], message: teamsErr?.message ?? 'No active teams' }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  for (const team of teams) {
    const teamName = `${team.city} ${team.name}`;
    try {
      console.log(`[run-content-pipeline] Starting ${teamName}`);
      const { articles: rawArticles, sourcesUsed, sourcesCatalog, sourceResults } = await fetchArticles(team.id);
      const { filtered, diagnostics } = await filterArticlesByTeam(
        rawArticles,
        teamName,
        (team as { abbreviation?: string }).abbreviation,
        sourcesUsed,
      );
      const sourceCounts = countSourceRelevance(rawArticles, filtered);
      for (const source of sourcesCatalog) {
        const c = sourceCounts.get(source.id) ?? { totalItems: 0, relevantItems: 0 };
        if (source.team_id === null) {
          const agg = globalAggBySource.get(source.id) ?? {
            sourceId: source.id,
            totalItems: 0,
            relevantItems: 0,
            teamsConsidered: new Set<string>(),
            teamsWithRelevant: new Set<string>(),
          };
          agg.totalItems += c.totalItems;
          agg.relevantItems += c.relevantItems;
          agg.teamsConsidered.add(team.id);
          if (c.relevantItems > 0) agg.teamsWithRelevant.add(team.id);
          globalAggBySource.set(source.id, agg);
        } else if (source.team_id === team.id) {
          const key = `${source.id}:${team.id}`;
          const agg = teamAggBySourceTeam.get(key) ?? {
            sourceId: source.id,
            teamId: team.id,
            totalItems: 0,
            relevantItems: 0,
          };
          agg.totalItems += c.totalItems;
          agg.relevantItems += c.relevantItems;
          teamAggBySourceTeam.set(key, agg);
        }
      }
      const summarized = await summarizeArticles(filtered, team.id, teamName);
      await insertArticles(summarized);
      const { leadStory, quickHits, injuries } = rankAndSelectArticles(summarized);
      const titles = summarized.map((a) => a.title);
      const statOfDay = await generateStatOfTheDay(teamName, titles);

      results.push({
        team_id: team.id,
        team_name: teamName,
        status: 'success',
        article_count: summarized.length,
        sources_tested: sourceResults,
        team_filter_diagnostics: diagnostics,
        leadStory: leadStory ? { title: leadStory.title, ai_summary: leadStory.ai_summary, original_url: leadStory.original_url } : null,
        quickHits: quickHits.map((a) => ({ title: a.title, ai_summary: a.ai_summary, original_url: a.original_url })),
        injuries: injuries.map((a) => ({ title: a.title, ai_summary: a.ai_summary })),
        stat_of_day: statOfDay,
      });
      console.log(`[run-content-pipeline] Completed ${teamName}: ${summarized.length} articles`);
    } catch (e) {
      const errMsg = e instanceof Error ? e.message : String(e);
      console.error(`[run-content-pipeline] Failed ${teamName}:`, e);
      results.push({ team_id: team.id, team_name: teamName, status: 'failed', error: errMsg });
      notifyAdmin({ type: 'pipeline_error', data: { teamName, error: errMsg } }).catch(() => {});
    }
  }

  await persistSourceRelevanceAndFlag(dayYmd, globalAggBySource, teamAggBySourceTeam);

  return new Response(JSON.stringify({ results }), {
    status: 200,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
});
