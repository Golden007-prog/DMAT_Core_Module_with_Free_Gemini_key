# dMAT Practice — Free Core Module Test Simulator (Figure Sequences · Equations · Latin Squares)

**Practice the dMAT (digitaler Mastertest) Core Module for free, with unlimited questions and real
exam timing.** CoreForge is a free, open-source dMAT practice platform covering all three Core
Module subtests — **Figure Sequences (Figurenreihen), Mathematical Equations, and Latin Squares** —
in the official format: 20 tasks in 25 minutes, single choice, no note-taking.

### ▶ [**Start practicing now — no signup, no install**](https://golden007-prog.github.io/DMAT_Core_Module_with_Free_Gemini_key/)

[![Live](https://img.shields.io/badge/Live-github.io-A3195B)](https://golden007-prog.github.io/DMAT_Core_Module_with_Free_Gemini_key/)
[![License: MIT](https://img.shields.io/badge/License-MIT-green.svg)](LICENSE)
[![Tests](https://img.shields.io/badge/tests-144%20unit%20%2B%207%20e2e-2E8B57)](#quality--correctness)

![CoreForge home screen — choose Figure Sequences, Mathematical Equations, or Latin Squares](docs/screenshots/home.png)

## Who is this for?

Anyone preparing for the **dMAT** — the standardized aptitude test by **g.a.s.t. / TestDaF-Institut**
required for admission to many **German Master's programmes**. From 2026 the dMAT is also part of
**APS verification for applicants from India** (engineering, computer science, and business fields,
Summer Semester 2027 intakes onward). Official material offers only ~6 example exercises per task
type; this simulator gives you **unlimited, freshly generated practice** in exactly the same formats.

Searching for any of these? You're in the right place:
*dMAT practice test · dMAT Core Module · digitaler Mastertest Übung · dMAT Figurenreihen practice ·
dMAT preparation free · g.a.s.t. Mastertest practice · dMAT test simulator · APS dMAT India*

## What you get

| | |
|---|---|
| **Three exam-faithful subtests** | 4×4 figure matrices (predict the 5th & 6th frame), equation systems with whole-number solutions 1–20, and 5×5 Latin squares with the red "?" cell |
| **Real exam timing** | 20 tasks / 25:00 per subtest (75 s per task), drift-free timer, auto-submit, and a full 3-subtest exam run with 60-second breaks |
| **Unlimited questions** | Every set is freshly generated and machine-validated — never a broken question, never a wrong answer key |
| **Instant feedback + explanations** | Step-by-step deterministic solutions, rule breakdowns, and an animated sequence replay for figure tasks |
| **Progress analytics** | Accuracy trends, weakness detection by rule type (e.g. "x+1 acceleration", "hidden singles"), pacing vs the 75 s budget, streaks, and concrete drill suggestions |
| **Retry tools** | Replay the exact same set (seeded), or auto-build a set from your past mistakes |
| **Works offline** | Installable PWA; the full generator runs in your browser — no server, no account required |
| **Optional Google sign-in** | Sync history, settings, and generated sets across devices via Supabase ([setup guide](docs/GOOGLE_LOGIN_SETUP.md)) |
| **Optional free AI tutor** | Bring your own free Gemini API key for AI-generated equation variety and per-mistake tutor explanations — [get a free key](https://aistudio.google.com/apikey) |

![Figure Sequences task — four matrices with answer options for the 5th and 6th frame](docs/screenshots/figure-sequences.png)

## Why trust the questions?

Most practice sites hand-write a few dozen questions. CoreForge **generates and proves** each one:

- Every question passes a **programmatic validator** before you see it: exactly one correct answer,
  distinct plausible distractors, solvable under the official rule system.
- Figure tasks pass an **inferability check** — the moving/rotating/colour rules must be uniquely
  deducible from the four visible frames, or the task is regenerated.
- Equation systems are **brute-force proven** to have exactly one solution in 1–20.
- Latin squares are verified so that **every valid completion agrees** on the "?" cell, and the
  deduction depth matches the difficulty band.
- The engine is covered by **1000-seed property tests per task type per difficulty** plus a
  regression suite for timing/state bugs (144 unit tests, 7 end-to-end tests).

## Quality & correctness

```bash
npm install
npm test           # 144 unit + regression tests (engine properties, timer, R1–R5)
npm run e2e        # 7 Playwright end-to-end flows (needs: npx playwright install chromium)
npm run dev        # local dev server
npm run build      # static production build (deployable anywhere)
```

**Architecture:** pure deterministic generators + validators (`src/engine/`), a pure session state
machine with a deadline-based timer (`src/state/`), local-first storage in IndexedDB
(`src/storage/`), optional Supabase cloud sync (`src/cloud/`), optional Gemini layer with a local
validation firewall (`src/ai/`), React 19 + TypeScript + Tailwind v4 UI (`src/ui/`).

![Analytics — accuracy trends, difficulty heat strip, weakness leaderboard, pacing](docs/screenshots/analytics.png)

## Cloud sync & Google login (optional)

The app is fully usable anonymously and offline. Signing in with Google adds cross-device sync of
your history, settings, and generated sets, backed by Supabase with row-level security (each user
can only ever read/write their own rows — see [`supabase/schema.sql`](supabase/schema.sql)).
To wire up your own instance, follow [docs/GOOGLE_LOGIN_SETUP.md](docs/GOOGLE_LOGIN_SETUP.md).

## FAQ

**Is this the official dMAT test?** No. This is an independent, unofficial practice tool. For
official information and the original example exercises, visit [d-mat.de](https://www.d-mat.de).

**Does a good score here guarantee a good dMAT score?** No — the real dMAT reports a standardised
0–200 score that cannot be derived from practice accuracy. The app uses an honest ≥85% accuracy
heuristic for readiness and says so in the UI.

**Is it really free?** Yes — MIT-licensed, static hosting, no accounts required, no ads, no
tracking. The optional AI features use *your own* free-tier Gemini key.

**Can I practice on my phone?** Yes — the whole exam flow is responsive and keyboard/touch friendly,
and the app installs as a PWA for offline use.

## License & disclaimer

[MIT](LICENSE). Unofficial practice tool — not affiliated with g.a.s.t., TestDaF-Institut, or
d-mat.de. Question formats follow publicly documented dMAT task types; **all questions are
originally generated**. dMAT is a trademark of its owners.
