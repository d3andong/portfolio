# CLAUDE.md — Welcome Mat

This repo powers deaneyolfson.com. The "welcome mat" project covers
personalized landing pages, per-lead session capture, and an
engagement-email pipeline.

Read this file first every session. Then read PRD.md for current
product state. Log your work to DEVLOG.md when you commit.

## Project layout

```
/                           Portfolio.html serves as homepage (Vercel default)
├── Portfolio.html          Home / work index
├── hi.html                 Personalized landing (served at /hi/<slug>)
├── onboardai.html          Case study pages
├── fx-predict.html
├── community-hub.html
├── braindump.html
├── _case.css               Shared case study styles
├── vercel.json             Rewrites for /hi/<slug>[/<person>]
├── CLAUDE.md               This file
├── PRD.md                  Product intent + current state
├── DEVLOG.md               Running journal (append-only)
├── .env                    Secrets (gitignored)
├── .gitignore
├── leads.json              CLI output (gitignored)
├── scripts/
│   ├── link.js             CLI link generator (shipped)
│   └── insights.js         CLI engagement report (upcoming, Phase 4a)
├── insights/               Cached PostHog responses (gitignored)
└── api/                    Vercel serverless functions (Phase 4c+)
    └── session-ended.js    Auto-send endpoint (upcoming)
```

## Untouchable values

Verify these are intact after every edit. NEVER print full values
in reports — redact to first 5 + last 4 characters (e.g.,
`phc_n…XK7R`).

| Secret | Location | Redacted form |
|---|---|---|
| PostHog public key (`phc_`) | `hi.html` inside `posthog.init(...)` | `phc_n...XK7R` |
| Formspree form ID | `hi.html` in `FORMSPREE_ENDPOINT` token | `mkok...qwvy` |
| PostHog personal key (`phx_`) | `.env` only, never in source | never print |
| Claude API key | `.env` only, never in source | never print |
| Resend API key (future) | Vercel env vars, never in source | never print |

## Conventions

- One commit per logical change. No "misc fixes" commits.
- Commit messages describe the WHY, not just the what. "remove
  BRANDS map (dead code now that CLI always emits `?n=`)" beats
  "remove map".
- Every commit appends one DEVLOG.md entry (see format in that
  file's header).
- Never touch `hi.html` without an explicit spec in the prompt.
  It's production-critical, heavily reviewed, and version hygiene
  matters.
- Defensive posthog calls. Every `posthog.capture()` wrapped in
  `if (window.posthog && posthog.capture) { try {…} catch (_) {} }`.
  Analytics failure never breaks the page.

## PostHog event catalog (canonical source of truth)

| Event | Fires when | Properties |
|---|---|---|
| `welcome_mat_viewed` | `hi.html` loads | `{ company, person }` |
| `stats_requested` | opt-in form submitted | `{ email, company }` |
| `case_study_opened` | case card hover-expands | `{ case_slug }` |
| `case_study_clicked_through` | nav to case page | `{ case_slug, trigger: "card" \| "link" }` |
| `live_app_clicked` | "Visit live app" clicked | `{ case_slug, url }` |
| `ascii_field_engaged` | `beforeunload`, accumulated mousemove in hero | `{ duration_ms }` |

When adding new events: update this table AND PRD.md's F5 section
AND add a DEVLOG.md entry explaining the rationale.

## State locations

- Live site config: `vercel.json`
- Lead tracking: `leads.json` at repo root (gitignored)
- Cached PostHog responses: `insights/<distinct_id>.json` (gitignored)
- Email audit log: `sent_emails.json` at repo root (gitignored, Phase 4c)
- API keys: `.env` (gitignored)

## When in doubt

- Read PRD.md for scope and tonal direction
- Read the last 5 DEVLOG.md entries for recent context
- Don't guess at untouchable values — ask or pattern-match from
  existing code
- Redact keys in all reports (first 5 + last 4 chars)
