import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { sessionStore, useSession } from '../../state/sessionStore';
import { getStorage } from '../../storage/db';
import { isAnswerCorrect } from '../../state/scoring';
import type { FigureAnswer, GamAnswer, LatinLetter, Question, Session } from '../../engine/types';
import { explainLatinQuestion } from '../../engine/latinSquares/explain';
import FigureQuestionView from '../questions/FigureQuestionView';
import EquationQuestionView from '../questions/EquationQuestionView';
import LatinQuestionView from '../questions/LatinQuestionView';
import GamQuestionView from '../questions/GamQuestionView';
import SequencePlayer from '../components/SequencePlayer';
import ExplainWithAi from '../components/ExplainWithAi';
import { Skeleton, SkeletonCard } from '../components/Skeleton';
import { formatMs } from '../format';

function ReviewQuestion({ question, session, index }: { question: Question; session: Session; index: number }) {
  const answer = session.answers[question.id];
  const correct = isAnswerCorrect(question, answer);
  const timeMs = session.answerTimesMs[question.id];
  // latin explanations are re-rendered in the question's display alphabet
  const latinExplain = question.type === 'latin' ? explainLatinQuestion(question) : null;

  return (
    <article className="rounded-card border border-zinc-200 bg-surface p-4 shadow-card sm:p-6 dark:border-zinc-800 dark:bg-surface-dark-alt">
      <header className="mb-4 flex flex-wrap items-center gap-3">
        <span className="text-sm font-semibold text-zinc-500 dark:text-zinc-400">Question {index + 1}</span>
        <span
          className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${
            answer === undefined
              ? 'bg-zinc-100 text-zinc-500 dark:bg-zinc-800 dark:text-zinc-400'
              : correct
                ? 'bg-success/10 text-success'
                : 'bg-error/10 text-error'
          }`}
        >
          {answer === undefined ? 'Unanswered' : correct ? 'Correct' : 'Wrong'}
        </span>
        {timeMs !== undefined && (
          <span className="text-xs text-zinc-500 dark:text-zinc-400">took {formatMs(timeMs)}</span>
        )}
        <span className="ml-auto text-xs capitalize text-zinc-500 dark:text-zinc-400">{question.difficulty}</span>
      </header>

      {question.type === 'figures' && (
        <FigureQuestionView question={question} answer={answer as FigureAnswer | undefined} reveal />
      )}
      {question.type === 'equations' && (
        <EquationQuestionView question={question} answer={answer} reveal />
      )}
      {question.type === 'latin' && (
        <LatinQuestionView question={question} answer={answer as LatinLetter | undefined} reveal />
      )}
      {question.type === 'gam' && (
        <GamQuestionView
          question={question}
          passage={session.gamPassages?.find((p) => p.id === question.passageId)}
          answer={answer as GamAnswer | undefined}
          reveal
        />
      )}

      <div className="mt-5 border-t border-zinc-100 pt-4 dark:border-zinc-800">
        <h2 className="text-sm font-semibold">Explanation</h2>
        {latinExplain?.summary && (
          <p className="mt-2 text-sm font-medium text-zinc-600 dark:text-zinc-400">
            {latinExplain.summary}
          </p>
        )}
        {latinExplain ? (
          <ol className="mt-2 list-inside list-decimal space-y-1 text-sm text-zinc-700 dark:text-zinc-300">
            {latinExplain.steps.map((step, i) => (
              <li key={i}>{step}</li>
            ))}
          </ol>
        ) : (
          <ul className="mt-2 space-y-1 text-sm text-zinc-700 dark:text-zinc-300">
            {(question.type === 'figures'
              ? question.ruleDescriptions
              : question.type === 'gam'
                ? [question.explanation]
                : question.explanationSteps
            ).map((step, i) => (
              <li key={i}>{step}</li>
            ))}
          </ul>
        )}
        {question.type === 'figures' && (
          <div className="mt-4 rounded-lg bg-zinc-50 p-4 dark:bg-zinc-900">
            <SequencePlayer
              frames={[
                ...question.givenFrames,
                question.image1.options[question.image1.correct],
                question.image2.options[question.image2.correct],
              ]}
            />
          </div>
        )}
        <ExplainWithAi question={question} userAnswer={answer} />
      </div>
    </article>
  );
}

type ReviewFilter = 'all' | 'wrong' | 'flagged' | 'unanswered';

export default function Review() {
  const { sessionId } = useParams();
  const active = useSession((s) => s.session);
  const [session, setSession] = useState<Session | null>(null);
  const [loaded, setLoaded] = useState(false);
  const [filter, setFilter] = useState<ReviewFilter>('all');

  useEffect(() => {
    if (active && active.id === sessionId) {
      setSession(active);
      setLoaded(true);
      if (active.state === 'finished') sessionStore.getState().markReviewed();
    } else if (sessionId) {
      setLoaded(false);
      void getStorage()
        .then((s) => s.getSession(sessionId))
        .then((s) => {
          setSession(s ?? null);
          setLoaded(true);
        });
    } else {
      setLoaded(true);
    }
  }, [active, sessionId]);

  if (!session || session.questions.length === 0) {
    if (!loaded) {
      return (
        <section className="mx-auto max-w-4xl" aria-busy="true">
          <Skeleton className="h-8 w-32" />
          <div className="mt-4 space-y-6">
            <SkeletonCard lines={4} />
            <SkeletonCard lines={4} />
          </div>
        </section>
      );
    }
    return (
      <section className="py-10 text-center text-zinc-500 dark:text-zinc-400">
        <p>No session to review here.</p>
        <Link to="/history" className="mt-3 inline-block font-semibold text-accent hover:underline dark:text-accent-bright">
          Browse your history
        </Link>
      </section>
    );
  }

  const matches = (q: Session['questions'][number]): boolean => {
    const answer = session.answers[q.id];
    switch (filter) {
      case 'wrong':
        return answer !== undefined && !isAnswerCorrect(q, answer);
      case 'flagged':
        return session.flagged.includes(q.id);
      case 'unanswered':
        return answer === undefined;
      default:
        return true;
    }
  };
  const visible = session.questions
    .map((q, i) => ({ q, i }))
    .filter(({ q }) => matches(q));

  const counts: Record<ReviewFilter, number> = {
    all: session.questions.length,
    wrong: session.questions.filter(
      (q) => session.answers[q.id] !== undefined && !isAnswerCorrect(q, session.answers[q.id]),
    ).length,
    flagged: session.flagged.length,
    unanswered: session.questions.filter((q) => session.answers[q.id] === undefined).length,
  };

  return (
    <section className="mx-auto max-w-4xl">
      <div className="mb-3 flex items-center justify-between">
        <h1 className="text-2xl font-bold">Review</h1>
        <Link
          to={`/results/${session.id}`}
          className="text-sm font-semibold text-accent hover:underline dark:text-accent-bright"
        >
          Back to results
        </Link>
      </div>

      <div className="mb-4 flex flex-wrap items-center gap-1.5" role="group" aria-label="Filter questions">
        {(['all', 'wrong', 'flagged', 'unanswered'] as ReviewFilter[]).map((f) => (
          <button
            key={f}
            type="button"
            onClick={() => setFilter(f)}
            aria-pressed={filter === f}
            className={`min-h-11 touch-manipulation rounded-lg px-3 py-1.5 text-sm font-medium capitalize ${
              filter === f
                ? 'bg-accent text-white dark:bg-accent-dark'
                : 'bg-zinc-100 text-zinc-600 hover:bg-zinc-200 dark:bg-zinc-800 dark:text-zinc-300'
            }`}
          >
            {f} ({counts[f]})
          </button>
        ))}
        <span className="ml-auto hidden gap-1 sm:flex">
          {visible.map(({ i }) => (
            <a
              key={i}
              href={`#review-q${i + 1}`}
              className="flex h-6 w-6 items-center justify-center rounded-full bg-zinc-100 text-xs font-semibold text-zinc-500 hover:bg-accent-tint hover:text-accent dark:bg-zinc-800 dark:text-zinc-400"
            >
              {i + 1}
            </a>
          ))}
        </span>
      </div>

      {visible.length === 0 ? (
        <p className="py-10 text-center text-sm text-zinc-500 dark:text-zinc-400">
          No {filter} questions in this session.
        </p>
      ) : (
        <div className="space-y-6">
          {visible.map(({ q, i }) => (
            <div key={q.id} id={`review-q${i + 1}`}>
              <ReviewQuestion question={q} session={session} index={i} />
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
