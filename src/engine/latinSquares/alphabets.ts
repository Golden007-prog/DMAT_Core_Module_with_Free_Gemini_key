import type { LatinLetter } from '../types';

/** Latin Squares display alphabets: the logic stays on the internal A–E
 *  symbols (validators, answers, storage unchanged — old sessions still
 *  replay); only the rendered glyphs change. The real dMAT uses letters, so
 *  that stays the exam-faithful default. */
export type LatinAlphabetId = 'letters' | 'digits' | 'greek' | 'shapes';

export interface LatinAlphabet {
  id: LatinAlphabetId;
  name: string;
  glyphs: Record<LatinLetter, string>;
}

export const LATIN_ALPHABETS: Record<LatinAlphabetId, LatinAlphabet> = {
  letters: {
    id: 'letters',
    name: 'Letters',
    glyphs: { A: 'A', B: 'B', C: 'C', D: 'D', E: 'E' },
  },
  digits: {
    id: 'digits',
    name: 'Digits',
    glyphs: { A: '1', B: '2', C: '3', D: '4', E: '5' },
  },
  greek: {
    id: 'greek',
    name: 'Greek',
    glyphs: { A: 'α', B: 'β', C: 'γ', D: 'δ', E: 'ε' },
  },
  shapes: {
    id: 'shapes',
    name: 'Shapes',
    glyphs: { A: '●', B: '▲', C: '■', D: '★', E: '✚' },
  },
};

export const ALPHABET_IDS = Object.keys(LATIN_ALPHABETS) as LatinAlphabetId[];

export type LatinAlphabetChoice = LatinAlphabetId | 'random';

export function glyphFor(alphabet: LatinAlphabetId | undefined, letter: LatinLetter): string {
  return LATIN_ALPHABETS[alphabet ?? 'letters'].glyphs[letter];
}
