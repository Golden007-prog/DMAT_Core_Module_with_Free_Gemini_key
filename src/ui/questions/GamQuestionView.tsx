import { useEffect, useRef, useState } from 'react';
import type { GamAnswer, GamPassageDoc, GamQuestion } from '../../engine/types';
import { GAM_TOPIC_CHIP, GAM_TOPIC_LABELS } from '../gamLabels';
import { PassageBody, RichText } from '../components/RichText';

const OPTION_LETTERS = ['a', 'b', 'c', 'd'] as const;

/** Scroll position per passage — survives question-to-question remounts so
 *  re-reading picks up where the reader left off (resets on reload). */
const passageScroll = new Map<string, number>();
/** Passages already shown this session: first encounter opens the passage
 *  pane on mobile, later questions of the same passage open on the question. */
const passagesSeen = new Set<string>();

function PassagePane({ passage }: { passage: GamPassageDoc }) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    el.scrollTop = passageScroll.get(passage.id) ?? 0;
    const save = () => passageScroll.set(passage.id, el.scrollTop);
    el.addEventListener('scroll', save, { passive: true });
    return () => el.removeEventListener('scroll', save);
  }, [passage.id]);

  return (
    <div
      ref={ref}
      className="overflow-y-auto overscroll-contain rounded-card border border-zinc-200 bg-surface p-4 shadow-card lg:sticky lg:top-4 lg:max-h-[calc(100dvh-9rem)] dark:border-zinc-800 dark:bg-surface-dark-alt"
      aria-label={`Passage: ${passage.title}`}
    >
      <div className="mb-2 flex flex-wrap items-center gap-2">
        <span
          className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${GAM_TOPIC_CHIP[passage.topicArea]}`}
        >
          {GAM_TOPIC_LABELS[passage.topicArea]}
        </span>
        <span className="text-xs text-zinc-500 dark:text-zinc-400">
          ≈{passage.estimatedMinutes} min incl. questions
        </span>
      </div>
      <h2 className="text-lg font-bold">{passage.title}</h2>
      <div className="mt-3">
        <PassageBody markdown={passage.passageMarkdown} figures={passage.figures} />
      </div>
    </div>
  );
}

/**
 * The GAM runner view: reading passage + single-choice question.
 * Desktop (lg+): split view, passage sticky and independently scrollable.
 * Mobile: segmented "Passage | Question" toggle — a question is never below
 * the full passage text.
 */
export default function GamQuestionView({
  question,
  passage,
  answer,
  onAnswer,
  reveal = false,
}: {
  question: GamQuestion;
  passage: GamPassageDoc | undefined;
  answer: GamAnswer | undefined;
  onAnswer?: (value: GamAnswer) => void;
  reveal?: boolean;
}) {
  const firstEncounter = passage ? !passagesSeen.has(passage.id) : false;
  const [pane, setPane] = useState<'passage' | 'question'>(
    firstEncounter ? 'passage' : 'question',
  );
  const lastPassage = useRef(passage?.id);

  useEffect(() => {
    if (!passage) return;
    const wasSeen = passagesSeen.has(passage.id);
    passagesSeen.add(passage.id);
    if (lastPassage.current !== passage.id) {
      lastPassage.current = passage.id;
      setPane(wasSeen ? 'question' : 'passage');
    }
  }, [passage]);

  const options = (
    <div className="space-y-2" role="radiogroup" aria-label="Answer options">
      {question.options.map((text, i) => {
        const isSelected = answer === i;
        const isCorrect = i === question.correct;
        const style = reveal
          ? isCorrect
            ? 'border-success bg-success/10'
            : isSelected
              ? 'border-error bg-error/10'
              : 'border-zinc-200 opacity-60 dark:border-zinc-700'
          : isSelected
            ? 'border-accent bg-accent/10 dark:border-accent-dark dark:bg-accent-dark/15'
            : 'border-zinc-200 hover:border-accent/60 dark:border-zinc-700 dark:hover:border-accent-dark/60';
        return (
          <button
            key={i}
            type="button"
            role="radio"
            aria-checked={isSelected}
            disabled={!onAnswer}
            onClick={() => onAnswer?.(i as GamAnswer)}
            className={`flex w-full touch-manipulation items-start gap-3 rounded-lg border-2 px-3 py-2.5 text-left text-[15px] transition-colors sm:text-base ${style}`}
          >
            <span
              className={`mt-0.5 flex h-6 w-6 flex-none items-center justify-center rounded-full text-xs font-bold ${
                isSelected
                  ? 'bg-accent text-white dark:bg-accent-dark'
                  : 'bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-300'
              }`}
              aria-hidden="true"
            >
              {OPTION_LETTERS[i]}
            </span>
            <span className="min-w-0">
              <RichText text={text} />
            </span>
          </button>
        );
      })}
    </div>
  );

  const questionPane = (
    <div>
      <p className="text-[15px] font-medium leading-relaxed sm:text-base">
        <RichText text={question.stem} figures={passage?.figures} />
      </p>
      <div className="mt-4">{options}</div>
    </div>
  );

  return (
    <div>
      {/* mobile: segmented toggle */}
      <div
        className="mb-3 grid grid-cols-2 gap-1 rounded-lg bg-zinc-100 p-1 lg:hidden dark:bg-zinc-800"
        role="tablist"
        aria-label="Passage or question"
      >
        {(['passage', 'question'] as const).map((key) => (
          <button
            key={key}
            type="button"
            role="tab"
            aria-selected={pane === key}
            onClick={() => setPane(key)}
            className={`min-h-10 touch-manipulation rounded-md text-sm font-semibold capitalize transition-colors ${
              pane === key
                ? 'bg-surface text-accent shadow-sm dark:bg-surface-dark dark:text-accent-dark'
                : 'text-zinc-500 dark:text-zinc-400'
            }`}
          >
            {key}
          </button>
        ))}
      </div>

      <div className="lg:grid lg:grid-cols-[11fr_9fr] lg:items-start lg:gap-6">
        <div className={pane === 'passage' ? '' : 'hidden lg:block'}>
          {passage ? (
            <PassagePane passage={passage} />
          ) : (
            <p className="rounded-card border border-warning/40 bg-warning/10 p-4 text-sm text-zinc-700 dark:text-zinc-200">
              Passage unavailable for this question.
            </p>
          )}
        </div>
        <div className={pane === 'question' ? 'mt-4 lg:mt-0' : 'hidden lg:block'}>
          {questionPane}
        </div>
      </div>
    </div>
  );
}
