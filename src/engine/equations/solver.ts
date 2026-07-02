/** Linear equation over the question's variables: sum(coeffs[v] * v) = constant.
 *  Coefficients may be fractional (e.g. "B ÷ 2 = A" → 0.5·B − A = 0). */
export interface LinearEq {
  coeffs: Record<string, number>;
  constant: number;
}

const EPS = 1e-6;

export interface SolveResult {
  count: number;
  solutions: Record<string, number>[];
}

/**
 * Counts integer solutions of a linear system inside [1..domainMax]^n.
 * Depth-first search with constraint propagation: whenever an equation has a
 * single unbound variable its value is deduced (and pruned if non-integer or
 * out of domain), so the designed definitional chains solve in near-linear
 * time instead of 20^n. Stops early once `limit` solutions are found.
 */
export function countSolutions(
  eqs: LinearEq[],
  vars: string[],
  domainMax = 20,
  limit = 2,
): SolveResult {
  const solutions: Record<string, number>[] = [];
  const assignment: Record<string, number> = {};
  const assigned = new Set<string>();

  function propagate(): { derived: string[]; ok: boolean } {
    const derived: string[] = [];
    let changed = true;
    while (changed) {
      changed = false;
      for (const eq of eqs) {
        let sum = 0;
        let unbound: string | null = null;
        let unboundCoef = 0;
        let nUnbound = 0;
        for (const [v, c] of Object.entries(eq.coeffs)) {
          if (c === 0) continue;
          if (assigned.has(v)) {
            sum += c * assignment[v];
          } else {
            nUnbound++;
            unbound = v;
            unboundCoef = c;
          }
        }
        if (nUnbound === 0) {
          if (Math.abs(sum - eq.constant) > EPS) return { derived, ok: false };
        } else if (nUnbound === 1) {
          const raw = (eq.constant - sum) / unboundCoef;
          const val = Math.round(raw);
          if (Math.abs(raw - val) > EPS || val < 1 || val > domainMax) {
            return { derived, ok: false };
          }
          assignment[unbound!] = val;
          assigned.add(unbound!);
          derived.push(unbound!);
          changed = true;
        }
      }
    }
    return { derived, ok: true };
  }

  function undo(derived: string[]) {
    for (const v of derived) {
      assigned.delete(v);
      delete assignment[v];
    }
  }

  /** returns true when the solution limit was reached (abort search) */
  function search(): boolean {
    const { derived, ok } = propagate();
    if (ok) {
      const next = vars.find((v) => !assigned.has(v));
      if (!next) {
        solutions.push({ ...assignment });
        if (solutions.length >= limit) {
          undo(derived);
          return true;
        }
      } else {
        for (let val = 1; val <= domainMax; val++) {
          assignment[next] = val;
          assigned.add(next);
          const stop = search();
          assigned.delete(next);
          delete assignment[next];
          if (stop) {
            undo(derived);
            return true;
          }
        }
      }
    }
    undo(derived);
    return false;
  }

  search();
  return { count: solutions.length, solutions };
}
