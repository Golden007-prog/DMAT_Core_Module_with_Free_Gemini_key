# CoreForge Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Free, static-hostable, offline-capable practice platform for the dMAT Core Module (Figure Sequences, Mathematical Equations, Latin Squares) with exam-faithful timing, deterministic validated question generation, analytics, and optional BYOK Gemini enhancement.

**Architecture:** Pure deterministic generation engine (seeded PRNG → generator → validator → explanation builder) decoupled from a pure session state machine and deadline-based timer, consumed by a React UI. All persistence local (Dexie/IndexedDB). Gemini layer is an optional, validated, abortable enhancement that can never gate functionality.

**Tech Stack:** React 19 + TypeScript + Vite, Tailwind CSS v4 (`@tailwindcss/vite`), Zustand, React Router, Dexie, vite-plugin-pwa, Vitest (+ fake-indexeddb), Playwright.

**Spec:** The user-provided CoreForge spec (§0–§15) is the canonical requirements document. This plan maps its milestones M0–M6 to tasks. Where this plan is terse, the spec section cited is normative.

## Global Constraints (from spec — apply to every task)

- R1: Restart = brand-new set atomically; sessionId-tagged generation; stale responses discarded.
- R2: Timer disarmed in SETUP/GENERATING/READY; arms only READY→RUNNING after first paint.
- R3: Full set generated + validated up front; runner cannot mount with fewer than N valid questions.
- R4: Deadline-based timer (`endsAt`), 250 ms tick, persisted snapshot, idempotent expiry, monotonic clock for remaining.
- R5: Answers keyed by question UUID, never array index.
- R6: Every question passes its type validator before entering a set; AI failures silently replaced by deterministic items.
- R7: Fully functional with zero API key + zero network after first load.
- Deterministic 20-set generation < 300 ms; Lighthouse ≥ 90; zero console errors; WCAG AA; keyboard operable.
- Never reproduce official g.a.s.t./d-mat.de exercises; original generated content only.
- Values: letters {A..E} for Latin; equation solutions integer 1..20 unique-solution; figures 4×4 grid, 4 given frames + 2 answer images × 3 options.
- Colors: accent `#A3195B` (hover `#8A1450`, tint `#F7E6EE`); ink `#1B1B1F`; success `#2E8B57`; error `#C43D3D`; warning `#D97A16`; symbol palette black `#1A1A1A`, pink `#C6316E`, yellow `#F2C230`, orange `#E8762C`, green `#3E9B4F`, blue `#2C5FA8`, white.
- Glyphs `×` and `÷` in equation display. Timer `tabular-nums`. Inter font (self-hostable fallback: system stack — no external fetch in runner path).

---

## M0 — Scaffold

**Files:** `package.json`, `vite.config.ts`, `tsconfig.json`, `index.html`, `src/main.tsx`, `src/App.tsx`, `src/ui/shell/*`, `src/styles.css` (Tailwind v4 `@import "tailwindcss"` + `@theme` tokens), `.gitignore`, `.github/workflows/ci.yml`.

- [ ] Manual scaffold (no interactive `npm create`): package.json with deps react@19, react-dom, react-router-dom@7, zustand, dexie, and devDeps typescript, vite, @vitejs/plugin-react, tailwindcss@4, @tailwindcss/vite, vitest, jsdom, @testing-library/react, fake-indexeddb, vite-plugin-pwa, playwright/@playwright/test.
- [ ] Theme tokens in `@theme` (accent/ink/surfaces/dark), shell with top bar + nav + routes (placeholder pages), dark/light toggle persisted to localStorage.
- [ ] `npm run build` green; `npm test` runs (1 smoke test); CI workflow: install → typecheck → test → build.
- [ ] Commit.

## M1 — Engine (correctness core)

**Files:** `src/engine/prng.ts`, `src/engine/types.ts`, `src/engine/figureSequences/{rules,simulate,generator,distractors,validate}.ts` + `symbols.tsx`, `src/engine/equations/{generator,solver,validate,distractors,format}.ts`, `src/engine/latinSquares/{generator,solver,validate,difficulty}.ts`, tests in `src/tests/engine/*.test.ts`.

**Interfaces (produced, consumed by M2–M6):**
- `createPrng(seed:number)` → `{ next():number; int(min,max):number; pick<T>(a:T[]):T; shuffle<T>(a:T[]):T[] }` (mulberry32).
- `generateFigureQuestion(difficulty, prng): FigureQuestion`, `validateFigureQuestion(q): {ok:boolean; reasons:string[]}`.
- `generateEquationQuestion(difficulty, prng, askMode): EquationQuestion`, `validateEquationQuestion(q)` (brute-force uniqueness over [1..20]^n).
- `generateLatinQuestion(difficulty, prng): LatinQuestion`, `validateLatinQuestion(q)` (unique forced target across ALL completions + solver-depth match).
- `generateSet(subtest, difficulty|'mixed', n, seed): Question[]` — deterministic, all validated.
- Figures: rule programs restricted to spec §3.1 (axis/diagonal bounce, perimeter walk, direction cycle, rotation ±90°, 2/3-colour cycles, x+1 acceleration); inferability gate: enumerate candidate rules consistent with frames 1–4, require agreement on frames 5–6; distractors = near-miss perturbations, deep-distinct, legal.
- Equations: solution-first construction from difficulty templates; display strings with `×`/`÷`; mechanical explanationSteps; 5 choice options with typical-error distractors.
- Latin: full square via cyclic + row/col/letter shuffles; greedy removal maintaining unique-forced target + BFS minimal forced-fill depth (easy=1, medium=2–3, hard=4+, hidden singles + elimination only); explanationSteps from solver chain.

- [ ] TDD: ×1000-seed property tests per type per difficulty → 0 validator failures; ambiguous/insoluble equation fixtures rejected; two-letter Latin "?" rejected; distractor distinctness; distribution sanity; 20-set < 300 ms perf test.
- [ ] Commit per engine module.

## M2 — State machine, timer, persistence

**Files:** `src/state/sessionMachine.ts`, `src/state/timer.ts`, `src/state/sessionStore.ts`, `src/state/settingsStore.ts`, `src/state/historyStore.ts`, `src/storage/db.ts`, `src/storage/exportImport.ts`, tests incl. `src/tests/regression/r1-r5.test.ts`.

**Interfaces:**
- `transition(session, event) → session` pure; states `setup|generating|ready|running|finished|reviewed`; events `CONFIGURE|GENERATED|CANCEL|START|ANSWER|FLAG|SUBMIT|TIME_UP|RESTART|REVIEW`; illegal transitions throw in dev, no-op in prod.
- `createTimer(clock)` → `{ arm(endsAt), disarm(), freeze(), resume(), subscribe(cb), remainingMs(), onExpire(cb) }` — deadline-based, single-fire expiry, injectable clock (`performance.now` monotonic + `Date.now` reconciliation).
- `sessionStore`: `configure(cfg)`, `generate()` (AbortController, sessionId-tagged), `start()`, `answer(questionId, value)`, `submit()`, `restart()`; snapshot persisted to Dexie on every answer; `resumeFromSnapshot()`.
- Dexie tables: `sessions`, `attempts`, `aiCache`, `settings`; in-memory fallback when IndexedDB unavailable; BroadcastChannel tab lock.
- Scoring: `computeScore(session) → SessionScore` (overall %, per-difficulty, per-ruleTag, per-question time, unanswered).

- [ ] Regression tests R1–R5 exactly as spec §12 (restart during GENERATING/RUNNING; 5 s generation delay → full duration at READY; runner mount guard; refresh restore ±1 s; triple expiry ticks → one FINISHED; UUID answer isolation).
- [ ] Fake-clock drift test < 1 s over simulated 25 min.
- [ ] Commit.

## M3 — Runner UI, Results, Review

**Files:** `src/ui/screens/{Home,Runner,Results,Review}.tsx`, `src/ui/components/{TimerDisplay,ProgressBar,OptionCard,QuestionPalette,FigureGrid,FrameStrip,EquationBlock,LatinGrid,AnswerRow,ExplanationPanel,SequencePlayer,Toast,ConfirmDialog}.tsx`, `src/engine/figureSequences/symbols.tsx` (SVG shape components, 4 rotations, colour-blind-safe).

- [ ] Home: three subtest cards + Full Core Module hero card + config (difficulty/size/mode/instant-feedback), mini stats.
- [ ] Runner per spec §8.2: figures strip + two 3-option image groups (keys 1–3 twice); equations mono block + 5 chips (keys 1–5) or steppers; latin 5×5 SVG + A–E buttons (keys A–E), red `?`, practice-only row/col hover highlight; footer nav per mode; timer amber <5:00, red pulse <1:00, hide-timer option; no-note-taking banner (exam), instant feedback (practice).
- [ ] Results: score ring, per-difficulty bars, weakest ruleTags, honest 0–200 disclaimer; CTAs.
- [ ] Review: read-only re-render, your/correct answers, explanations, figures "Play sequence" animation (400 ms/frame).
- [ ] Invoke frontend-design + dataviz skills before building UI/charts. Reduced-motion respected. Commit.

## M4 — Exam mode, Full Core run, History

- [ ] Exam mode: forward-only nav (toggle labelled "Official behaviour unconfirmed"), no pause, tab-switch doesn't stop clock, submit-early confirm, auto-submit once at 0:00.
- [ ] Full Core Module: 3 subtests × 20Q × 25:00 with skippable 60 s break screens; sequential session chaining.
- [ ] History screen: sessions table → frozen review; "Retry this exact set" (same seed) and "Retry my mistakes" (formats of wrong questions). Refresh-resume + two-tab lock wired to UI. Commit.

## M5 — Analytics + Learn

- [ ] Analytics: accuracy-over-time per subtest (SVG line), difficulty heat strip, ruleTag weakness leaderboard (≥5 attempts gate), time-vs-75s trend, streak; deterministic insight rules per spec §10.
- [ ] Learn: three teaching pages with animated SVG mini-demos (bounce, x+1 walk, hidden single), strategy + pacing tips, link to d-mat.de (no reproduction). Commit.

## M6 — Gemini layer, Settings, PWA, E2E, deploy docs

- [ ] `src/ai/{gemini,prompts,coach,validateAi}.ts`: MODEL_CHAIN `['gemini-3-flash','gemini-2.5-flash','gemini-2.5-flash-lite']` + model discovery via `GET /v1beta/models`; JSON schema responses; backoff ×3 (1s/2s/4s + jitter) → chain fallback → deterministic fallback + toast; 25-call/day budget meter; 20 s timeout; AbortController per session; validation firewall (parse → schema → type validator → sanitise, plain-text render). G1 batched equation sets, G2 explain-my-mistake (cached by questionSeed+answer), G3 coaching narrative (cached by stats hash, ≥3 sessions).
- [ ] Settings: key field + Test key + AI Studio link + honest data note; model chain override; budget meter; equation answer mode; exam nav toggle; theme; Export/Import/Delete-all.
- [ ] PWA precache; footer disclaimer; README; vercel.json + Cloudflare `_redirects`; optional `deploy/worker-proxy.ts`.
- [ ] Playwright: happy path ×3 subtests, exam timeout auto-submit, restart-mid-test, mobile viewport. Final self-check §15. Commit.
