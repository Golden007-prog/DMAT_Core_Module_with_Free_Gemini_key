import { useMemo } from 'react';
import { simulateFrames } from '../../engine/figureSequences/simulate';
import type { SymbolProgram } from '../../engine/types';
import SequencePlayer from '../components/SequencePlayer';
import LatinGrid from '../components/LatinGrid';

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

export default function Learn() {
  const bounceFrames = useMemo(() => simulateFrames(bounceDemo, 6)!, []);
  const xFrames = useMemo(() => simulateFrames(xPlusOneDemo, 6)!, []);
  const combinedFrames = useMemo(() => simulateFrames(combinedDemo, 6)!, []);

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-bold">Learn the Core Module</h1>
        <p className="mt-1 max-w-2xl text-zinc-600 dark:text-zinc-300">
          Each subtest gives you 20 tasks in 25 minutes — 75 seconds per task on average. Learn the rule
          systems here, then let the timer do the coaching.
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
          <Tip>At a wall a symbol either <strong>bounces off</strong> or <strong>slides along the border</strong> — one behaviour per symbol, kept consistent.</Tip>
          <Tip>Rotation happens in 90° steps, clockwise or counter-clockwise.</Tip>
          <Tip>Colours alternate (2-cycle) or rotate through three colours.</Tip>
          <Tip>Any rule can accelerate by x+1: 1 step, then 2, then 3…</Tip>
          <Tip>Symbols never disappear, never overlap, never leave the grid.</Tip>
        </ul>
        <h3 className="mt-5 text-sm font-semibold">Strategy</h3>
        <ul className="mt-2 space-y-1.5">
          <Tip>Track <strong>one symbol at a time</strong> across all four matrices before looking at the options.</Tip>
          <Tip>Compare the three options first — they usually differ in just one symbol. Deduce only that symbol's rule.</Tip>
          <Tip>Check position, then rotation, then colour — in that order.</Tip>
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
        <h3 className="mt-5 text-sm font-semibold">Strategy</h3>
        <ul className="mt-2 space-y-1.5">
          <Tip>Find the <strong>definition equations</strong> first — the ones that pin a letter directly (like 7 + A = 14) or define one letter from another (like B ÷ 2 = A).</Tip>
          <Tip>Substitute those into the longest equation (the "hub") last — it usually collapses to one unknown.</Tip>
          <Tip>All arithmetic stays in whole numbers. A fraction means you took a wrong turn.</Tip>
          <Tip>In choice mode, estimate before you compute — options like double or half of the true value are traps for rushed division.</Tip>
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
        <h3 className="mt-5 text-sm font-semibold">Strategy</h3>
        <ul className="mt-2 space-y-1.5">
          <Tip>Scan for the row or column with <strong>four givens</strong> — its fifth cell is free progress.</Tip>
          <Tip>Check the "?" cell's row + column union first; on easy tasks that alone solves it.</Tip>
          <Tip>Stuck? Pick the letter that appears most often in the grid and hunt its hidden single.</Tip>
        </ul>
      </Section>

      <Section id="pacing" title="Pacing & the real exam">
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
