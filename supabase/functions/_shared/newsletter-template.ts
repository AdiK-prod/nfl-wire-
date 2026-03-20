export type NewsletterTemplateTeam = {
  name: string;
  city: string;
  abbreviation: string;
  primary_color: string;
  secondary_color: string;
  accent_color: string | null;
  logo_url: string | null;
};

export type NewsletterTemplateArticle = {
  title: string;
  ai_summary: string | null;
  original_url: string;
  published_at?: string | null;
  source_name?: string | null;
};

export type NewsletterTemplateStat = {
  stat: string;
  context: string;
};

export type NewsletterTemplateLinks = {
  pixelUrl?: string;
  thumbsUpUrl?: string;
  thumbsDownUrl?: string;
  unsubscribeUrl: string;
  submitSourceUrl: string;
  manageUrl?: string;
};

export type NewsletterTemplateInput = {
  team: NewsletterTemplateTeam;
  leadStory: NewsletterTemplateArticle | null;
  quickHits: NewsletterTemplateArticle[];
  injuries: NewsletterTemplateArticle[];
  statOfDay: NewsletterTemplateStat | null;
  links: NewsletterTemplateLinks;
  generatedAtIso?: string;
};

function escapeHtml(input: string): string {
  return input
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function formatDateShort(iso?: string | null): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleString("en-US", { month: "short", day: "numeric" });
}

function safeColor(hex: string | null | undefined, fallback: string): string {
  if (!hex) return fallback;
  const h = hex.trim();
  return /^#[0-9a-fA-F]{6}$/.test(h) ? h : fallback;
}

function renderArticleBlock(a: NewsletterTemplateArticle, accent: string) {
  const title = escapeHtml(a.title);
  const summary = escapeHtml(a.ai_summary ?? "");
  const url = a.original_url;
  const source = a.source_name ? escapeHtml(a.source_name) : "";
  const date = formatDateShort(a.published_at ?? null);

  return `
    <tr>
      <td style="padding: 0 0 14px 0;">
        <div style="font-size: 16px; line-height: 1.35; font-weight: 700; margin: 0 0 6px 0; color: #0f172a;">
          ${title}
        </div>
        ${summary ? `<div style="font-size: 14px; line-height: 1.6; color: #334155; margin: 0 0 8px 0;">${summary}</div>` : ""}
        <div style="font-size: 12px; color: #64748b;">
          ${source ? `${source}${date ? " · " : ""}` : ""}${date ? date : ""}
          ${url ? ` · <a href="${url}" style="color: ${accent}; text-decoration: none;">Read</a>` : ""}
        </div>
      </td>
    </tr>
  `.trim();
}

export function renderNewsletterTemplate(input: NewsletterTemplateInput): string {
  const primary = safeColor(input.team.primary_color, "#002244");
  const secondary = safeColor(input.team.secondary_color, "#69BE28");
  const accent = safeColor(input.team.accent_color, secondary);

  const teamName = `${input.team.city} ${input.team.name}`.trim();
  const titleTeam = escapeHtml(teamName);
  const genDate = formatDateShort(input.generatedAtIso ?? new Date().toISOString());

  const topStory =
    input.leadStory &&
    renderArticleBlock(
      {
        ...input.leadStory,
        ai_summary: input.leadStory.ai_summary ?? "",
      },
      accent,
    );

  const quickHitsRows =
    input.quickHits.length > 0
      ? input.quickHits.map((a) => renderArticleBlock(a, accent)).join("\n")
      : `
    <tr><td style="padding: 0;">
      <div style="font-size: 14px; line-height: 1.6; color: #334155;">No additional items today.</div>
    </td></tr>
  `.trim();

  const injuriesRows =
    input.injuries.length > 0
      ? input.injuries
          .map((a) => {
            const title = escapeHtml(a.title);
            const url = a.original_url;
            return `
              <tr>
                <td style="padding: 10px 0; border-bottom: 1px solid #e2e8f0;">
                  <div style="font-size: 14px; line-height: 1.5; color: #0f172a; font-weight: 600;">${title}</div>
                  ${url ? `<div style="margin-top: 4px; font-size: 12px;"><a href="${url}" style="color: ${accent}; text-decoration:none;">Source</a></div>` : ""}
                </td>
              </tr>
            `.trim();
          })
          .join("\n")
      : `
      <tr>
        <td style="padding: 0;">
          <div style="font-size: 14px; line-height: 1.6; color: #334155;">No injury items today.</div>
        </td>
      </tr>
    `.trim();

  const statBlock =
    input.statOfDay && input.statOfDay.stat
      ? `
        <div style="font-size: 34px; line-height: 1.15; font-weight: 800; color: ${primary}; margin: 0 0 10px 0;">
          ${escapeHtml(input.statOfDay.stat)}
        </div>
        <div style="font-size: 14px; line-height: 1.6; color: #334155;">
          ${escapeHtml(input.statOfDay.context ?? "")}
        </div>
      `.trim()
      : `<div style="font-size: 14px; line-height: 1.6; color: #334155;">No verifiable stat today.</div>`;

  const logoImg = input.team.logo_url
    ? `<img src="${input.team.logo_url}" width="44" height="44" alt="${escapeHtml(teamName)} logo" style="display:block; border-radius: 10px;" />`
    : "";

  const pixel = input.links.pixelUrl
    ? `<img src="${input.links.pixelUrl}" width="1" height="1" alt="" style="display:block;" />`
    : "";

  const feedback =
    input.links.thumbsUpUrl && input.links.thumbsDownUrl
      ? `
        <a href="${input.links.thumbsUpUrl}" style="display:inline-block; padding: 12px 14px; border: 1px solid #e2e8f0; border-radius: 10px; text-decoration:none; font-size: 14px; margin-right: 8px;">👍</a>
        <a href="${input.links.thumbsDownUrl}" style="display:inline-block; padding: 12px 14px; border: 1px solid #e2e8f0; border-radius: 10px; text-decoration:none; font-size: 14px;">👎</a>
      `.trim()
      : "";

  return `
<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>NFL Wire — ${titleTeam}</title>
  </head>
  <body style="margin:0; padding:0; background:#f1f5f9;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f1f5f9; padding: 24px 12px;">
      <tr>
        <td align="center">
          <table role="presentation" width="600" cellpadding="0" cellspacing="0" style="width:600px; max-width:600px; background:#ffffff; border: 1px solid #e2e8f0; border-radius: 18px; overflow:hidden;">
            <!-- Header -->
            <tr>
              <td style="padding: 18px 18px; background: ${primary}; color: #ffffff;">
                <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
                  <tr>
                    <td style="vertical-align: middle;">
                      <div style="font-family: Arial, sans-serif; font-size: 12px; letter-spacing: 0.12em; text-transform: uppercase; opacity: 0.92;">
                        NFL Wire
                      </div>
                      <div style="font-family: Georgia, serif; font-size: 20px; line-height:1.2; font-weight: 700; margin-top: 6px;">
                        ${titleTeam} Morning Briefing
                      </div>
                      <div style="font-family: Arial, sans-serif; font-size: 12px; opacity: 0.92; margin-top: 4px;">
                        ${genDate ? `${genDate}` : ""}
                      </div>
                    </td>
                    <td align="right" style="vertical-align: middle;">
                      ${logoImg}
                    </td>
                  </tr>
                </table>
              </td>
            </tr>

            <!-- Body -->
            <tr>
              <td style="padding: 18px 18px 6px;">
                <!-- Top Story -->
                <div style="font-family: Arial, sans-serif; font-size: 12px; letter-spacing: 0.12em; text-transform: uppercase; color:#64748b; margin-bottom: 10px;">
                  Top story
                </div>
                <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border-left: 4px solid ${secondary}; padding-left: 12px;">
                  ${topStory ? topStory : `<tr><td><div style="font-size: 14px; line-height: 1.6; color: #334155;">No top story today.</div></td></tr>`}
                </table>
              </td>
            </tr>

            <!-- Quick Hits -->
            <tr>
              <td style="padding: 6px 18px 6px;">
                <div style="font-family: Arial, sans-serif; font-size: 12px; letter-spacing: 0.12em; text-transform: uppercase; color:#64748b; margin: 14px 0 10px;">
                  Quick hits
                </div>
                <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
                  ${quickHitsRows}
                </table>
              </td>
            </tr>

            <!-- Injury Report -->
            <tr>
              <td style="padding: 6px 18px 6px;">
                <div style="font-family: Arial, sans-serif; font-size: 12px; letter-spacing: 0.12em; text-transform: uppercase; color:#64748b; margin: 14px 0 10px;">
                  Injury report
                </div>
                <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
                  ${injuriesRows}
                </table>
              </td>
            </tr>

            <!-- Stat of the Day -->
            <tr>
              <td style="padding: 6px 18px 18px;">
                <div style="font-family: Arial, sans-serif; font-size: 12px; letter-spacing: 0.12em; text-transform: uppercase; color:#64748b; margin: 14px 0 10px;">
                  Stat of the day
                </div>
                <div style="border: 1px solid #e2e8f0; border-radius: 14px; padding: 16px 14px; background: #f8fafc;">
                  ${statBlock}
                </div>
              </td>
            </tr>

            <!-- Footer -->
            <tr>
              <td style="padding: 16px 18px; background:#ffffff; border-top: 1px solid #e2e8f0;">
                ${feedback ? `<div style="margin-bottom: 12px;">${feedback}</div>` : ""}
                <div style="font-family: Arial, sans-serif; font-size: 12px; line-height: 1.6; color:#64748b;">
                  <a href="${input.links.unsubscribeUrl}" style="color:${accent}; text-decoration:none;">Unsubscribe</a>
                  &nbsp;·&nbsp;
                  <a href="${input.links.submitSourceUrl}" style="color:${accent}; text-decoration:none;">Submit a source</a>
                  ${input.links.manageUrl ? `&nbsp;·&nbsp;<a href="${input.links.manageUrl}" style="color:${accent}; text-decoration:none;">Manage</a>` : ""}
                </div>
                ${pixel}
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>
  `.trim();
}

