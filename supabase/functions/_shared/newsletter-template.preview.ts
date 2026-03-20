import { renderNewsletterTemplate } from "./newsletter-template.ts";

export function buildPreviewNewsletterHtml() {
  return renderNewsletterTemplate({
    team: {
      name: "Seahawks",
      city: "Seattle",
      abbreviation: "SEA",
      primary_color: "#002244",
      secondary_color: "#69BE28",
      accent_color: "#A5ACAF",
      logo_url: null,
    },
    leadStory: {
      title: "Seahawks finalize offseason plan heading into camp",
      ai_summary: "Seattle clarified key position battles and reiterated expectations for the offense. Coaches emphasized tempo and ball security as early focal points.",
      original_url: "https://example.com/top-story",
      published_at: new Date().toISOString(),
      source_name: "Example Source",
    },
    quickHits: [
      {
        title: "Roster move: depth signing to bolster special teams",
        ai_summary: "Seattle added a veteran with coverage-unit experience. The move increases competition at the back end of the roster.",
        original_url: "https://example.com/quick-1",
        published_at: new Date().toISOString(),
        source_name: "Example Source",
      },
      {
        title: "Film room: what changes in the new scheme",
        ai_summary: "Expect more motion and simplified reads early. The goal is to generate easy throws and reduce negative plays.",
        original_url: "https://example.com/quick-2",
        published_at: new Date().toISOString(),
        source_name: "Example Source",
      },
      {
        title: "Injury note: player returns to limited participation",
        ai_summary: "A key contributor is trending in the right direction, though the team remains cautious.",
        original_url: "https://example.com/quick-3",
        published_at: new Date().toISOString(),
        source_name: "Example Source",
      },
    ],
    injuries: [
      {
        title: "Player X listed as questionable with hamstring tightness",
        ai_summary: null,
        original_url: "https://example.com/injury-1",
        published_at: new Date().toISOString(),
        source_name: "Example Source",
      },
    ],
    statOfDay: {
      stat: "10",
      context: "Ten minutes is all you need to read this briefing and feel caught up. That’s the goal: clarity, not noise.",
    },
    links: {
      pixelUrl: "https://example.com/pixel.gif",
      thumbsUpUrl: "https://example.com/feedback?f=up",
      thumbsDownUrl: "https://example.com/feedback?f=down",
      unsubscribeUrl: "https://example.com/unsubscribe",
      submitSourceUrl: "https://example.com/submit-source",
      manageUrl: "https://example.com/manage",
    },
    generatedAtIso: new Date().toISOString(),
  });
}

