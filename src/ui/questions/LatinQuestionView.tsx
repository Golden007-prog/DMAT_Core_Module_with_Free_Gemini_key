import type { LatinLetter, LatinQuestion } from '../../engine/types';
import { glyphFor } from '../../engine/latinSquares/alphabets';
import LatinGrid from '../components/LatinGrid';

const LETTERS: LatinLetter[] = ['A', 'B', 'C', 'D', 'E'];

/** §3.3: find the symbol behind the red "?" — answer row beneath the grid.
 *  Renders in the question's display alphabet (letters/digits/greek/shapes). */
export default function LatinQuestionView({
  question,
  answer,
  onAnswer,
  reveal = false,
  hoverAid = false,
}: {
  question: LatinQuestion;
  answer: LatinLetter | undefined;
  onAnswer?: (value: LatinLetter) => void;
  reveal?: boolean;
  hoverAid?: boolean;
}) {
  return (
    <div className="space-y-6">
      <LatinGrid
        grid={question.grid}
        question={question.question}
        hoverAid={hoverAid && !!onAnswer}
        resolvedLetter={reveal ? question.solutionLetter : undefined}
        alphabet={question.alphabet}
      />
      <div
        className="flex justify-center gap-2"
        role="radiogroup"
        aria-label="Choose the symbol for the question mark"
      >
        {LETTERS.map((letter) => {
          const glyph = glyphFor(question.alphabet, letter);
          const isSelected = answer === letter;
          const isCorrect = letter === question.solutionLetter;
          const style = reveal
            ? isCorrect
              ? 'border-success bg-success/10 text-success'
              : isSelected
                ? 'border-error bg-error/10 text-error'
                : 'border-zinc-200 text-zinc-400 dark:border-zinc-700'
            : isSelected
              ? 'border-accent bg-accent text-white dark:border-accent-dark dark:bg-accent-dark'
              : 'border-zinc-200 hover:border-accent hover:text-accent dark:border-zinc-700 dark:hover:border-accent-dark';
          return (
            <button
              key={letter}
              type="button"
              role="radio"
              aria-checked={isSelected}
              aria-label={`Answer ${glyph}`}
              disabled={!onAnswer}
              onClick={() => onAnswer?.(letter)}
              className={`h-12 w-12 touch-manipulation rounded-lg border-2 text-xl font-bold transition-colors sm:h-14 sm:w-14 ${style}`}
            >
              {glyph}
            </button>
          );
        })}
      </div>
    </div>
  );
}
