import type { Difficulty, EquationQuestion } from '../types';
import type { Prng } from '../prng';
import { MINUS, TIMES, DIVIDE } from './format';
import { parseEquation } from './validate';
import { countSolutions } from './solver';
import { buildChoiceOptions } from './distractors';

/** One constructed equation plus the material for a mechanical explanation.
 *  `explain` receives the 1-based position the equation ends up at on screen. */
interface BuiltEq {
  display: string;
  explain: (idx: number) => string;
  tags: string[];
}

/** Linear expression of a variable in terms of the root: value = a·root + b. */
interface RootExpr {
  a: number;
  b: number;
}

/* ------------------------------ form builders ----------------------------- */

/** Equation that resolves `v` to `val` directly (anchor). */
function directForm(v: string, val: number, prng: Prng): BuiltEq {
  type Variant = { display: string; solveText: string; tags: string[] };
  const variants: Variant[] = [];

  const k = prng.int(1, 15);
  variants.push({
    display: `${k} + ${v} = ${k + val}`,
    solveText: `${v} = ${k + val} ${MINUS} ${k} = ${val}`,
    tags: [],
  });

  const mulNs = [2, 3, 4, 5].filter((n) => n * val <= 99);
  if (mulNs.length > 0) {
    const n = prng.pick(mulNs);
    variants.push({
      display: `${n} ${TIMES} ${v} = ${n * val}`,
      solveText: `${v} = ${n * val} ${DIVIDE} ${n} = ${val}`,
      tags: ['eq.op.mul'],
    });
  }

  if (val >= 2) {
    const k2 = prng.int(1, val - 1);
    variants.push({
      display: `${v} ${MINUS} ${k2} = ${val - k2}`,
      solveText: `${v} = ${val - k2} + ${k2} = ${val}`,
      tags: [],
    });
  }

  const k3 = prng.int(val + 1, Math.min(val + 15, 99));
  variants.push({
    display: `${k3} ${MINUS} ${v} = ${k3 - val}`,
    solveText: `${v} = ${k3} ${MINUS} ${k3 - val} = ${val}`,
    tags: [],
  });

  const divNs = [2, 3, 4, 5].filter((n) => val % n === 0 && val / n >= 1);
  if (divNs.length > 0) {
    const n = prng.pick(divNs);
    variants.push({
      display: `${v} ${DIVIDE} ${n} = ${val / n}`,
      solveText: `${v} = ${val / n} ${TIMES} ${n} = ${val}`,
      tags: ['eq.op.div'],
    });
  }

  const chosen = prng.pick(variants);
  return {
    display: chosen.display,
    explain: (idx) => `Eq. ${idx}: ${chosen.display} → ${chosen.solveText}.`,
    tags: chosen.tags,
  };
}

/** Equation defining `y` from `x` (link/definition). Returns the derived yVal. */
function linkForm(
  x: string,
  xVal: number,
  xExpr: RootExpr,
  y: string,
  prng: Prng,
  opts: { forceMulDiv?: boolean } = {},
): { built: BuiltEq; yVal: number; yExpr: RootExpr } | null {
  type Variant = {
    display: string;
    yVal: number;
    yExpr: RootExpr;
    relText: string;
    tags: string[];
  };
  const variants: Variant[] = [];

  const mulNs = [2, 3, 4, 5, 10].filter((n) => n * xVal <= 20 && n * xVal !== xVal);
  if (mulNs.length > 0) {
    const n = prng.pick(mulNs);
    const yVal = n * xVal;
    variants.push({
      display: `${n} ${TIMES} ${x} = ${y}`,
      yVal,
      yExpr: { a: n * xExpr.a, b: n * xExpr.b },
      relText: `${y} = ${n} ${TIMES} ${x} = ${yVal}`,
      tags: ['eq.op.mul'],
    });
    variants.push({
      display: `${y} ${DIVIDE} ${n} = ${x}`,
      yVal,
      yExpr: { a: n * xExpr.a, b: n * xExpr.b },
      relText: `${y} = ${n} ${TIMES} ${x} = ${yVal}`,
      tags: ['eq.op.div'],
    });
  }

  if (!opts.forceMulDiv) {
    if (xVal <= 19) {
      const k = prng.int(1, 20 - xVal);
      const yVal = xVal + k;
      const rel = `${y} = ${x} + ${k} = ${yVal}`;
      variants.push({
        display: `${k} + ${x} = ${y}`,
        yVal,
        yExpr: { a: xExpr.a, b: xExpr.b + k },
        relText: rel,
        tags: [],
      });
      variants.push({
        display: `${y} ${MINUS} ${k} = ${x}`,
        yVal,
        yExpr: { a: xExpr.a, b: xExpr.b + k },
        relText: rel,
        tags: [],
      });
    }
    if (xVal >= 2) {
      const k = prng.int(1, xVal - 1);
      const yVal = xVal - k;
      variants.push({
        display: `${x} ${MINUS} ${k} = ${y}`,
        yVal,
        yExpr: { a: xExpr.a, b: xExpr.b - k },
        relText: `${y} = ${x} ${MINUS} ${k} = ${yVal}`,
        tags: [],
      });
    }
    {
      // y = k − x
      let k = prng.int(xVal + 1, Math.min(xVal + 20, 99));
      if (k === 2 * xVal) k = k === xVal + 1 ? k + 1 : k - 1; // avoid y === x
      const yVal = k - xVal;
      if (yVal >= 1 && yVal <= 20) {
        variants.push({
          display: `${k} ${MINUS} ${x} = ${y}`,
          yVal,
          yExpr: { a: -xExpr.a, b: k - xExpr.b },
          relText: `${y} = ${k} ${MINUS} ${x} = ${yVal}`,
          tags: [],
        });
      }
    }
    // y = n·x − m (official: "3 × C − 1 = B")
    const mulMinusNs = [2, 3].filter((n) => n * xVal >= 2);
    if (mulMinusNs.length > 0) {
      const n = prng.pick(mulMinusNs);
      const lo = Math.max(1, n * xVal - 20);
      const hi = n * xVal - 1;
      if (hi >= lo) {
        const m = prng.int(lo, Math.min(hi, 99));
        const yVal = n * xVal - m;
        if (yVal >= 1 && yVal <= 20 && yVal !== xVal) {
          variants.push({
            display: `${n} ${TIMES} ${x} ${MINUS} ${m} = ${y}`,
            yVal,
            yExpr: { a: n * xExpr.a, b: n * xExpr.b - m },
            relText: `${y} = ${n} ${TIMES} ${x} ${MINUS} ${m} = ${yVal}`,
            tags: ['eq.op.mul'],
          });
        }
      }
    }
  }

  if (variants.length === 0) return null;
  const chosen = prng.pick(variants);
  return {
    built: {
      display: chosen.display,
      explain: (idx) => `Eq. ${idx}: ${chosen.display} → ${chosen.relText}.`,
      tags: chosen.tags,
    },
    yVal: chosen.yVal,
    yExpr: chosen.yExpr,
  };
}

/** Combining equation with coefficients: a×Z ± b×P = c  (resolves z last). */
function combineForm(
  z: string,
  zVal: number,
  known: { v: string; val: number },
  prng: Prng,
): BuiltEq | null {
  for (let attempt = 0; attempt < 8; attempt++) {
    const a = prng.int(1, 3);
    const b = prng.int(1, 3);
    const sign = prng.chance(0.5) ? 1 : -1;
    const c = a * zVal + sign * b * known.val;
    if (c < 1 || c > 99) continue;
    const zTerm = a === 1 ? z : `${a} ${TIMES} ${z}`;
    const pTerm = b === 1 ? known.v : `${b} ${TIMES} ${known.v}`;
    const display = `${zTerm} ${sign === 1 ? '+' : MINUS} ${pTerm} = ${c}`;
    const contribution = sign * b * known.val;
    return {
      display,
      explain: (idx) =>
        `Substitute ${known.v} = ${known.val} into eq. ${idx}: ${display} → ` +
        `${a === 1 ? '' : `${a} ${TIMES} `}${z} = ${c} ${contribution >= 0 ? MINUS : '+'} ${Math.abs(contribution)}` +
        `${a === 1 ? '' : `, then ${DIVIDE} ${a}`} → ${z} = ${zVal}.`,
      tags: ['eq.combine'],
    };
  }
  return null;
}

/** Hub equation over 3–4 variables with ±1 coefficients (hard). Requires the
 *  net coefficient in the root variable to be non-zero so the hub pins it. */
function hubForm(
  hubVars: { v: string; val: number; expr: RootExpr }[],
  root: string,
  rootVal: number,
  prng: Prng,
): BuiltEq | null {
  for (let attempt = 0; attempt < 16; attempt++) {
    const signs = hubVars.map((_, i) => (i === 0 ? 1 : prng.chance(0.5) ? 1 : -1));
    const c = hubVars.reduce((acc, hv, i) => acc + signs[i] * hv.val, 0);
    const alpha = hubVars.reduce((acc, hv, i) => acc + signs[i] * hv.expr.a, 0);
    const beta = hubVars.reduce((acc, hv, i) => acc + signs[i] * hv.expr.b, 0);
    if (c < 1 || c > 99 || alpha === 0) continue;
    const display = `${hubVars
      .map((hv, i) => (i === 0 ? hv.v : `${signs[i] === 1 ? '+' : MINUS} ${hv.v}`))
      .join(' ')} = ${c}`;
    return {
      display,
      explain: (idx) =>
        `Substitute the definitions into eq. ${idx} (${display}): everything reduces to the single unknown ${root}: ` +
        `${alpha} ${TIMES} ${root} ${beta >= 0 ? '+' : MINUS} ${Math.abs(beta)} = ${c} → ` +
        `${root} = ${rootVal}.`,
      tags: ['eq.hub'],
    };
  }
  return null;
}

/* --------------------------------- builder -------------------------------- */

interface Construction {
  variables: string[];
  solution: Record<string, number>;
  built: BuiltEq[]; // construction order
  solveOrder: number[]; // indices into built, in the order a human solves them
  target: string;
  tags: string[];
}

function buildEasy(prng: Prng): Construction | null {
  const [x, y] = prng.shuffle(['A', 'B']);
  const xVal = prng.int(1, 20);
  const anchor = directForm(x, xVal, prng);
  const link = linkForm(x, xVal, { a: 1, b: 0 }, y, prng);
  if (!link || link.yVal === xVal) return null;
  return {
    variables: ['A', 'B'],
    solution: { [x]: xVal, [y]: link.yVal },
    built: [anchor, link.built],
    solveOrder: [0, 1],
    target: y,
    tags: ['eq.vars2', 'eq.subst.depth1'],
  };
}

function buildMedium(prng: Prng): Construction | null {
  const [x, y, z] = prng.shuffle(['A', 'B', 'C']);
  const xVal = prng.int(1, 10); // keeps a multiplicative definition feasible
  const anchor = directForm(x, xVal, prng);
  const def = linkForm(x, xVal, { a: 1, b: 0 }, y, prng, { forceMulDiv: true });
  if (!def || def.yVal === xVal) return null;
  let zVal = prng.int(1, 20);
  if (zVal === xVal || zVal === def.yVal) zVal = ((zVal + 6) % 20) + 1;
  if (zVal === xVal || zVal === def.yVal) return null;
  const knownPool = [
    { v: x, val: xVal },
    { v: y, val: def.yVal },
  ];
  const combine = combineForm(z, zVal, prng.pick(knownPool), prng);
  if (!combine) return null;
  return {
    variables: ['A', 'B', 'C'],
    solution: { [x]: xVal, [y]: def.yVal, [z]: zVal },
    built: [anchor, def.built, combine],
    solveOrder: [0, 1, 2],
    target: z,
    tags: ['eq.vars3', 'eq.subst.depth2'],
  };
}

function buildHard(prng: Prng): Construction | null {
  const vars = prng.shuffle(['A', 'B', 'C', 'D']);
  const root = vars[0];
  const rootVal = prng.int(1, 20);
  const vals: Record<string, number> = { [root]: rootVal };
  const exprs: Record<string, RootExpr> = { [root]: { a: 1, b: 0 } };
  const defined = [root];
  const defs: BuiltEq[] = [];

  for (let i = 1; i < 4; i++) {
    const v = vars[i];
    const src = prng.pick(defined);
    const link = linkForm(src, vals[src], exprs[src], v, prng);
    if (!link) return null;
    vals[v] = link.yVal;
    exprs[v] = link.yExpr;
    defined.push(v);
    defs.push(link.built);
  }

  // distinct-ish: allow at most one duplicate value pair on hard
  const values = Object.values(vals);
  const dupPairs = values.length - new Set(values).size;
  if (dupPairs > 1) return null;

  const hubSize = prng.chance(0.5) ? 4 : 3;
  const hubVarNames = hubSize === 4 ? vars : prng.shuffle(vars).slice(0, 3);
  const hub = hubForm(
    hubVarNames.map((v) => ({ v, val: vals[v], expr: exprs[v] })),
    root,
    rootVal,
    prng,
  );
  if (!hub) return null;

  return {
    variables: ['A', 'B', 'C', 'D'],
    solution: vals,
    built: [...defs, hub],
    // human order: read the definitions, then crack the hub
    solveOrder: [0, 1, 2, 3],
    target: root,
    tags: ['eq.vars4', 'eq.subst.depth3'],
  };
}

/* --------------------------------- public --------------------------------- */

export function generateEquationQuestion(
  difficulty: Difficulty,
  prng: Prng,
  askMode: 'choice' | 'entry' = 'choice',
): EquationQuestion {
  const seed = prng.int(0, 2 ** 31 - 1); // recorded for reproducibility/reporting

  for (let attempt = 0; attempt < 200; attempt++) {
    const construction =
      difficulty === 'easy'
        ? buildEasy(prng)
        : difficulty === 'medium'
          ? buildMedium(prng)
          : buildHard(prng);
    if (!construction) continue;

    const { variables, solution, built, solveOrder, target } = construction;

    // shuffle on-screen order, then resolve explanation references
    const perm = prng.shuffle(built.map((_, i) => i));
    const displayed = perm.map((i) => built[i]);
    const displayIndexOf = (builtIdx: number) => perm.indexOf(builtIdx) + 1;
    const equationsDisplay = displayed.map((b) => b.display);
    const explanationSteps = solveOrder.map((builtIdx) =>
      built[builtIdx].explain(displayIndexOf(builtIdx)),
    );

    // paranoia gate: parse what the user will see and prove unique solvability
    let parsed;
    try {
      parsed = equationsDisplay.map(parseEquation);
    } catch {
      continue;
    }
    const res = countSolutions(parsed, variables, 20, 2);
    if (res.count !== 1) continue;
    if (variables.some((v) => res.solutions[0][v] !== solution[v])) continue;

    const ruleTags = [
      ...construction.tags,
      ...new Set(built.flatMap((b) => b.tags)),
    ];

    const question: EquationQuestion = {
      id: crypto.randomUUID(),
      type: 'equations',
      difficulty,
      seed,
      ruleTags,
      variables,
      equationsDisplay,
      solution,
      askMode,
      explanationSteps,
    };
    if (askMode === 'choice') {
      question.target = { variable: target, ...buildChoiceOptions(target, solution, prng) };
    }
    return question;
  }
  throw new Error(`equation generation exhausted retries (${difficulty})`);
}
