# DEVLOG — Welcome Mat

Running journal. Newest entry at top. Every commit gets an entry.

## Entry format

```
## YYYY-MM-DD — <short title>
**Commit:** <SHA or "pending">
**Why:** <1-3 sentences: what problem this solves / why this decision>
**What changed:** <bullet list of concrete changes>
**Notes for future:** <gotchas, things to watch, TODOs created>
```

Keep entries terse. This file is read for context, not entertainment.
Write it for an agent coming in cold in 3 weeks who needs to
understand how we got here.

---

## 2026-04-21 — Scaffolded project coordination files
**Commit:** pending (this commit)
**Why:** Project has branched into multiple concurrent workstreams
(hi.html, CLI, events, insights, auto-send pipeline). Needs proper
coordination files so agents in separate sessions don't drift or
rediscover context. Established pattern across Dean's other projects.
**What changed:**
- Created CLAUDE.md (project conventions, layout, untouchable values,
  event catalog)
- Replaced PRD.md with v1.0 (fresh rewrite reflecting all current
  decisions, full metric inventory, Wrapped-style email direction)
- Created this DEVLOG.md with entry format defined
- Seeded DEVLOG with historical entries covering everything shipped
  to date (see below)

**Notes for future:** Every commit from here on appends a DEVLOG
entry. Never skip — context decays fast across agent sessions.

---

## 2026-04-21 — (historical) Added 4 custom PostHog events
**Commit:** <populate from Change 2 commit after next agent run>
**Why:** Autocapture gives raw clicks ("clicked <span>") but the
engagement report needs named events to describe behavior ("opened
OnboardAI"). Four events chosen after scope-trimming exercise.
**What changed:**
- Added `case_study_opened` (hover-expand, deduped per session/slug)
- Added `case_study_clicked_through` (card or link trigger)
- Added `live_app_clicked` (with target URL)
- Added `ascii_field_engaged` (accumulated mousemove duration, fires
  on `beforeunload`)
- Fixed footer hrefs on case study pages (`Portfolio.html` → `/`)

**Notes for future:** ASCII event scope was initially 3 events (count,
duration, session_seq); trimmed to just `duration_ms` since the others
can be derived from event stream if ever needed.

---

## 2026-04-21 — (historical) Removed BRANDS map, added CLI link generator
**Commit:** ea99b7d (from prior agent run)
**Why:** CLI always emits `?n=` in URLs, so the client-side BRANDS
display-name map in `hi.html` was dead code. Removal simplifies the
runtime and forces Dean to think about display casing explicitly.
**What changed:**
- Removed BRANDS object and lookup from `hi.html`
- Replaced with title-case fallback for manually-typed URLs
- Added `scripts/link.js` CLI (zero-dep Node)
- Added `leads.json` to `.gitignore`

**Notes for future:** The `--name` flag is now required on every
`link.js` invocation. No fallback.

---

## 2026-04-21 — (historical) Fixed scope pre-CoreWeave send
**Commit:** 3fde3cf (from prior agent run)
**Why:** Pre-flight pass before sending the first personalized link
to a CoreWeave hiring manager.
**What changed:**
- Updated `hi.html` form success copy to "I'll send you a report once
  you've finished browsing."
- Made case study cards fully clickable (defers to nested anchors
  via `closest('a')`)
- Removed "In Progress" placeholder case study (05 → 04)
- Removed "Built in Claude" from footer

**Notes for future:** Whole-card click handler uses document-level
delegation, not article-level listeners.

---

## 2026-04-20 — (historical) Fixed /hi/<slug> routing and added defensive URL parsing
**Commit:** 3d06a4f (from prior agent run)
**Why:** First deploy redirected `/hi/<slug>` to homepage because
`vercel.json` was never committed AND the runtime only read `?c=` param.
Made URL parsing defensive across all rewrite destination variations.
**What changed:**
- Committed `vercel.json` with `/hi/<slug>` and `/hi/<slug>/<person>`
  rewrites
- Added slug resolution priority: `?c=` → `?slug=` → pathname parse
- Added (since-removed) BRANDS display-name map

**Notes for future:** `vercel.json` is the source of truth for URL
routing. If `/hi/<slug>` breaks, check it exists and has both
rewrite rules.

---

## 2026-04-20 — (historical) Shipped hi.html, PostHog, Formspree, Vercel rewrites
**Commit:** (initial welcome-mat commits)
**Why:** V1 foundation. Personalized landing page with opt-in session
capture, before any automation.
**What changed:**
- Created `hi.html` with query-param personalization
- Integrated PostHog (autocapture + session recording + identify)
- Integrated Formspree for opt-in notification
- Added `vercel.json` rewrites for pretty URLs

**Notes for future:** `hi.html` is production-critical. Do not edit
without explicit spec. PostHog public key is safe to expose
(client-side by design).
