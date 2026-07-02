import type { Prng } from '../prng';

/**
 * 5 numeric options for the target variable: the correct value plus 4
 * distractors built from typical solver errors (§3.2): another variable's
 * value, off-by-one/two, doubled/halved — padded from 1..20 when needed.
 */
export function buildChoiceOptions(
  targetVariable: string,
  solution: Record<string, number>,
  prng: Prng,
): { options: number[]; correct: number } {
  const correctValue = solution[targetVariable];
  const inRange = (n: number) => Number.isInteger(n) && n >= 1 && n <= 20;

  const candidates: number[] = [];
  for (const [v, val] of Object.entries(solution)) {
    if (v !== targetVariable) candidates.push(val); // swapped variable's value
  }
  candidates.push(
    correctValue + 1,
    correctValue - 1,
    correctValue + 2,
    correctValue - 2,
    correctValue * 2,
    correctValue % 2 === 0 ? correctValue / 2 : correctValue * 2 + 1,
  );

  const chosen = new Set<number>([correctValue]);
  for (const c of prng.shuffle(candidates)) {
    if (chosen.size >= 5) break;
    if (inRange(c) && !chosen.has(c)) chosen.add(c);
  }
  // pad from 1..20 if typical-error candidates were not enough
  while (chosen.size < 5) {
    const filler = prng.int(1, 20);
    if (!chosen.has(filler)) chosen.add(filler);
  }

  const options = prng.shuffle([...chosen]);
  return { options, correct: options.indexOf(correctValue) };
}
