# NFL Wire — Shared AI Context (CLAUDE.md)
# This file is read by Claude Code and Cursor automatically on every session.
# Keep this file updated as the project evolves.

## What We're Building
NFL Wire: a daily team-specific newsletter for all 32 NFL teams.
Subscribers pick their team → receive a curated 5-minute morning briefing every day.
First active team: Seattle Seahawks (#002244 / #69BE28 / #A5ACAF).

## Current Development Phase
⬜ Phase 1 — Foundation (Project setup, DB schema, seed data)
⬜ Phase 2 — Source Validation Engine
⬜ Phase 3 — Content Pipeline & AI Summarization
⬜ Phase 4 — Newsletter Assembly & Delivery
⬜ Phase 5 — Admin Dashboard

Update the checkboxes above as phases complete.

## Stack
- React + Vite + Tailwind CSS (frontend)
- Supabase (database + edge functions + auth)
- Vercel (deployment)
- Resend (email delivery)
- Anthropic Claude API / claude-haiku-4-5-20251001 (AI layer)
- Task Master AI (task orchestration via MCP)

## Key Architectural Decisions
1. All 32 NFL teams are seeded at initialization — never single-team logic
2. team_id is the universal filter across all tables
3. Source validation is fully automated (2 checks: reachability + relevance)
4. Pipeline iterates teams independently — one failure never blocks others
5. Admin dashboard is a protected /admin route in the same React app
6. Session-only AI memory — no persistent user data sent to Claude API

## North Star Metrics
- Day 1 Open Rate > 50%
- 5-of-7 Weekly Engagement Rate > 40%
- 👍 Satisfaction Rate > 70%

## Task Master Commands (Quick Reference)
- See next task:        task-master next
- List all tasks:       task-master list
- Show task detail:     task-master show [id]
- Mark complete:        task-master set-status --id=[id] --status=done
- Expand complex task:  task-master expand --id=[id]
- Update after change:  task-master update --from=[id] --prompt="what changed"
- Check complexity:     task-master analyze-complexity

## PRD Location
.taskmaster/docs/prd.md

## Environment Variables Required
VITE_SUPABASE_URL=
VITE_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
ANTHROPIC_API_KEY=
RESEND_API_KEY=
