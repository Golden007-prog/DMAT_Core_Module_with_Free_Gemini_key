import type { EquationQuestion, ValidationResult } from '../types';
import type { LinearEq } from './solver';
import { countSolutions } from './solver';

/**
 * Parses one displayed equation (official grammar, §3.2) into linear form.
 * Grammar: side = term ((+|−) term)* ; term = int | var | int × var | var ÷ int.
 * Throws on anything outside the grammar — this is the linter used both on our
 * own output (paranoia) and on all AI-generated systems (validation firewall).
 */
export function parseEquation(display: string): LinearEq {
  if (/[*/^()]/.test(display)) throw new Error(`illegal operator in "${display}"`);
  const normalized = display.replace(/−/g, '-').replace(/\s+/g, ' ').trim();
  const sides = normalized.split('=');
  if (sides.length !== 2) throw new Error(`expected exactly one "=" in "${display}"`);

  const parseSide = (side: string): { coeffs: Record<string, number>; constant: number } => {
    const coeffs: Record<string, number> = {};
    let constant = 0;
    const compact = side.trim();
    if (compact === '') throw new Error(`empty side in "${display}"`);
    // split into signed terms
    const tokens = compact.match(/[+-]?[^+-]+/g);
    if (!tokens) throw new Error(`unparseable side "${side}"`);
    for (const raw of tokens) {
      let token = raw.trim();
      let sign = 1;
      if (token.startsWith('+') || token.startsWith('-')) {
        sign = token.startsWith('-') ? -1 : 1;
        token = token.slice(1).trim();
      }
      let m: RegExpMatchArray | null;
      if ((m = token.match(/^(\d+)\s*×\s*([A-E])$/))) {
        coeffs[m[2]] = (coeffs[m[2]] ?? 0) + sign * Number(m[1]);
      } else if ((m = token.match(/^([A-E])\s*÷\s*(\d+)$/))) {
        const d = Number(m[2]);
        if (d === 0) throw new Error(`division by zero in "${display}"`);
        coeffs[m[1]] = (coeffs[m[1]] ?? 0) + sign / d;
      } else if ((m = token.match(/^(\d+)$/))) {
        constant += sign * Number(m[1]);
      } else if ((m = token.match(/^([A-E])$/))) {
        coeffs[m[1]] = (coeffs[m[1]] ?? 0) + sign;
      } else {
        throw new Error(`illegal term "${token}" in "${display}"`);
      }
    }
    return { coeffs, constant };
  };

  const lhs = parseSide(sides[0]);
  const rhs = parseSide(sides[1]);
  const coeffs: Record<string, number> = { ...lhs.coeffs };
  for (const [v, c] of Object.entries(rhs.coeffs)) {
    coeffs[v] = (coeffs[v] ?? 0) - c;
  }
  for (const v of Object.keys(coeffs)) {
    if (coeffs[v] === 0) delete coeffs[v];
  }
  return { coeffs, constant: rhs.constant - lhs.constant };
}

/** All integer literals rendered in the display must be 1..99 (§5.2). */
function displayedConstantsInRange(display: string): boolean {
  const ints = display.match(/\d+/g) ?? [];
  return ints.every((s) => {
    const n = Number(s);
    return n >= 1 && n <= 99;
  });
}

export function validateEquationQuestion(q: EquationQuestion): ValidationResult {
  const reasons: string[] = [];

  if (q.variables.length < 2 || q.variables.length > 4) {
    reasons.push(`variable count ${q.variables.length} outside 2..4`);
  }
  if (new Set(q.variables).size !== q.variables.length) {
    reasons.push('duplicate variable names');
  }
  for (const v of q.variables) {
    const val = q.solution[v];
    if (!Number.isInteger(val) || val < 1 || val > 20) {
      reasons.push(`solution ${v}=${val} not an integer in 1..20`);
    }
  }

  const parsed: LinearEq[] = [];
  for (const display of q.equationsDisplay) {
    try {
      const eq = parseEquation(display);
      for (const v of Object.keys(eq.coeffs)) {
        if (!q.variables.includes(v)) reasons.push(`unknown variable ${v} in "${display}"`);
      }
      if (!displayedConstantsInRange(display)) {
        reasons.push(`displayed constant outside 1..99 in "${display}"`);
      }
      parsed.push(eq);
    } catch (e) {
      reasons.push((e as Error).message);
    }
  }

  if (reasons.length === 0) {
    const usedVars = new Set(parsed.flatMap((e) => Object.keys(e.coeffs)));
    for (const v of q.variables) {
      if (!usedVars.has(v)) reasons.push(`variable ${v} appears in no equation`);
    }
  }

  if (reasons.length === 0) {
    const res = countSolutions(parsed, q.variables, 20, 2);
    if (res.count === 0) reasons.push('system has no solution in [1..20]^n');
    else if (res.count > 1) reasons.push('system has more than one solution in [1..20]^n');
    else {
      const found = res.solutions[0];
      for (const v of q.variables) {
        if (found[v] !== q.solution[v]) {
          reasons.push(`stated solution ${v}=${q.solution[v]} but system forces ${v}=${found[v]}`);
        }
      }
    }
  }

  if (q.askMode === 'choice') {
    const t = q.target;
    if (!t) {
      reasons.push('choice mode requires a target');
    } else {
      if (!q.variables.includes(t.variable)) reasons.push(`target ${t.variable} not a variable`);
      if (t.options.length !== 5) reasons.push(`expected 5 options, got ${t.options.length}`);
      if (new Set(t.options).size !== t.options.length) reasons.push('duplicate options');
      if (t.options.some((o) => !Number.isInteger(o) || o < 1 || o > 20)) {
        reasons.push('option outside 1..20');
      }
      if (t.options[t.correct] !== q.solution[t.variable]) {
        reasons.push('correct index does not point at the true value');
      }
    }
  }

  if (q.explanationSteps.length === 0) reasons.push('missing explanation steps');

  return { ok: reasons.length === 0, reasons };
}
