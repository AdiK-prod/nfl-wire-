# NFL Wire — Product Requirements Document

## Project Overview

NFL Wire is a daily team-specific newsletter application that delivers a curated 5-minute morning briefing to fans of any NFL team. The app supports all 32 NFL teams from day one, with Seattle Seahawks as the first active team. Each subscriber selects their team at signup and receives a personalized daily digest assembled from approved sources, AI-summarized for clarity and brevity.

The core philosophy is **empowerment without prescription** — give fans full visibility into their team's news without telling them what to think about it.

---

## Technical Architecture

- **Frontend:** React + Vite + Tailwind CSS
- **Backend:** Supabase (PostgreSQL database, Edge Functions, Auth)
- **Deployment:** Vercel
- **Email Delivery:** Resend (transactional email service)
- **AI Layer:** Anthropic Claude API (Haiku for summarization, relevance checks)
- **Task Orchestration:** Task Master AI (MCP)
- **Primary IDE:** Cursor

---

## Target Persona

**The Commuter Fan** — 35-50 year old professional, loyal NFL fan, reads on mobile during commute or over morning coffee. Wants to feel fully caught up on their team in under 5 minutes. Values clean, respectable design. Will form a daily habit if the product earns their trust.

---

## Success Metrics

- Day 1 Open Rate > 50%
- 5-of-7 Weekly Engagement Rate > 40%
- 👍 Satisfaction Rate > 70% positive

---

## Core Features

### 1. Subscriber-Facing App

#### 1.1 Team Selection & Signup
- Landing page with all 32 NFL teams displayed as selectable cards
- Each card shows team logo, name, and primary team color
- Email signup form after team selection
- Confirmation email sent via Resend on successful signup
- Subscriber stored in Supabase with team_id, email, subscribed_at, is_active

#### 1.2 Daily Newsletter Email
The newsletter is assembled into four sections and delivered daily at 6:00 AM:

**Section 1 — Top Story**
- Lead article with full AI-generated 3-sentence summary
- Source attribution and timestamp
- "Read More" link to original article

**Section 2 — Quick Hits**
- 3 supporting articles
- Headline + 2-sentence AI summary per article
- Source attribution

**Section 3 — Injury Report**
- All articles tagged as injury-category for the team
- Player name, position, injury type, status (Out / Questionable / Probable)

**Section 4 — Stat of the Day**
- AI-generated contextual stat about the team
- Brief 2-sentence context explaining its significance

**Email Footer**
- 👍 / 👎 one-tap feedback buttons (tracked links)
- Unsubscribe link
- "Submit a source" link

#### 1.3 Source Submission
- Simple form: URL input + optional label
- Submission triggers async validation pipeline
- User receives email notification on approval or rejection with reason

---

### 2. Source Management System

#### 2.1 Source Tiers
- **Global Sources** (team_id = null): Pre-approved, apply to all teams (e.g. ESPN, NFL.com, AP Sports)
- **Team-Specific Sources**: Approved per team (e.g. official team site, beat reporters)
- **User-Submitted Sources**: Require automated validation before approval

#### 2.2 Automated Validation Pipeline (Supabase Edge Function: validate-source)

**Check 1 — Reachability**
- Fetch submitted URL
- Confirm parseable RSS or HTML content is returned
- Timeout after 10 seconds
- Failure result: status = 'rejected', reason = 'unreachable'

**Check 2 — Team Relevance**
- Extract text content from fetched source
- Call Claude API: "Does the following content contain news specifically about [TEAM NAME]? Reply with JSON only: { relevant: boolean, confidence: 0-100 }"
- confidence >= 60: status = 'approved'
- confidence < 60: status = 'flagged', admin notified
- Non-English content: status = 'flagged', admin notified

**Broad Source Handling (e.g. ESPN homepage)**
- Approved at source level
- Filtered at article level — only pull articles mentioning the team
- If > 50% of articles from a source are discarded: flag source as low-relevance, notify admin

---

### 3. Content Pipeline (Supabase Edge Function: run-content-pipeline)

Runs daily at 6:00 AM, iterates across all active teams independently.

**Step 0 — Team Iteration**
- Query all teams where is_active = true
- Run full pipeline per team — one team's failure does not block others

**Step 1 — Fetch**
- Query approved team-specific sources + global sources
- Fetch articles published in last 24 hours
- For each article: fetch not just the RSS headline and description, but the full article body content via URL scraping
- Store raw_content as full article text — not just the RSS excerpt
- Deduplicate by URL and title similarity

**Step 2 — Filter**
- Confirm each article mentions the current team
- Discard non-relevant articles from global sources
- Flag low-relevance sources (> 50% discarded)

**Step 3 — Select & Score**
Article selection is a deliberate AI-driven process, not just a category filter. The pipeline must ensure only high-quality, relevant articles make it into the newsletter.

Selection criteria evaluated per article:
- **Relevance score**: Does the full article body substantively cover the team? (not just a passing mention)
- **Recency weight**: Articles from the last 6 hours score higher than older ones
- **Story significance**: Roster moves, injuries, and game outcomes score higher than opinion pieces
- **Source credibility**: Known reliable sources score higher than unverified ones
- **Uniqueness**: Duplicate stories covering the same event are collapsed — only the best source is kept

Claude API call per article:
```
Evaluate this NFL article for inclusion in a daily newsletter for [TEAM NAME] fans.
Score each dimension 0-100:
- relevance: does the article substantively cover this team?
- significance: how important is this story for a fan to know today?
- credibility: how factual and reliable does this content appear?
- uniqueness: does this cover a distinct story vs others already selected?

Provide selection_reasoning explaining your scores in 1-2 sentences.
Reply with JSON only: { relevance: int, significance: int, credibility: int, uniqueness: int, composite_score: int, selection_reasoning: string }
```

- Store all scores + selection_reasoning in the articles table
- Only articles with composite_score >= 65 advance to newsletter assembly
- Selection reasoning is stored permanently for admin review and pipeline improvement

**Step 4 — Summarize**
- Summarize only articles that passed the selection threshold
- Claude API call per selected article: "Summarize this NFL article in 2-3 sentences for a busy fan. Use only the information present in the article — do not add context, speculation, or external facts. Be factual, avoid hype. Focus on: [TEAM NAME]. Article: [CONTENT]"
- Newsletter content is generated strictly from fetched article data — the AI must not fabricate or infer facts not present in the source material
- If a fact in the article requires validation (e.g. a statistic or claim seems unusual), the AI may perform a web search to confirm accuracy before including it in the summary
- Assign category: transaction / injury / game_analysis / rumor / general
- Store ai_summary, category, and validation_notes in articles table

**Step 5 — Rank & Select for Newsletter**
- From articles that passed scoring threshold, rank by composite_score
- Category priority as tiebreaker: Transactions > Injuries > Game Analysis > Rumors > General
- Select: 1 lead story (highest composite_score), 3 quick hits (next ranked), all injury-tagged articles
- Generate Stat of the Day via Claude API — must be grounded in fetched article data where possible

---

### 4. Newsletter Assembly & Delivery (Supabase Edge Function: assemble-and-send)

- Assemble ranked content into HTML email template
- Template matches approved design: editorial style, team primary/secondary colors, clean typography
- Mobile-first responsive layout
- Send via Resend API to all active subscribers for each team
- Record send in newsletters table (status = 'sent')
- Per-subscriber open tracking via 1px pixel
- 👍 / 👎 click tracking via redirect endpoints
- Update newsletter_metrics on feedback click

---

### 5. Admin Dashboard (/admin — protected route)

Supabase Auth protected. Admin role only.

#### View 1 — Source Queue
- List all pending + flagged sources
- Columns: URL, submitted by, validation status, relevance score, team
- Actions: Approve / Reject / Override validation result
- Filters: status, team, source type

#### View 2 — Content Preview
- Today's assembled newsletter before send
- Per article: show composite_score, selection_reasoning, and validation_notes
- Ability to: remove article, reorder sections, regenerate AI summary
- "Send Now" and "Schedule" action buttons

#### View 3 — Subscriber Insights
- Total active subscribers (per team + global)
- Day 1 open rate per issue
- 5-of-7 weekly engagement rate (north star metric)
- 👍 / 👎 satisfaction rate per issue
- Churned subscribers this week

#### View 4 — Validation Logs
- Full log of every source validation run
- Columns: source URL, check 1 result, check 2 result, confidence score, final status
- Filters: date range, team, outcome

---

## Database Schema

### teams
- id, name, city, slug, abbreviation
- primary_color, secondary_color, accent_color
- logo_url, division, conference
- is_active (boolean)

### subscribers
- id, email, team_id (FK → teams)
- subscribed_at, is_active, last_opened_at

### sources
- id, team_id (FK → teams, nullable for global)
- url, name, type (global / team_specific / user_submitted)
- status (pending / approved / rejected / flagged)
- relevance_score, submitted_by, created_at

### articles
- id, source_id, team_id (FK → teams)
- title, original_url, raw_content (full article body — not just RSS excerpt)
- ai_summary, published_at, relevance_confirmed
- category (transaction / injury / game_analysis / rumor / general)
- relevance_score, significance_score, credibility_score, uniqueness_score, composite_score
- selection_reasoning (AI explanation for inclusion or exclusion decision)
- validation_notes (web search verification notes, if triggered)
- passed_selection (boolean — true if composite_score >= threshold)
- summary_version (integer — increments on each summary regeneration)
- is_generic_summary (boolean — flagged if secondary check detects generic language)
- contradicts_headline (boolean — flagged if summary contradicts headline)
- is_mid_game (boolean — flagged if fetched during active game window)
- stat_source_article_id (FK → articles, nullable — traces Stat of the Day to source article)
- word_count (integer — used to detect paywall/boilerplate content)
- previously_published (boolean — true if URL appeared in a past newsletter)

### newsletters
- id, team_id (FK → teams)
- sent_at, subject_line, html_content
- status (draft / sent)

### newsletter_metrics
- id, newsletter_id, subscriber_id
- opened_at, feedback (thumbs_up / thumbs_down / null)

---

## Seed Data

Populate teams table with all 32 NFL teams at initialization:

**AFC East:** Buffalo Bills, Miami Dolphins, New England Patriots, New York Jets
**AFC North:** Baltimore Ravens, Cincinnati Bengals, Cleveland Browns, Pittsburgh Steelers
**AFC South:** Houston Texans, Indianapolis Colts, Jacksonville Jaguars, Tennessee Titans
**AFC West:** Denver Broncos, Kansas City Chiefs, Las Vegas Raiders, Los Angeles Chargers
**NFC East:** Dallas Cowboys, New York Giants, Philadelphia Eagles, Washington Commanders
**NFC North:** Chicago Bears, Detroit Lions, Green Bay Packers, Minnesota Vikings
**NFC South:** Atlanta Falcons, Carolina Panthers, New Orleans Saints, Tampa Bay Buccaneers
**NFC West:** Arizona Cardinals, Los Angeles Rams, San Francisco 49ers, Seattle Seahawks

**First active team — Seattle Seahawks:**
- primary_color: #002244
- secondary_color: #69BE28
- accent_color: #A5ACAF
- slug: seattle-seahawks
- is_active: true

---

## Development Phases

### Phase 1 — Foundation
- Project scaffold (React + Vite + Tailwind + Supabase + Vercel)
- Supabase schema migration
- Seed all 32 NFL teams with correct colors
- Environment variable setup
- Vercel deployment pipeline

### Phase 2 — Source Validation Engine
- Supabase Edge Function: validate-source
- Check 1: reachability
- Check 2: Claude API team relevance
- Broad source flagging logic
- Admin notification on flagged sources

### Phase 3 — Content Pipeline
- Supabase Edge Function: run-content-pipeline
- Multi-team iteration
- Full article body scraping (not just RSS headline/description)
- Article fetch, filter, deduplication
- AI-driven article selection scoring (relevance, significance, credibility, uniqueness)
- Selection reasoning stored per article
- Web search validation for unverified facts
- Newsletter content generated strictly from fetched data — no AI fabrication
- Claude API summarization + categorization (selected articles only)
- Article ranking logic by composite score
- Cron schedule (6:00 AM daily)

### Phase 4 — Newsletter Assembly & Delivery
- Supabase Edge Function: assemble-and-send
- HTML email template (editorial design, team colors, mobile-first)
- Resend API integration
- Open pixel tracking
- 👍 / 👎 feedback tracking endpoints
- newsletter_metrics recording

### Phase 5 — Admin Dashboard
- Supabase Auth guard on /admin routes
- Source Queue view with approve/reject/override
- Content Preview view with pre-send editing + per-article composite_score and selection_reasoning
- Subscriber Insights view (north star metrics)
- Validation Logs view

### Phase 6 — Content Pipeline Optimization (New Requirements)
Requirements added post-Phase 3 to address quality gaps identified during build.

**6.1 — Duplicate Suppression**
- Before selecting articles, query newsletters table for all article URLs sent in previous issues
- Any article whose original_url appears in a past newsletter is excluded from selection
- Story-level deduplication: if the same event is covered by 3+ sources, collapse to highest composite_score source only
- Deduplication uses both URL exact match AND semantic title similarity (>80% match = same story)

**6.2 — Empty Pipeline Fallback**
- If zero articles pass composite_score threshold: do not send newsletter — log reason and notify admin
- If only 1-2 articles pass: send a reduced newsletter with available content + "Light day for [TEAM]" notice in header
- If no injury articles exist: omit Injury Report section entirely — do not render an empty section
- If Stat of the Day cannot be grounded in a fetched article: omit it rather than fabricate

**6.3 — Composite Score Formula (Explicit Weighting)**
Replace vague threshold with a defined formula:
```
composite_score = (relevance × 0.40) + (significance × 0.30) + 
                  (credibility × 0.20) + (uniqueness × 0.10)
```
- relevance (0-100): Does the full article body substantively cover this team?
- significance (0-100): How important is this story for a fan today?
- credibility (0-100): How factual and reliable does the content appear?
- uniqueness (0-100): Does this cover a distinct story vs others already scored?
- Minimum threshold to advance: composite_score >= 65
- All four dimension scores stored separately in articles table

**6.4 — Stat of the Day Validation**
- Stat must be derived from a fetched article — never freely generated
- If a stat is used, store the source article_id it was derived from
- Web search permitted only to verify a named statistic — result stored in validation_notes
- The summary must reflect the article — never the web search result
- If no verifiable stat exists in today's articles: omit Stat of the Day section

**6.5 — Mid-Game Article Detection**
- Articles fetched while a game is in progress (score/stats still updating) must be flagged
- Detect via: article timestamp during known game window + keywords ("live", "in progress", "Q3", "halftime")
- Flagged articles are held and re-evaluated 3 hours after scheduled game end

### Phase 7 — Summarization Quality Improvement
Addresses AI summary quality issues that directly impact engagement and satisfaction rate.

**7.1 — Summary Freshness**
- Each summary must be evaluated for generic language before inclusion
- Claude API secondary check: "Does this summary contain any generic phrases that could apply to any NFL team or any week? Reply JSON: { is_generic: boolean, generic_phrases: string[] }"
- If is_generic = true: regenerate summary with explicit instruction to be specific to this story, this team, this date

**7.2 — Summary Consistency Check**
- After generating summary, run a contradiction check against the headline
- Claude API: "Does this summary contradict or misrepresent the following headline? Reply JSON: { contradicts: boolean, reason: string }"
- If contradicts = true: regenerate — never publish a summary that contradicts its own headline

**7.3 — Summary Tone & Length Enforcement**
- Max 3 sentences enforced programmatically — truncate at sentence boundary if exceeded
- Tone check: flag summaries containing speculative language ("may", "could", "might") unless present in original article
- Store summary_version (integer) — increments on each regeneration for admin visibility

**7.4 — Feedback Loop Integration**
- When 👎 is received on a newsletter: log which articles were selected that day, their composite_scores, and their selection_reasoning
- Weekly admin report: lowest-rated newsletters vs highest-rated — surface pattern differences in article selection
- If a team's satisfaction rate drops below 60% for 3 consecutive issues: auto-flag for admin review

### Phase 8 — Seasonal & Volume Adaptation
Addresses content availability variation across the NFL calendar.

**8.1 — Seasonal Mode Detection**
- Pipeline detects current NFL calendar phase: preseason / regular_season / playoffs / offseason / draft_period
- Each mode adjusts scoring weights:
  - Offseason: significance weight reduced, rumor category elevated
  - Draft period: transaction category elevated, composite threshold lowered to 55
  - Playoffs: global source noise filter tightened — only team-specific articles from national sources
  - Super Bowl week: single-event dominance handled — force uniqueness scoring to spread coverage

**8.2 — Volume Throttling**
- Cap articles fetched per source per day to prevent single-source dominance (max 3 per source)
- If > 10 articles pass threshold: apply stricter composite_score cutoff (>= 75) to tighten selection
- If < 3 articles pass threshold: lower cutoff to 55 and notify admin

**8.3 — Paywall & Fetch Quality Detection**
- After fetching article body, validate content quality: minimum 200 words
- If fetched content contains paywall indicators ("subscribe to read", "sign in to continue"): discard article, flag source
- If fetched content is boilerplate/cookie page: discard, retry once, then flag source
- Sources with > 30% paywall rate flagged as low-quality, surfaced in admin Source Queue

---

## Design Specification

**Style:** Editorial — "ESPN Meets Morning Brew"
- Team colors as primary accent, neutral white/warm paper background
- Typography: Playfair Display (headlines), DM Sans (UI/data), Source Serif (body)
- Generous whitespace, strong typographic hierarchy
- Mobile-first, optimized for commute reading
- Four content blocks: Top Story, Quick Hits, Injury Report, Stat of the Day
- 👍 / 👎 feedback always visible in footer

---

## Constraints & Non-Negotiables

**Architecture**
- All 32 NFL teams supported from day one — no single-team hardcoding
- One team pipeline failure must never block other teams
- Source validation is fully automated — no human required for standard cases
- Admin can always manually override any automated validation decision
- Newsletter must render correctly on iOS Mail, Gmail, and Outlook
- No subscriber data shared between teams
- Session-only AI memory — no persistent user data sent to Claude API

**Content Quality**
- Full article body must be fetched — RSS headline/description alone is insufficient
- Newsletter content must be generated strictly from fetched article data — no AI fabrication or inference
- AI may perform web search only to validate a specific named fact — never to generate new content
- Web search results must be stored in validation_notes — never silently alter a summary
- Every article must have a stored selection_reasoning before inclusion or exclusion
- composite_score = (relevance × 0.40) + (significance × 0.30) + (credibility × 0.20) + (uniqueness × 0.10)
- Minimum composite_score of 65 required for newsletter inclusion (55 in low-volume conditions)
- An article already published in a previous newsletter must never be republished
- A summary that contradicts its own headline must never be published
- Empty sections must never render — omit gracefully if no content exists
- Stat of the Day must be traceable to a specific fetched article — never freely generated
