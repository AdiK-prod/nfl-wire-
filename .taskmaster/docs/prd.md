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
- Deduplicate by URL and title similarity

**Step 2 — Filter**
- Confirm each article mentions the current team
- Discard non-relevant articles from global sources
- Flag low-relevance sources (> 50% discarded)

**Step 3 — Summarize**
- Call Claude API per article: "Summarize this NFL article in 2-3 sentences for a busy fan. Be factual, avoid hype. Focus on: [TEAM NAME]. Article: [CONTENT]"
- Assign category: transaction / injury / game_analysis / rumor / general
- Store ai_summary and category in articles table

**Step 4 — Rank & Select**
- Category priority: Transactions > Injuries > Game Analysis > Rumors > General
- Select: 1 lead story, 3 quick hits, all injury-tagged articles
- Generate Stat of the Day via Claude API

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
- title, original_url, raw_content, ai_summary
- published_at, relevance_confirmed
- category (transaction / injury / game_analysis / rumor / general)

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
- Article fetch, filter, deduplication
- Claude API summarization + categorization
- Article ranking logic
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
- Content Preview view with pre-send editing
- Subscriber Insights view (north star metrics)
- Validation Logs view

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

- All 32 NFL teams supported from day one — no single-team hardcoding
- Source validation is fully automated — no human required for standard cases
- Admin can always manually override any automated validation decision
- One team pipeline failure must never block other teams
- Newsletter must render correctly on iOS Mail, Gmail, and Outlook
- No subscriber data shared between teams
- Session-only AI memory — no persistent user data sent to Claude API
