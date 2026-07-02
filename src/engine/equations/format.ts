/** Official glyphs (§3.2): render × and ÷ exactly, minus as U+2212. */
export const TIMES = '×';
export const DIVIDE = '÷';
export const MINUS = '−';
export const PLUS = '+';

export interface Term {
  sign: 1 | -1;
  /** integer coefficient for `int × var`, or the bare constant when no variable */
  coef: number;
  variable?: string;
  /** divisor for `var ÷ int` terms */
  divisor?: number;
}

export function formatTerm(t: Term, isFirst: boolean): string {
  let body: string;
  if (t.variable === undefined) {
    body = String(t.coef);
  } else if (t.divisor !== undefined) {
    body = `${t.variable} ${DIVIDE} ${t.divisor}`;
  } else if (t.coef === 1) {
    body = t.variable;
  } else {
    body = `${t.coef} ${TIMES} ${t.variable}`;
  }
  if (isFirst) return t.sign === 1 ? body : `${MINUS}${body}`;
  return `${t.sign === 1 ? PLUS : MINUS} ${body}`;
}

export function formatSide(terms: Term[]): string {
  return terms.map((t, i) => formatTerm(t, i === 0)).join(' ');
}

export function formatEquation(lhs: Term[], rhs: Term[]): string {
  return `${formatSide(lhs)} = ${formatSide(rhs)}`;
}
