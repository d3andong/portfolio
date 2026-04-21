# PRD — Welcome Mat (v1.0)

> A personalized portfolio landing system that captures per-lead session
> data and delivers a Wrapped-style engagement email as a transparent,
> opt-in product artifact demonstrating analytics-driven PM thinking.

---

## Problem

Sending `deaneyolfson.com` as-is to every lead flattens a warm intro into a generic touch. A personalized landing page plus a playful, opt-in engagement email after the visit signals attention, doubles as a portfolio artifact demonstrating analytics + product thinking, and creates a durable follow-up moment that recruiters actually remember.

First intended use: the CoreWeave / W&B Staff PM search. The system should generalize across freelance leads, recruiters, and warm intros.

## Product shape

Two user-facing moments, two internal workflows.

**The visitor sees:**
1. A personalized landing at `/hi/<company>` — editorial, quiet, named for them
2. A follow-up email after their session ends (if they opted in) — Wrapped-style, playful, honest about being automated

**The system enables Dean to:**
3. Generate a fresh personalized link per lead from the CLI
4. Review each lead's engagement before follow-up (or let auto-send handle it)

## Goals

- Every link sent to a lead feels bespoke, not parameterized
- Every opt-in lead receives a memorable follow-up within hours of their visit
- The system itself is credible as a portfolio artifact — a Staff PM candidate shouldn't just *claim* they think about analytics loops, they should demonstrate one
- Zero surveillance creep: the email is opt-in, the tone is self-aware, the disclosure is explicit

## Non-goals (V1)

- Automated first-touch outreach (Dean sends the link himself)
- Custom social preview images per link (V2)
- Company-specific memo pages at `/hi/<company>/memo` (V2)
- Multi-variant landing pages per lead
- Direct integration with Dean's email client for outbound send
- Dashboard UI for lead management — `leads.json` + CLI is enough
- Unsubscribe infrastructure beyond "reply to opt out" (opt-in-only traffic doesn't need CAN-SPAM)

---

## Sub-project structure

Phase 4 is four concurrent sub-projects. Shipping order is sequential; the architecture allows parallel work once 4a is stable.

**Phase 4a — Insights CLI** ← ready to build
A local Node script that queries PostHog for a given lead and emits a structured engagement report. Validates the data layer before anything is automated.

**Phase 4b — Email drafter** (after 4a has real data)
Extends the CLI with `--draft` flag. Takes the raw engagement data, runs it through Claude API, outputs a Wrapped-style email draft Dean reviews and sends manually. Still human-in-loop.

**Phase 4c — Auto-send pipeline** (the sellable product)
Vercel serverless function listens for PostHog `session_end` webhook, queries full session, drafts email via Claude, sends via Resend. Copy to Dean on every send for QA.

**Phase 4d — Tone iteration** (ongoing)
The email copy itself. Lives in the Claude drafting prompt, iterated based on what actually lands with recruiters.

---

## Shipping architecture

```
┌─────────────────────────────┐
│  hi.html (shipped v1)       │
│  - query-param personalize  │
│  - PostHog autocapture + SR │
│  - 4 custom events          │
│  - opt-in email capture     │
└──────────────┬──────────────┘
               │ events + person props
               ▼
┌─────────────────────────────┐
│  PostHog                    │
│  - events, persons, replays │
└──────┬────────────────┬─────┘
       │                │
       │ pull (4a/4b)   │ webhook (4c)
       ▼                ▼
┌──────────────┐   ┌──────────────────────┐
│ insights.js  │   │ api/session-ended.js │
│ CLI          │   │ Vercel serverless    │
└──────┬───────┘   └──────────┬───────────┘
       │                      │
       │ structured JSON      │ structured JSON
       ▼                      ▼
┌──────────────────────────────────┐
│  Claude API (email drafter)      │
│  - selects top 3-4 stats         │
│  - writes Wrapped-style email    │
└──────────────┬───────────────────┘
               │
               ▼
       ┌──────────────┐
       │ Dean (4b)    │ OR  Resend (4c) → lead inbox
       │ manual send  │     + bcc dean for QA
       └──────────────┘
```

---

## Shipped (V1 foundation)

### F1 — Personalized landing page ✅
`hi.html` at `/hi/<slug>` via Vercel rewrites. Reads company slug from path + `?n=<display_name>` query param. Renders "Dean × <Company>" editorial lockup with rust italic accent. Falls back to title-case if `?n=` absent. Redirects to `/` on direct visits with no slug.

### F2 — PostHog session capture ✅
Autocapture on, session recording on, identified_only person profiles. `posthog.identify(<distinct_id>, { company, person, source })` fires on landing. `welcome_mat_viewed` event captures the landing hit.

### F3 — Email opt-in ✅
Inline form on `hi.html`: "want the stats from your own visit?" Submits to Formspree for notification + fires `stats_requested` event + `posthog.identify()` with `{ email, stats_opt_in: true }` on the person. Success state flips to "I'll send you a report once you've finished browsing."

### F4 — CLI link generator ✅
`scripts/link.js` — zero-dep Node CLI. Slugifies company name, builds URL with `?n=<display>`, copies to clipboard, appends to `leads.json`. Requires `--name` explicitly (no magic BRANDS map).

### F5 — Custom events (shipping now via agent)
Four named events so the engagement report can describe behavior, not just elements:

| Event | Fires when | Properties |
|---|---|---|
| `welcome_mat_viewed` | landing page loads | `{ company, person }` |
| `stats_requested` | email form submitted | `{ email, company }` |
| `case_study_opened` | case card hover-expands (deduped once/slug) | `{ case_slug }` |
| `case_study_clicked_through` | nav to case page via card or link | `{ case_slug, trigger }` |
| `live_app_clicked` | "Visit live app" clicked | `{ case_slug, url }` |
| `ascii_field_engaged` | beforeunload, accumulated mousemove time in hero | `{ duration_ms }` |

Guard pattern: every custom event wrapped in `if (window.posthog && posthog.capture) { try { … } catch (_) {} }` so analytics failure never breaks the page.

---

## Phase 4a — Insights CLI (next build)

### Scope

`scripts/insights.js` takes a distinct_id (or `--list` / `--last N` for discovery) and emits a structured engagement report from PostHog.

### Requirements

- Reads `POSTHOG_PERSONAL_API_KEY` and `POSTHOG_PROJECT_ID` from `.env` (via `dotenv`)
- Queries PostHog REST API for: person properties, event stream, session recording URL
- Computes every metric in the inventory below, regardless of whether the email uses it
- Caches raw response to `insights/<distinct_id>.json` (gitignored); `--refresh` to bypass cache
- Outputs markdown to stdout + clipboard; `--json` flag for structured output (fed to 4b)
- Defensive: missing data yields a report noting gaps, never a crash
- Never embeds email addresses in filenames

### Output shape (markdown)

```
# CoreWeave × Jane Smith — Engagement Report

Visited Apr 21, 2026 at 2:47 PM MT (3h 12m ago)
Opt-in: ✓ jane@coreweave.com
Referrer: direct / LinkedIn
Device: desktop, Chrome, macOS

## Metrics
[ table / list of all computed metrics ]

## Session recording
[ PostHog replay URL ]
```

---

## Metric inventory

All metrics computed by insights.js. The email drafter (4b) picks the 3-4 that show the lead in the strongest light.

### Time

| Metric | Source | Calc |
|---|---|---|
| Total session time | autocapture | `$session_end.timestamp − $session_start.timestamp` |
| Longest page dwell | autocapture | `max(per_page_duration)` |
| Time on site percentile | autocapture cross-session | Rank this session vs. all sessions last 30d |
| Repeat visits | autocapture | Count sessions for distinct_id |
| Time vs. median | autocapture cross-session | Ratio `session_time / median_all_sessions` |

### Scroll

| Metric | Source | Calc |
|---|---|---|
| % of visited pages scrolled to bottom | autocapture (`$prev_pageview_max_content_percentage`) | `count(pages ≥95% scroll) / pages_visited` |
| Weighted avg scroll across visited pages | autocapture | `Σ(max_scroll_pct × page_height) / Σ(page_height)` |
| Scroll percentile | autocapture cross-session | Rank weighted avg among sessions |
| Total pixels scrolled | autocapture | `Σ(max_scroll_pixels)` |

### Navigation

| Metric | Source | Calc |
|---|---|---|
| Pages visited | autocapture | Distinct pathnames |
| Case studies visited | autocapture | `$pageview` where path is case study |
| Ratio of site seen | autocapture | `pages_visited / total_site_pages` |

### Clicks & interaction

| Metric | Source | Calc |
|---|---|---|
| Total clicks | autocapture | Count `$autocapture` events |
| Click percentile | autocapture cross-session | Rank total clicks among sessions |
| Case studies opened | `case_study_opened` | Distinct `case_slug` values |
| Case studies clicked through | `case_study_clicked_through` | Count events |
| Live apps visited | `live_app_clicked` | Count events |
| ASCII engagement time | `ascii_field_engaged` | `duration_ms` for this session |
| ASCII percentile | `ascii_field_engaged` cross-session | Rank `duration_ms` among sessions |

### Funnel / flow

| Metric | Source | Calc |
|---|---|---|
| Time before opting in | events | `stats_requested.timestamp − $session_start.timestamp` |
| First page after landing | autocapture | 2nd `$pageview` in session |
| Entry path | autocapture | First `$pageview.pathname` |

### Rarity badges

| Badge | Condition |
|---|---|
| 🧪 The Completionist | visited every case study page |
| 🎯 The Precision Reader | scrolled ≥95% on any case page |
| 🚀 The Closer | `live_app_clicked` count ≥ 1 |
| 🕰 The Lingerer | any single page duration > 120s |
| ↩ The Returner | session count ≥ 2 |
| 🎮 The Fidgeter | `ascii_field_engaged.duration_ms` ≥ 10000 |

### Context (for inference, not display)

Referrer, device type, country, time of day — used by the email drafter to flavor copy, not reported as standalone stats.

### Invented-for-charm (always-safe fillers)

| Angle | Anchor |
|---|---|
| "Longer than median Wikipedia article read time" | ~3m 4s |
| "Your scroll ≈ N iPhones stacked tall" | iPhone 15 = 147mm |
| "Outlasted Bohemian Rhapsody by X seconds" | 5:55 |

**Blend target:** 70% real data, 30% invented-for-charm.

---

## Phase 4b — Email drafter

### Inputs

- Structured JSON from insights.js (all metrics computed)
- Lead's email + company + opt-in status
- Optional: past email drafts Dean has written, for voice samples (later)

### Drafter prompt principles

- **Tone: Wrapped-meets-self-aware-tech.** Playful, observant, knowing. Not corporate. Not marketing-drip.
- **Stat selection: pick 3-4 where this lead looks strongest.** Never rank comprehensively. Every recipient's report should flatter them truthfully on what they actually did well.
- **Percentiles shown as raw percentages** (e.g., "top 13.4%"). Real math reads more credible than rounded brags.
- **Never reveal N.** "Top 13.4% of visitors" is fine. "Top 13.4% out of 7 visitors" is not. Percentile without denominator.
- **Closing line does 80% of the work.** It must reframe the email as a product demo, not a follow-up. The transparency disclosure lives here.
- **Max 4 sentences of prose outside the stat block.** Density is the discipline.

### Email shape (V1 target)

```
Subject: Your visit to deaneyolfson.com — quick recap

Hi <first_name>,

You asked for the stats from your visit. Here they are — generated by
the same system that greeted you on the landing page.

🏆 [stat 1 — the punchiest]
🕰 [stat 2]
🎯 [stat 3]
🚀 [stat 4 — an invented-for-charm line]

<one-sentence inference, specific to what they engaged with>

<one-sentence specific next-step CTA>

Best,
Dean

---
This email was generated automatically when your session ended. The
analysis was written by Claude using your engagement data. Reply if
you'd rather not receive similar emails — a human reads those.
```

### Build

Extends insights.js rather than a separate script. Invoked as `insights.js <distinct_id> --draft`. Takes the JSON output, stuffs it into a prompt, calls Claude API, emits:
- Subject line
- Email body
- `mailto:` link pre-filled with both, for one-click review in default mail client

---

## Phase 4c — Auto-send pipeline

### Trigger

PostHog webhook on `session_end` event, scoped to persons where `stats_opt_in: true`. Backstop: scheduled Vercel cron fires 2 hours after any `stats_requested` event where no email has been sent (covers clean tab-close where `session_end` doesn't fire).

### Endpoint

`api/session-ended.js` — Vercel serverless function.

1. Validate webhook signature from PostHog
2. Query PostHog API for full session data (reuses insights.js logic, lifted to a shared module)
3. Call Claude API to draft the email
4. Send via Resend with `from: dean@deaneyolfson.com`
5. BCC Dean on every send (QA mode — promote to "first 10 only" after)
6. Append to `sent_emails.json` audit log (gitignored)
7. Return 200 to PostHog

### Delivery

- **Resend** for sending. Free tier: 3,000/month. DNS setup for SPF/DKIM/DMARC on `deaneyolfson.com`, ~20min.
- `from: dean@deaneyolfson.com`, `reply-to: dean@deaneyolfson.com`
- Plain-text + minimal markdown. No HTML templates in V1.
- List-Unsubscribe header set to `mailto:dean@deaneyolfson.com?subject=unsubscribe`

### Deduplication

One email per distinct_id per 7 days. If a lead revisits within a week, no second email. Record in `sent_emails.json`; check before send.

### QA gate

BCC Dean on every auto-send for V1. If the first 10 auto-sends read clean, drop BCC for new leads but keep the audit log.

---

## Non-functional requirements

- **No build step.** Vanilla HTML/JS on the site; Node scripts + Vercel functions elsewhere. No bundler, no framework.
- **Secrets.**
  - PostHog public key (`phc_…`) — safe in browser, lives in `hi.html`
  - PostHog personal key (`phx_…`) — `.env` only, never committed
  - Claude API key — `.env` only, never committed
  - Resend API key — Vercel environment variable, never committed
  - Formspree form ID — public-ish, lives in `hi.html`
- **Graceful degradation everywhere.** Analytics failures, API timeouts, missing data — none can break the visitor experience or silently drop emails.
- **Redaction discipline.** Agents and scripts that report on file contents must redact keys to first 5 + last 4 characters.

---

## Open questions

1. **Voice samples for email drafter** — start generic, iterate from real sends, or pre-train on 3–5 existing Dean emails? Current lean: start generic, iterate.
2. **Cross-session baseline window** — 30 days is a placeholder. Could be 90 for more stable percentiles, 7 for recency. Revisit once real data accumulates.
3. **Second-visit email behavior** — within the 7-day dedupe window, do nothing. Beyond it: send a new email, or a "welcome back" variant? Defer until it matters.
4. **Opt-in persistence** — if a lead opts in on visit 1 and returns on visit 3 without re-opting, do subsequent visits generate emails? Current lean: yes, opt-in persists until they reply to unsubscribe.

---

## Success metrics

- First CoreWeave link sent within 48 hours of Phase 4a shipping
- ≥60% of lead visits result in captured session + event data
- Dean sends ≥5 personalized links across target companies within 2 weeks
- ≥1 recruiter replies referencing a specific stat from the engagement email
- The system itself gets mentioned in ≥1 Dean interview as a built example
- No leads report the email as creepy or unwanted (measure via: zero unsubscribe replies)

---

## Decision log

- **2026-04-20** — Logo strategy: tiered lookup (Brandfetch primary w/ quality threshold → Logo.dev fallback → styled text fallback). Later superseded by the typographic "Dean × Company" lockup — no logos used.
- **2026-04-20** — Privacy disclosure footer: not needed on `hi.html` given opt-in design. Disclosure lives in the email itself instead.
- **2026-04-20** — Engagement insights script (F5): included in V1, not deferred.
- **2026-04-20** — Person vs. company ambiguity: resolved via explicit CLI flags (`--company`, `--person`), not inference.
- **2026-04-20** — Logo treatment: typographic masthead chosen over "Dean × Company" image lockup. Dean has no logomark; company logos don't match across brands; lockup reads as overclaiming.
- **2026-04-20** — Added F6: opt-in email capture. Flips analytics from covert to transparent. Formspree for notification, no serverless function needed in V1.
- **2026-04-21** — Removed BRANDS display-name map from both `hi.html` and `link.js`. CLI always emits `?n=`, making the map dead code.
- **2026-04-21** — Card-click handler: non-anchor wrapper + document-level listener that defers to nested links via `closest('a')`. Preserves "Visit live app" and "Read case study" anchors.
- **2026-04-21** — Removed "In Progress" case study and "Built in Claude" footer credit. Scope tightening before first CoreWeave send.
- **2026-04-21** — Email tonal pivot: Wrapped-style achievement email, not raw analytics report. The system IS the product; self-aware + playful beats warm + human for this artifact.
- **2026-04-21** — Auto-send pipeline (4c) confirmed as the real product. Originally suggested human-in-loop drafting; Dean's correct frame — the auto part is the sellable demonstration.
- **2026-04-21** — Four custom events chosen (`case_study_opened`, `case_study_clicked_through`, `live_app_clicked`, `ascii_field_engaged`) after rejecting wider measurement for ASCII. Scoped narrowly to interactions where naming adds signal autocapture can't.
- **2026-04-21** — Percentiles shown as raw percentages (e.g., "top 13.4%"), not rounded buckets. Precision reads more credible than "top 10%".
- **2026-04-21** — Percentiles never reveal N. Small-sample periods show real percentile without exposing traffic volume.
- **2026-04-21** — Stat selection in email drafter: pick top-ranking metrics per lead rather than fixed list. Flatter every recipient on what they actually did well.
- **2026-04-21** — Three-file project coordination pattern (CLAUDE.md + PRD.md + DEVLOG.md) formalized for this project as it branches into concurrent agent workstreams.
