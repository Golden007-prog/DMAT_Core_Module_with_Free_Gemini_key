import type { Difficulty } from '../types';

/** §3.3 difficulty calibration: pre-filled clue count and minimum inference
 *  chain length (forced steps until the "?" resolves, target fill included). */
export interface LatinBand {
  minGivens: number;
  maxGivens: number;
  minDepth: number;
  maxDepth: number;
}

export const LATIN_BANDS: Record<Difficulty, LatinBand> = {
  easy: { minGivens: 14, maxGivens: 17, minDepth: 1, maxDepth: 1 },
  medium: { minGivens: 12, maxGivens: 14, minDepth: 2, maxDepth: 3 },
  hard: { minGivens: 9, maxGivens: 12, minDepth: 4, maxDepth: 10 },
};
