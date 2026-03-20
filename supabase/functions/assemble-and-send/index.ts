import { supabase } from "../_shared/supabase-client.ts";
import { callClaudeJSON } from "../_shared/anthropic-client.ts";
import { renderNewsletterTemplate } from "../_shared/newsletter-template.ts";

type Category = "transaction" | "injury" | "game_analysis" | "rumor" | "general";

type ArticleRow = {
  id: string;
  team_id: string;
  title: string;
  original_url: string;
  ai_summary: string | null;
  published_at: string;
  category: Category | null;
  sources?: { name: string } | null;
};

type TeamRow = {
  id: string;
  name: string;
  city: string;
  abbreviation: string;
  primary_color: string;
  secondary_color: string;
  accent_color: string | null;
  logo_url: string | null;
};

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const appBaseUrl = Deno.env.get("APP_BASE_URL") ?? "https://nflwire.com";
const resendApiKey = Deno.env.get("RESEND_API_KEY") ?? "";
const resendFrom = Deno.env.get("RESEND_FROM") ?? "NFL Wire <onboarding@resend.dev>";

function rankAndSelectArticles(articles: ArticleRow[]): {
  leadStory: ArticleRow | null;
  quickHits: ArticleRow[];
  injuries: ArticleRow[];
} {
  const priority: Record<Category, number> = {
    transaction: 5,
    injury: 4,
    game_analysis: 3,
    rumor: 2,
    general: 1,
  };

  const sorted = [...articles].sort((a, b) => {
    const ap = priority[(a.category ?? "general") as Category] ?? 1;
    const bp = priority[(b.category ?? "general") as Category] ?? 1;
    if (bp !== ap) return bp - ap;
    return new Date(b.published_at).getTime() - new Date(a.published_at).getTime();
  });

  const injuries = sorted.filter((a) => a.category === "injury");
  const leadStory = sorted.find((a) => a.category !== "injury") ?? null;
  const quickHits = sorted.filter((a) => a !== leadStory && a.category !== "injury").slice(0, 3);
  return { leadStory, quickHits, injuries };
}

async function generateStatOfTheDay(teamName: string, articleTitles: string[]): Promise<{ stat: string; context: string }> {
  if (!articleTitles.length) {
    return { stat: "", context: "No verifiable stat from today's curated articles." };
  }
  try {
    const context = articleTitles.slice(0, 15).join("; ");
    const parsed = await callClaudeJSON<{ stat: string; context: string }>(
      [
        {
          role: "user",
          content:
            `Generate one interesting, VERIFIABLE statistic about the ${teamName} NFL team. ` +
            `Use ONLY: (1) facts clearly implied or stated in these recent headlines, or (2) well-known, publicly documented stats. ` +
            `Do NOT invent, assume, or guess any numbers. If no verifiable stat fits, set stat to "" and context to "No verifiable stat from today's headlines." ` +
            `Recent headlines: ${context}. Reply with JSON only: { "stat": "...", "context": "2-sentence explanation of why it matters, or empty if none" }`,
        },
      ],
      "claude-3-haiku-20240307",
      250,
    );
    return { stat: parsed.stat ?? "", context: parsed.context ?? "" };
  } catch {
    return { stat: "", context: "" };
  }
}

function getDayWindow(dayYmd?: string): { startIso: string; endIso: string; label: string } {
  if (dayYmd) {
    // Interpret YYYY-MM-DD as UTC day boundary for deterministic server behavior.
    const start = new Date(`${dayYmd}T00:00:00.000Z`);
    const end = new Date(start.getTime() + 24 * 60 * 60 * 1000);
    return { startIso: start.toISOString(), endIso: end.toISOString(), label: dayYmd };
  }
  const start = new Date();
  start.setHours(0, 0, 0, 0);
  const end = new Date(start.getTime() + 24 * 60 * 60 * 1000);
  const label = start.toISOString().slice(0, 10);
  return { startIso: start.toISOString(), endIso: end.toISOString(), label };
}

async function assembleNewsletter(team: TeamRow, dayYmd?: string) {
  const { startIso, endIso, label } = getDayWindow(dayYmd);

  const { data: articles, error: artErr } = await supabase
    .from("articles")
    .select("id, team_id, title, original_url, ai_summary, published_at, category, sources(name)")
    .eq("team_id", team.id)
    .gte("published_at", startIso)
    .lt("published_at", endIso)
    .order("published_at", { ascending: false });

  if (artErr) throw new Error(`Failed to load articles: ${artErr.message}`);

  const safeArticles = (articles ?? []) as ArticleRow[];
  if (safeArticles.length === 0) {
    return {
      noContent: true as const,
      window: { startIso, endIso, day: label },
      assembled: {
        leadStory: null,
        quickHits: [],
        injuries: [],
        stat_of_day: { stat: "", context: "No curated articles found for this date window." },
        article_count: 0,
      },
    };
  }
  const { leadStory, quickHits, injuries } = rankAndSelectArticles(safeArticles);

  const teamName = `${team.city} ${team.name}`;
  const titles = safeArticles.map((a) => a.title);
  const stat = await generateStatOfTheDay(teamName, titles);

  const subjectDate = new Date(`${label}T00:00:00.000Z`).toLocaleDateString("en-US", { month: "short", day: "numeric" });
  const subjectLine = `${team.name} Morning Briefing — ${subjectDate}`;

  // Placeholders are substituted during send step.
  const newsletterIdPlaceholder = "{{newsletter_id}}";
  const subscriberIdPlaceholder = "{{subscriber_id}}";

  const html = renderNewsletterTemplate({
    team,
    leadStory: leadStory
      ? {
          title: leadStory.title,
          ai_summary: leadStory.ai_summary,
          original_url: leadStory.original_url,
          published_at: leadStory.published_at,
          source_name: leadStory.sources?.name ?? null,
        }
      : null,
    quickHits: quickHits.map((a) => ({
      title: a.title,
      ai_summary: a.ai_summary,
      original_url: a.original_url,
      published_at: a.published_at,
      source_name: a.sources?.name ?? null,
    })),
    injuries: injuries.map((a) => ({
      title: a.title,
      ai_summary: a.ai_summary,
      original_url: a.original_url,
      published_at: a.published_at,
      source_name: a.sources?.name ?? null,
    })),
    statOfDay: stat.stat ? stat : null,
    links: {
      pixelUrl: `${appBaseUrl}/track-open?newsletter_id=${newsletterIdPlaceholder}&subscriber_id=${subscriberIdPlaceholder}`,
      thumbsUpUrl: `${appBaseUrl}/feedback?newsletter_id=${newsletterIdPlaceholder}&subscriber_id=${subscriberIdPlaceholder}&feedback=thumbs_up`,
      thumbsDownUrl: `${appBaseUrl}/feedback?newsletter_id=${newsletterIdPlaceholder}&subscriber_id=${subscriberIdPlaceholder}&feedback=thumbs_down`,
      unsubscribeUrl: `${appBaseUrl}/unsubscribe?subscriber_id=${subscriberIdPlaceholder}`,
      submitSourceUrl: `${appBaseUrl}/submit-source`,
      manageUrl: `${appBaseUrl}/manage-subscription?subscriber_id=${subscriberIdPlaceholder}`,
    },
    generatedAtIso: new Date().toISOString(),
  });

  const { data: inserted, error: insErr } = await supabase
    .from("newsletters")
    .insert({
      team_id: team.id,
      subject_line: subjectLine,
      html_content: html,
      status: "draft",
    })
    .select("id, team_id, subject_line, html_content, status, created_at")
    .single();

  if (insErr) throw new Error(`Failed to insert newsletter: ${insErr.message}`);

  return {
    noContent: false as const,
    newsletter: inserted,
    window: { startIso, endIso, day: label },
    assembled: {
      leadStory: leadStory ? { title: leadStory.title, original_url: leadStory.original_url } : null,
      quickHits: quickHits.map((a) => ({ title: a.title, original_url: a.original_url })),
      injuries: injuries.map((a) => ({ title: a.title, original_url: a.original_url })),
      stat_of_day: stat,
      article_count: safeArticles.length,
    },
  };
}

async function sendNewsletter(
  newsletter: { id: string; team_id: string; subject_line: string; html_content: string },
  testEmail?: string,
) {
  if (testEmail) {
    const personalizedHtml = newsletter.html_content
      .replaceAll("{{newsletter_id}}", newsletter.id)
      .replaceAll("{{subscriber_id}}", "test-subscriber");

    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${resendApiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: resendFrom,
        to: testEmail,
        subject: newsletter.subject_line,
        html: personalizedHtml,
        headers: {
          "List-Unsubscribe": `<${appBaseUrl}/unsubscribe?subscriber_id=test-subscriber>`,
        },
      }),
    });

    if (!response.ok) {
      const text = await response.text();
      throw new Error(`Test send failed (${response.status}): ${text}`);
    }

    return { sentCount: 1, failedCount: 0, subscriberCount: 1 };
  }

  const { data: subscribers, error: subErr } = await supabase
    .from("subscribers")
    .select("id, email")
    .eq("team_id", newsletter.team_id)
    .eq("is_active", true);

  if (subErr) throw new Error(`Failed loading subscribers: ${subErr.message}`);
  const safeSubscribers = subscribers ?? [];

  if (!resendApiKey) {
    throw new Error("RESEND_API_KEY not configured");
  }

  let sentCount = 0;
  let failedCount = 0;

  for (const s of safeSubscribers) {
    const personalizedHtml = newsletter.html_content
      .replaceAll("{{newsletter_id}}", newsletter.id)
      .replaceAll("{{subscriber_id}}", s.id);

    try {
      const response = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${resendApiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          from: resendFrom,
          to: s.email,
          subject: newsletter.subject_line,
          html: personalizedHtml,
          headers: {
            "List-Unsubscribe": `<${appBaseUrl}/unsubscribe?subscriber_id=${encodeURIComponent(s.id)}>`,
          },
        }),
      });

      if (!response.ok) {
        const text = await response.text();
        console.error("[assemble-and-send] resend failed", s.email, response.status, text.slice(0, 500));
        failedCount += 1;
        continue;
      }

      await supabase.from("newsletter_metrics").insert({
        newsletter_id: newsletter.id,
        subscriber_id: s.id,
      });
      sentCount += 1;
    } catch (e) {
      console.error("[assemble-and-send] unexpected send error", s.email, e);
      failedCount += 1;
    }
  }

  const { error: upErr } = await supabase
    .from("newsletters")
    .update({
      status: "sent",
      sent_at: new Date().toISOString(),
    })
    .eq("id", newsletter.id);

  if (upErr) throw new Error(`Failed to update newsletter sent status: ${upErr.message}`);

  return { sentCount, failedCount, subscriberCount: safeSubscribers.length };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { status: 204, headers: corsHeaders });
  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  let body: { team_id?: string; send?: boolean; test_email?: string; day_ymd?: string } = {};
  try {
    body = (await req.json()) as { team_id?: string; send?: boolean; test_email?: string; day_ymd?: string };
  } catch {
    body = {};
  }

  const teamFilter = body.team_id?.trim();
  const shouldSend = body.send ?? true;
  const testEmail = body.test_email?.trim();
  const dayYmd = body.day_ymd?.trim();

  const teamQuery = supabase
    .from("teams")
    .select("id, name, city, abbreviation, primary_color, secondary_color, accent_color, logo_url")
    .eq("is_active", true);

  const { data: teams, error: teamsErr } = teamFilter
    ? await teamQuery.eq("id", teamFilter)
    : await teamQuery;

  if (teamsErr) {
    return new Response(JSON.stringify({ error: teamsErr.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const safeTeams = (teams ?? []) as TeamRow[];
  if (safeTeams.length === 0) {
    return new Response(JSON.stringify({ results: [], message: "No active teams" }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const results: Array<
    | {
        team_id: string;
        team_name: string;
        status: "success" | "no_content";
        newsletter_id?: string;
        reason?: string;
        sent?: { subscriber_count: number; sent_count: number; failed_count: number };
      }
    | { team_id: string; team_name: string; status: "failed"; error: string }
  > = [];

  for (const t of safeTeams) {
    const teamName = `${t.city} ${t.name}`;
    try {
      const assembled = await assembleNewsletter(t, dayYmd);
      const window = assembled.window;
      if (assembled.noContent) {
        results.push({
          team_id: t.id,
          team_name: teamName,
          status: "no_content",
          reason: "No curated articles found in selected date window",
          window,
        });
        continue;
      }
      const newsletter = assembled.newsletter;
      if (shouldSend) {
        const sent = await sendNewsletter(newsletter, testEmail);
        results.push({
          team_id: t.id,
          team_name: teamName,
          status: "success",
          newsletter_id: newsletter.id,
            window,
          sent: {
            subscriber_count: sent.subscriberCount,
            sent_count: sent.sentCount,
            failed_count: sent.failedCount,
          },
        });
      } else {
        results.push({ team_id: t.id, team_name: teamName, status: "success", newsletter_id: newsletter.id, window });
      }
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      console.error("[assemble-and-send] assemble failed", teamName, msg);
      results.push({ team_id: t.id, team_name: teamName, status: "failed", error: msg });
    }
  }

  return new Response(JSON.stringify({ results }), {
    status: 200,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
});

