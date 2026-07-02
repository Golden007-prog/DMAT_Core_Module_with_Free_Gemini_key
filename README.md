# CoreForge — dMAT Core Module Practice

Free, unlimited, browser-based practice for the **Core Module of the dMAT** (digitaler Mastertest,
the aptitude test by g.a.s.t. / TestDaF-Institut used for admission to German Master's programmes —
and, from 2026, part of APS verification for Indian applicants).

There is almost no free practice material beyond one official PDF. CoreForge fills that gap with
**format-faithful, difficulty-calibrated, freshly generated tasks** in all three Core Module subtests:

| Subtest | Format | Timing |
|---|---|---|
| **Figure Sequences** | 4×4 matrices; predict the 5th and 6th frame from 3 options each | 20 tasks / 25:00 |
| **Mathematical Equations** | small systems, integer solutions 1–20, exactly one solution | 20 tasks / 25:00 |
| **Latin Squares** | 5×5 grid, letters A–E, deduce the red "?" | 20 tasks / 25:00 |

## What makes it trustworthy

- **Deterministic, validated generation.** Every question comes from a seeded generator and must pass
  a programmatic validator (unique correct answer, distinct distractors, solvable under the official
  rule system) before it can enter a set. Figure tasks additionally pass an *inferability* check: the
  rules must be uniquely deducible from the four visible frames.
- **Exam-honest timing.** Deadline-based timer (no drift), armed only after the first question paints,
  refresh-safe, auto-submit exactly once. Generation time never costs you seconds.
- **Real exam behaviour.** Exam mode is forward-only (configurable — official behaviour unconfirmed),
  no pause, no note-taking reminder, blanks count as wrong, full Core run with 60 s breaks.
- **Honest scoring.** Practice accuracy is reported as accuracy; the app never pretends to predict the
  official 0–200 standardised score.

## Features

Practice & exam modes · instant feedback with step-by-step explanations · sequence playback animation
for figure tasks · full history with **retry this exact set** (seeded reproducibility) and **retry my
mistakes** · analytics with accuracy trends, weakness leaderboard by rule type, pacing vs the 75 s
budget, streaks, and deterministic improvement insights · Learn pages with animated rule demos ·
dark/light theme · keyboard-only operation · PWA (works fully offline) · export/import your data.

## Optional AI (BYOK — bring your own key)

With a free [Google AI Studio](https://aistudio.google.com/apikey) Gemini key, CoreForge adds:
AI-generated equation variety (**every AI system is re-validated locally** — invalid ones are silently
replaced by deterministic questions), per-mistake tutor explanations, and a coaching narrative from
your aggregated stats. The key lives only in your browser's localStorage and is sent only to
`generativelanguage.googleapis.com`. A daily call budget (default 25) protects your free-tier quota.
**No key, no network → everything still works.**

## Development

```bash
npm install
npm run dev        # dev server
npm test           # vitest unit + regression suites (engine ×1000-seed property tests, R1–R5)
npm run build      # typecheck + production build (static, PWA)
npm run e2e        # Playwright end-to-end (needs: npx playwright install chromium)
```

### Architecture

```
src/engine/    pure deterministic generators + validators (figures, equations, latin) + seeded PRNG
src/state/     pure session state machine, deadline timer, zustand stores, insights
src/storage/   Dexie (IndexedDB) with in-memory fallback, export/import
src/ai/        optional Gemini layer: model chain, backoff, budget guard, validation firewall
src/ui/        React screens + SVG question rendering + charts
src/tests/     unit, state-machine, regression (R1–R5), UI tests
e2e/           Playwright specs
```

Deploy anywhere static: `dist/` after `npm run build`. Configs included for Vercel (`vercel.json`)
and Cloudflare Pages (`public/_redirects`). An optional Cloudflare Worker proxy template for a shared
Gemini key lives in `deploy/worker-proxy.ts` (off by default).

## Disclaimer

Unofficial practice tool. Not affiliated with g.a.s.t., TestDaF-Institut, or d-mat.de. Question
formats follow publicly documented dMAT task types; all questions are originally generated. dMAT is a
trademark of its owners. For official example tasks, see [d-mat.de](https://www.d-mat.de).
