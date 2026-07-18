import { useEffect, useMemo, useState } from 'react';
import { simulateFrames } from '../../engine/figureSequences/simulate';
import type { SymbolProgram } from '../../engine/types';
import {
  TRICKS,
  TRICK_LEVEL_LABELS,
  TRICK_SUBTEST_LABELS,
  type TrickLevel,
  type TrickSubtest,
} from '../../content/tricks';
import SequencePlayer from '../components/SequencePlayer';
import LatinGrid from '../components/LatinGrid';
import TrickCard from '../components/TrickCard';

const bounceDemo: SymbolProgram[] = [
  {
    symbolId: 'demo1',
    shape: 'triangle',
    color: 'pink',
    initialRotation: 0,
    startRow: 1,
    startCol: 0,
    movement: { kind: 'axis-bounce', dr: 0, dc: 1, step: 1, boundary: 'bounce' },
  },
];

const xPlusOneDemo: SymbolProgram[] = [
  {
    symbolId: 'demo2',
    shape: 'circle',
    color: 'blue',
    initialRotation: 0,
    startRow: 0,
    startCol: 0,
    movement: { kind: 'perimeter', dir: 'cw', step: 'x+1' },
  },
];

const combinedDemo: SymbolProgram[] = [
  {
    symbolId: 'demo3',
    shape: 'halfCircle',
    color: 'black',
    initialRotation: 0,
    startRow: 3,
    startCol: 0,
    movement: { kind: 'axis-bounce', dr: -1, dc: 1, step: 1, boundary: 'bounce' },
    rotation: { dir: 'cw', count: 1 },
    colorRule: { cycle: ['black', 'pink'] },
  },
];

const hiddenSingleGrid: Array<Array<'A' | 'B' | 'C' | 'D' | 'E' | null>> = [
  [null, null, null, null, null],
  [null, 'A', null, null, null],
  [null, null, 'A', null, null],
  [null, null, null, 'A', null],
  [null, null, null, null, 'A'],
];

const SUBTEST_FILTERS: Array<TrickSubtest | 'all'> = [
  'all',
  'figures',
  'equations',
  'latin',
  'gam',
  'pacing',
  'mindset',
];
const LEVEL_FILTERS: Array<TrickLevel | 'all'> = ['all', 'core', 'sharp', 'elite'];

const LEARNED_KEY = 'coreforge-learned-tricks';

function readLearned(): string[] {
  try {
    const raw = window.localStorage.getItem(LEARNED_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown;
    return Array.isArray(parsed) ? parsed.filter((id): id is string => typeof id === 'string') : [];
  } catch {
    return []; /* storage unavailable → progress is session-only */
  }
}

function Section({ id, title, children }: { id: string; title: string; children: React.ReactNode }) {
  return (
    <section id={id} className="rounded-card border border-zinc-200 bg-surface p-5 shadow-card sm:p-6 dark:border-zinc-800 dark:bg-surface-dark-alt">
      <h2 className="text-xl font-bold">{title}</h2>
      {children}
    </section>
  );
}

function Tip({ children }: { children: React.ReactNode }) {
  return (
    <li className="flex gap-2 text-sm text-zinc-700 dark:text-zinc-300">
      <span aria-hidden="true" className="text-accent dark:text-accent-dark">▸</span>
      <span>{children}</span>
    </li>
  );
}

/** Learned-count ring. 44px so it survives the 360px header row. */
function ProgressRing({ done, total }: { done: number; total: number }) {
  const r = 18;
  const c = 2 * Math.PI * r;
  const pct = total === 0 ? 0 : done / total;
  return (
    <div className="flex items-center gap-3">
      <svg
        viewBox="0 0 44 44"
        className="h-11 w-11 shrink-0 -rotate-90"
        role="img"
        aria-label={`${done} of ${total} tricks marked as learned`}
      >
        <circle cx="22" cy="22" r={r} fill="none" strokeWidth="4" className="stroke-zinc-200 dark:stroke-zinc-700" />
        <circle
          cx="22"
          cy="22"
          r={r}
          fill="none"
          strokeWidth="4"
          strokeLinecap="round"
          strokeDasharray={`${pct * c} ${c}`}
          className="stroke-accent dark:stroke-accent-dark"
        />
      </svg>
      <p className="text-sm text-zinc-600 dark:text-zinc-300">
        <span className="font-bold text-ink dark:text-zinc-100">{done}</span> / {total} learned
      </p>
    </div>
  );
}

export default function Learn() {
  const bounceFrames = useMemo(() => simulateFrames(bounceDemo, 6)!, []);
  const xFrames = useMemo(() => simulateFrames(xPlusOneDemo, 6)!, []);
  const combinedFrames = useMemo(() => simulateFrames(combinedDemo, 6)!, []);

  const [query, setQuery] = useState('');
  const [subtest, setSubtest] = useState<TrickSubtest | 'all'>('all');
  const [level, setLevel] = useState<TrickLevel | 'all'>('all');
  const [hideLearned, setHideLearned] = useState(false);
  const [learned, setLearned] = useState<string[]>(readLearned);

  useEffect(() => {
    try {
      window.localStorage.setItem(LEARNED_KEY, JSON.stringify(learned));
    } catch {
      /* fine — the in-memory copy still drives this session */
    }
  }, [learned]);

  const toggleLearned = (id: string) =>
    setLearned((ids) => (ids.includes(id) ? ids.filter((x) => x !== id) : [...ids, id]));

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return TRICKS.filter((t) => {
      if (subtest !== 'all' && t.subtest !== subtest) return false;
      if (level !== 'all' && t.level !== level) return false;
      if (hideLearned && learned.includes(t.id)) return false;
      if (q && !`${t.title} ${t.body}`.toLowerCase().includes(q)) return false;
      return true;
    });
  }, [query, subtest, level, hideLearned, learned]);

  const chipClass = (active: boolean) =>
    `rounded-lg px-3 py-1.5 text-sm font-medium ${
      active
        ? 'bg-accent text-white dark:bg-accent-dark'
        : 'bg-zinc-100 text-zinc-600 hover:bg-zinc-200 dark:bg-zinc-800 dark:text-zinc-300'
    }`;

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-bold">Learn the Core Module</h1>
        <p className="mt-1 max-w-2xl text-zinc-600 dark:text-zinc-300">
          Each subtest gives you 20 tasks in 25 minutes — 75 seconds per task on average. Learn the rule
          systems here, then work the {TRICKS.length} tricks below: every one of them is derived from the
          exact generators that build your questions.
        </p>
      </header>

      <Section id="figures" title="Figure Sequences">
        <p className="mt-2 text-sm text-zinc-700 dark:text-zinc-300">
          You see four 4×4 matrices. Symbols move, rotate, and change colour by fixed rules from matrix to
          matrix. Your job: pick what matrix 5 (Image 1) and matrix 6 (Image 2) look like — three options
          each.
        </p>
        <div className="mt-4 grid gap-6 sm:grid-cols-3">
          <div>
            <h3 className="mb-2 text-sm font-semibold">Bounce off walls</h3>
            <SequencePlayer frames={bounceFrames} />
            <p className="mt-2 text-xs text-zinc-500 dark:text-zinc-400">
              A symbol that would leave the grid reflects its direction.
            </p>
          </div>
          <div>
            <h3 className="mb-2 text-sm font-semibold">x+1 acceleration</h3>
            <SequencePlayer frames={xFrames} />
            <p className="mt-2 text-xs text-zinc-500 dark:text-zinc-400">
              Border walk speeding up: 1 cell, then 2, then 3…
            </p>
          </div>
          <div>
            <h3 className="mb-2 text-sm font-semibold">Combined rules</h3>
            <SequencePlayer frames={combinedFrames} />
            <p className="mt-2 text-xs text-zinc-500 dark:text-zinc-400">
              Move + rotate 90° + alternate colour — all at once.
            </p>
          </div>
        </div>
        <h3 className="mt-5 text-sm font-semibold">The full rule system</h3>
        <ul className="mt-2 space-y-1.5">
          <Tip>Movement: straight lines (also diagonals), walks along the outer border, or a repeating direction sequence (left, up, right, down, …).</Tip>
          <Tip>At a wall a symbol <strong>bounces off</strong>: the blocked component of its direction reverses (both, in a corner). Only <strong>diagonal</strong> symbols may instead <strong>slide</strong> — cancelling the blocked component and travelling on along the border. One behaviour per symbol, kept consistent.</Tip>
          <Tip>Rotation happens in 90° steps, clockwise or counter-clockwise — and only on the five shapes whose quarter-turns look different (triangle, half-circle, half-square, T-shape, L-shape).</Tip>
          <Tip>Colours alternate (2-cycle) or rotate through three colours.</Tip>
          <Tip><strong>Movement and rotation</strong> can accelerate by x+1: 1 step, then 2, then 3… Colour cycles and direction-sequence movers never do.</Tip>
          <Tip>Symbols never disappear, never overlap, never leave the grid.</Tip>
        </ul>
      </Section>

      <Section id="equations" title="Mathematical Equations">
        <p className="mt-2 text-sm text-zinc-700 dark:text-zinc-300">
          A small system of equations; every letter is a whole number from 1 to 20 and the system has
          exactly one solution. Example:
        </p>
        <div className="mt-3 inline-block rounded-lg bg-white px-5 py-3 font-mono text-lg leading-8 text-ink shadow-card">
          <div>7 + A = 14</div>
          <div>B ÷ 2 = A</div>
          <div>A − B + C = 3</div>
        </div>
        <p className="mt-3 text-sm text-zinc-700 dark:text-zinc-300">
          First equation: A = 7. Second: B = 2 × A = 14. Substitute into the third: 7 − 14 + C = 3 → C =
          10.
        </p>
        <ul className="mt-4 space-y-1.5">
          <Tip>One letter in an equation = an <strong>anchor</strong>; two letters = a <strong>definition</strong>; three or four = the <strong>hub</strong>. Solve them in that order — never in the printed order.</Tip>
          <Tip>All arithmetic stays in whole numbers between 1 and 20. A fraction means you took a wrong turn.</Tip>
        </ul>
      </Section>

      <Section id="latin" title="Latin Squares">
        <p className="mt-2 text-sm text-zinc-700 dark:text-zinc-300">
          Each letter A–E appears exactly once per row and column. Find the letter behind the red "?" —
          sometimes you must fill other cells mentally first.
        </p>
        <div className="mt-4 grid items-start gap-6 sm:grid-cols-2">
          <div>
            <LatinGrid grid={hiddenSingleGrid} question={{ row: 0, col: 0 }} />
          </div>
          <div className="text-sm text-zinc-700 dark:text-zinc-300">
            <h3 className="font-semibold">The hidden single</h3>
            <p className="mt-2">
              Row 1 is empty — elimination alone says nothing about the "?". But look at the letter{' '}
              <strong>A</strong>: columns 2, 3, 4 and 5 already contain an A. In row 1, A fits only in the
              first cell → <strong>? = A</strong>.
            </p>
            <p className="mt-2">
              That's the two-rule toolkit the test wants: <em>elimination</em> (four letters visible in a
              cell's row + column force the fifth) and <em>hidden singles</em> (a letter with only one
              legal cell left in a row or column).
            </p>
          </div>
        </div>
      </Section>

      <Section id="tricks" title={`The trick library (${TRICKS.length})`}>
        <p className="mt-2 max-w-2xl text-sm text-zinc-700 dark:text-zinc-300">
          Specific, checkable techniques — the arithmetic of x+1, the decoys the option builder actually
          produces, the scan orders that survive without notes. Mark one as learned once you have used it
          under the clock, not once you have read it.
        </p>

        <div className="mt-4">
          <ProgressRing done={learned.length} total={TRICKS.length} />
        </div>

        <div className="mt-4">
          <label htmlFor="trick-search" className="text-sm font-semibold">
            Search the tricks
          </label>
          <input
            id="trick-search"
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="bounce, hidden single, x+1, hub…"
            className="mt-1 w-full rounded-lg border border-zinc-200 bg-surface px-3 py-2 text-sm dark:border-zinc-700 dark:bg-surface-dark"
          />
        </div>

        <div className="mt-3 flex flex-wrap gap-1.5">
          {SUBTEST_FILTERS.map((f) => (
            <button
              key={f}
              type="button"
              onClick={() => setSubtest(f)}
              aria-pressed={subtest === f}
              className={chipClass(subtest === f)}
            >
              {f === 'all'
                ? `All (${TRICKS.length})`
                : `${TRICK_SUBTEST_LABELS[f]} (${TRICKS.filter((t) => t.subtest === f).length})`}
            </button>
          ))}
        </div>

        <div className="mt-2 flex flex-wrap gap-1.5">
          {LEVEL_FILTERS.map((f) => (
            <button
              key={f}
              type="button"
              onClick={() => setLevel(f)}
              aria-pressed={level === f}
              className={chipClass(level === f)}
            >
              {f === 'all' ? 'Every level' : TRICK_LEVEL_LABELS[f]}
            </button>
          ))}
          <button
            type="button"
            onClick={() => setHideLearned((v) => !v)}
            aria-pressed={hideLearned}
            className={chipClass(hideLearned)}
          >
            Hide learned
          </button>
        </div>

        <p className="mt-3 text-xs text-zinc-500 dark:text-zinc-400" aria-live="polite">
          Showing {filtered.length} of {TRICKS.length}.
        </p>

        {filtered.length === 0 ? (
          <p className="mt-4 rounded-card border border-zinc-200 p-6 text-center text-sm text-zinc-500 dark:border-zinc-800 dark:text-zinc-400">
            Nothing matches that filter.
          </p>
        ) : (
          <ul className="mt-3 space-y-2">
            {filtered.map((trick) => (
              <TrickCard
                key={trick.id}
                trick={trick}
                learned={learned.includes(trick.id)}
                onToggleLearned={() => toggleLearned(trick.id)}
              />
            ))}
          </ul>
        )}
      </Section>

      <Section id="pacing" title="The real exam">
        <ul className="mt-3 space-y-1.5">
          <Tip>75 seconds per task on average — but easy tasks should take 30–40 s so hard ones can have two minutes.</Tip>
          <Tip>Never leave blanks: there is no negative marking, so a guess is strictly better than an empty answer.</Tip>
          <Tip>No note-taking is allowed in the real exam. Practise solving mentally from the start.</Tip>
        </ul>
        <p className="mt-4 text-sm text-zinc-500 dark:text-zinc-400">
          The official preparatory materials with authentic example tasks are on{' '}
          <a
            href="https://www.d-mat.de"
            target="_blank"
            rel="noreferrer"
            className="font-semibold text-accent hover:underline dark:text-accent-dark"
          >
            d-mat.de
          </a>{' '}
          — work through them once; CoreForge gives you unlimited practice in the same formats.
        </p>
      </Section>
    </div>
  );
}
