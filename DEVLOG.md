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

## 2026-04-21 — Added 4 custom PostHog events + getCaseSlug helper
**Commit:** pending (this commit)
**Why:** Autocapture gives raw clicks ("clicked <span>"); the
engagement report (insights.js, Phase 4a) needs named events to
describe behavior ("opened OnboardAI"). Footer Portfolio.html →
/ redirect was already handled in prior commit 1ce4f18.
**What changed:**
- Added `getCaseSlug()` helper at top level of index.html
  `<script>` block (shared by the 3 case events)
- Added `case_study_opened` (hover-expand, deduped per-slug via
  IIFE-scope `Set`)
- Added `case_study_clicked_through` (card trigger inside
  whole-card handler; link trigger on `.actions a:not(.primary)`;
  anchor-defer in whole-card handler prevents double-fire)
- Added `live_app_clicked` on `.actions a.primary` clicks
- Added `ascii_field_engaged` inside ASCII IIFE —
  `performance.now()` delta accumulation with 1500ms idle gap,
  `<250ms` guard, fired once via `beforeunload` + `pagehide`

**Notes for future:**
- Slug consistency is load-bearing — `getCaseSlug()` is the
  single source of truth. Don't inline slug derivation in new
  events. insights.js joins events by `case_slug`; drift = silent
  data breakage.
- Slug derivation uses `.scramble[data-text]` (not `.textContent`)
  because the scramble animation mutates textContent mid-hover.
- ⚠ Integration gap to address: PostHog is NOT initialized on
  `index.html` (only on `hi.html`). The defensive
  `if (window.posthog && posthog.capture)` guard means these
  events silently no-op in production until PostHog init is added
  to index.html. Out of scope for this commit; file a follow-up.

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
