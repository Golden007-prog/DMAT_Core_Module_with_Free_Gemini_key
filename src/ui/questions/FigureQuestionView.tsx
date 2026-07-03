import type { FigureAnswer, FigureQuestion, Frame } from '../../engine/types';
import FigureGrid from '../components/FigureGrid';
import FrameStrip from '../components/FrameStrip';

function OptionGroup({
  label,
  options,
  selected,
  correct,
  reveal,
  onSelect,
}: {
  label: string;
  options: [Frame, Frame, Frame];
  selected: 0 | 1 | 2 | undefined;
  correct: 0 | 1 | 2;
  reveal: boolean;
  onSelect?: (i: 0 | 1 | 2) => void;
}) {
  return (
    <fieldset>
      <legend className="mb-2 text-sm font-semibold">{label}</legend>
      <div
        className="flex snap-x snap-mandatory gap-2 overflow-x-auto pb-1 sm:grid sm:snap-none sm:grid-cols-3 sm:gap-3 sm:overflow-visible sm:pb-0"
        role="radiogroup"
        aria-label={label}
      >
        {options.map((frame, i) => {
          const isSelected = selected === i;
          const isCorrect = correct === i;
          const border = reveal
            ? isCorrect
              ? 'border-success ring-2 ring-success'
              : isSelected
                ? 'border-error ring-2 ring-error'
                : 'border-zinc-200 dark:border-zinc-700'
            : isSelected
              ? 'border-accent ring-2 ring-accent dark:border-accent-dark dark:ring-accent-dark'
              : 'border-zinc-200 hover:-translate-y-px hover:shadow-card dark:border-zinc-700';
          return (
            <button
              key={i}
              type="button"
              role="radio"
              aria-checked={isSelected}
              aria-label={`${label}, matrix ${i + 1}`}
              disabled={!onSelect}
              onClick={() => onSelect?.(i as 0 | 1 | 2)}
              className={`relative min-w-[42%] shrink-0 snap-center touch-manipulation rounded-xl border-2 bg-white p-1.5 transition-all sm:min-w-0 sm:shrink ${border} ${
                onSelect ? 'cursor-pointer' : 'cursor-default'
              }`}
            >
              <FigureGrid frame={frame} />
              <span
                className={`absolute -top-2 -right-2 flex h-6 w-6 items-center justify-center rounded-full text-xs font-bold text-white ${
                  reveal && isCorrect
                    ? 'bg-success'
                    : isSelected
                      ? reveal
                        ? 'bg-error'
                        : 'bg-accent'
                      : 'hidden'
                }`}
                aria-hidden="true"
              >
                {reveal && isCorrect ? '✓' : isSelected && reveal ? '✕' : '✓'}
              </span>
              <span className="mt-1 block text-center text-xs font-medium text-zinc-500">
                Matrix {i + 1}
              </span>
            </button>
          );
        })}
      </div>
    </fieldset>
  );
}

/** §3.1: series of 4 matrices; the user picks the 5th (Image 1) and 6th
 *  (Image 2) from 3 options each. */
export default function FigureQuestionView({
  question,
  answer,
  onAnswer,
  reveal = false,
}: {
  question: FigureQuestion;
  answer: FigureAnswer | undefined;
  onAnswer?: (value: FigureAnswer) => void;
  reveal?: boolean;
}) {
  return (
    <div className="space-y-6">
      <FrameStrip frames={question.givenFrames} />
      <div className="grid gap-6 lg:grid-cols-2">
        <OptionGroup
          label="Image 1 (5th matrix)"
          options={question.image1.options}
          selected={answer?.image1}
          correct={question.image1.correct}
          reveal={reveal}
          onSelect={onAnswer ? (i) => onAnswer({ ...answer, image1: i }) : undefined}
        />
        <OptionGroup
          label="Image 2 (6th matrix)"
          options={question.image2.options}
          selected={answer?.image2}
          correct={question.image2.correct}
          reveal={reveal}
          onSelect={onAnswer ? (i) => onAnswer({ ...answer, image2: i }) : undefined}
        />
      </div>
    </div>
  );
}
