import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { sessionStore, useSession } from '../../state/sessionStore';
import { useSettings } from '../../state/settingsStore';
import { isAnswerCorrect } from '../../state/scoring';
import type { FigureAnswer, LatinLetter, Question } from '../../engine/types';
import TimerDisplay from '../components/TimerDisplay';
import QuestionPalette from '../components/QuestionPalette';
import ConfirmDialog from '../components/ConfirmDialog';
import FigureQuestionView from '../questions/FigureQuestionView';
import EquationQuestionView from '../questions/EquationQuestionView';
import LatinQuestionView from '../questions/LatinQuestionView';
import { formatMs } from '../format';

const SUBTEST_NAMES = {
  figures: 'Figure Sequences',
  equations: 'Mathematical Equations',
  latin: 'Latin Squares',
} as const;

function QuestionBody({
  question,
  reveal,
  practice,
  onCommit,
}: {
  question: Question;
  reveal: boolean;
  practice: boolean;
  onCommit: (value: unknown) => void;
}) {
  const answer = useSession((s) => s.session?.answers[question.id]);
  const editable = !reveal;
  switch (question.type) {
    case 'figures':
      return (
        <FigureQuestionView
          question={question}
          answer={answer as FigureAnswer | undefined}
          onAnswer={editable ? onCommit : undefined}
          reveal={reveal}
        />
      );
    case 'equations':
      return (
        <EquationQuestionView
          question={question}
          answer={answer}
          onAnswer={editable ? onCommit : undefined}
          reveal={reveal}
        />
      );
    case 'latin':
      return (
        <LatinQuestionView
          question={question}
          answer={answer as LatinLetter | undefined}
          onAnswer={editable ? onCommit : undefined}
          reveal={reveal}
          hoverAid={practice}
        />
      );
  }
}

export default function Runner() {
  const navigate = useNavigate();
  const session = useSession((s) => s.session);
  const progress = useSession((s) => s.progress);
  const currentIndex = useSession((s) => s.currentIndex);
  const settings = useSettings();

  const [revealed, setRevealed] = useState<Set<string>>(new Set());
  const [submitAsk, setSubmitAsk] = useState(false);
  const [bannerDismissed, setBannerDismissed] = useState(false);
  const startRequested = useRef(false);

  const state = session?.state;
  const isExam = session?.mode === 'exam';
  const practice = session?.mode === 'practice';
  const instantFeedback = practice && settings.instantFeedback;
  const freeNav = practice || settings.examNavFree;

  // R3 mount guard: the runner never mounts without a complete, validated set
  useEffect(() => {
    if (!session || state === 'setup') navigate('/', { replace: true });
  }, [session, state, navigate]);

  // finished (submit or time-up) → results
  useEffect(() => {
    if (state === 'finished' && session) navigate(`/results/${session.id}`, { replace: true });
  }, [state, session, navigate]);

  const question = session?.questions[currentIndex];
  const answers = session?.answers ?? {};
  const isLast = session ? currentIndex === session.questions.length - 1 : false;

  const answeredCount = useMemo(
    () => (session ? session.questions.filter((q) => answers[q.id] !== undefined).length : 0),
    [session, answers],
  );

  const answerComplete = useCallback(
    (q: Question, value: unknown): boolean => {
      if (q.type === 'figures') {
        const a = value as FigureAnswer;
        return a?.image1 !== undefined && a?.image2 !== undefined;
      }
      if (q.type === 'equations' && q.askMode === 'entry') {
        const a = (value ?? {}) as Record<string, number>;
        return q.variables.every((v) => a[v] !== undefined);
      }
      return value !== undefined;
    },
    [],
  );

  const commit = useCallback(
    (value: unknown) => {
      if (!question) return;
      sessionStore.getState().answer(question.id, value);
      if (instantFeedback && answerComplete(question, value)) {
        setRevealed((prev) => new Set(prev).add(question.id));
      }
    },
    [question, instantFeedback, answerComplete],
  );

  const goNext = useCallback(() => {
    if (!session) return;
    if (!isLast) sessionStore.getState().goTo(currentIndex + 1);
  }, [session, isLast, currentIndex]);

  const goPrev = useCallback(() => {
    if (freeNav && currentIndex > 0) sessionStore.getState().goTo(currentIndex - 1);
  }, [freeNav, currentIndex]);

  const trySubmit = useCallback(() => {
    if (!session) return;
    if (answeredCount < session.questions.length) setSubmitAsk(true);
    else void sessionStore.getState().submit();
  }, [session, answeredCount]);

  // keyboard operation (§8): 1–3 figures (two-stage), 1–5 equations, A–E latin
  useEffect(() => {
    if (state !== 'running' || !question) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement) return;
      const reveal = revealed.has(question.id);
      if (e.key === 'Enter' || e.key === 'ArrowRight') {
        if (isLast) trySubmit();
        else goNext();
        return;
      }
      if (e.key === 'ArrowLeft') {
        goPrev();
        return;
      }
      if (practice && e.key.toLowerCase() === 'f') {
        sessionStore.getState().flag(question.id);
        return;
      }
      if (reveal) return;
      if (question.type === 'figures' && ['1', '2', '3'].includes(e.key)) {
        const idx = (Number(e.key) - 1) as 0 | 1 | 2;
        const a = (answers[question.id] ?? {}) as FigureAnswer;
        commit(a.image1 === undefined ? { ...a, image1: idx } : { ...a, image2: idx });
      } else if (
        question.type === 'equations' &&
        question.askMode === 'choice' &&
        ['1', '2', '3', '4', '5'].includes(e.key)
      ) {
        const opt = question.target!.options[Number(e.key) - 1];
        if (opt !== undefined) commit(opt);
      } else if (question.type === 'latin' && /^[a-eA-E]$/.test(e.key)) {
        commit(e.key.toUpperCase() as LatinLetter);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [state, question, answers, commit, goNext, goPrev, trySubmit, isLast, practice, revealed]);

  if (!session) return null;

  /* ---------------------------- GENERATING ---------------------------- */
  if (state === 'generating') {
    return (
      <section className="mx-auto max-w-lg py-10 text-center">
        <h1 className="text-xl font-semibold">Generating your set…</h1>
        <p className="mt-2 text-zinc-500 dark:text-zinc-400" aria-live="polite">
          {progress ? `${progress.done} / ${progress.total} validated` : 'Preparing…'}
        </p>
        <div className="mx-auto mt-4 h-2 w-full max-w-xs overflow-hidden rounded-full bg-zinc-200 dark:bg-zinc-800">
          <div
            className="h-full bg-accent transition-all dark:bg-accent-dark"
            style={{ width: progress ? `${(progress.done / progress.total) * 100}%` : '0%' }}
          />
        </div>
        {/* timer visibly NOT counting (R2) */}
        <p className="timer-digits mt-6 text-3xl font-semibold text-zinc-300 dark:text-zinc-600">
          {formatMs(session.durationMs)}
        </p>
        <div className="mt-8 space-y-2" aria-hidden="true">
          {[0, 1, 2].map((i) => (
            <div key={i} className="mx-auto h-10 max-w-sm animate-pulse rounded-lg bg-zinc-100 motion-reduce:animate-none dark:bg-zinc-800" />
          ))}
        </div>
        <button
          type="button"
          onClick={() => {
            sessionStore.getState().cancelGeneration();
            navigate('/');
          }}
          className="mt-8 rounded-lg px-4 py-2 text-sm font-medium text-zinc-600 hover:bg-zinc-100 dark:text-zinc-300 dark:hover:bg-zinc-800"
        >
          Cancel
        </button>
      </section>
    );
  }

  /* ------------------------------- READY ------------------------------ */
  if (state === 'ready') {
    return (
      <section className="mx-auto max-w-lg py-10">
        <div className="rounded-card border border-zinc-200 bg-surface p-6 shadow-card dark:border-zinc-800 dark:bg-surface-dark-alt">
          <h1 className="text-2xl font-bold">{SUBTEST_NAMES[session.subtest as keyof typeof SUBTEST_NAMES] ?? session.subtest}</h1>
          <dl className="mt-4 grid grid-cols-2 gap-3 text-sm">
            <div>
              <dt className="text-zinc-500 dark:text-zinc-400">Mode</dt>
              <dd className="font-semibold capitalize">{session.mode === 'exam' ? 'Exam simulation' : 'Practice'}</dd>
            </div>
            <div>
              <dt className="text-zinc-500 dark:text-zinc-400">Difficulty</dt>
              <dd className="font-semibold capitalize">{session.difficulty}</dd>
            </div>
            <div>
              <dt className="text-zinc-500 dark:text-zinc-400">Questions</dt>
              <dd className="font-semibold">{session.questionCount}</dd>
            </div>
            <div>
              <dt className="text-zinc-500 dark:text-zinc-400">Time limit</dt>
              <dd className="timer-digits font-semibold">{formatMs(session.durationMs)}</dd>
            </div>
          </dl>
          <ul className="mt-4 space-y-1 border-t border-zinc-100 pt-4 text-sm text-zinc-600 dark:border-zinc-800 dark:text-zinc-300">
            <li>Answers are single-choice. Guessing is allowed — blanks count as wrong.</li>
            <li>Solve mentally: no note-taking, as in the real exam.</li>
            <li>The clock starts when you press Start — not before.</li>
          </ul>
          <button
            type="button"
            onClick={() => {
              if (startRequested.current) return;
              startRequested.current = true;
              // R2: arm only after the first question has painted
              requestAnimationFrame(() => sessionStore.getState().start());
            }}
            className="mt-6 w-full rounded-xl bg-accent px-6 py-3.5 text-lg font-semibold text-white transition-colors hover:bg-accent-hover"
          >
            Start Test
          </button>
        </div>
      </section>
    );
  }

  if (state !== 'running' || !question) return null;

  /* ------------------------------ RUNNING ----------------------------- */
  const reveal = revealed.has(question.id);
  const currentAnswer = answers[question.id];
  const isCorrect = reveal && isAnswerCorrect(question, currentAnswer);

  return (
    <section className="mx-auto max-w-4xl">
      <header className="mb-4 flex items-center gap-3">
        <h1 className="text-sm font-semibold sm:text-base">
          {SUBTEST_NAMES[question.type]}
        </h1>
        <span className="text-sm text-zinc-500 dark:text-zinc-400">
          {currentIndex + 1} / {session.questions.length}
        </span>
        <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-zinc-200 dark:bg-zinc-800">
          <div
            className="h-full bg-accent transition-all dark:bg-accent-dark"
            style={{ width: `${(answeredCount / session.questions.length) * 100}%` }}
          />
        </div>
        <TimerDisplay />
      </header>

      {isExam && !bannerDismissed && (
        <div className="mb-4 flex items-center justify-between rounded-lg bg-accent-tint px-4 py-2 text-sm text-accent dark:bg-accent/15 dark:text-accent-dark">
          <span>No note-taking — solve mentally, as in the real exam.</span>
          <button
            type="button"
            onClick={() => setBannerDismissed(true)}
            className="ml-3 font-semibold hover:underline"
            aria-label="Dismiss reminder"
          >
            ✕
          </button>
        </div>
      )}

      <div className="rounded-card border border-zinc-200 bg-surface p-4 shadow-card sm:p-6 dark:border-zinc-800 dark:bg-surface-dark-alt">
        <QuestionBody question={question} reveal={reveal} practice={!!practice} onCommit={commit} />

        {reveal && (
          <div
            className={`mt-6 rounded-lg border-l-4 p-4 ${
              isCorrect ? 'border-success bg-success/5' : 'border-error bg-error/5'
            }`}
            role="status"
          >
            <p className={`font-semibold ${isCorrect ? 'text-success' : 'text-error'}`}>
              {isCorrect ? 'Correct' : 'Not quite'}
            </p>
            <details className="mt-2" open={!isCorrect}>
              <summary className="cursor-pointer text-sm font-medium">Explanation</summary>
              <ul className="mt-2 space-y-1 text-sm text-zinc-700 dark:text-zinc-300">
                {(question.type === 'figures'
                  ? question.ruleDescriptions
                  : question.explanationSteps
                ).map((step, i) => (
                  <li key={i}>{step}</li>
                ))}
              </ul>
            </details>
          </div>
        )}
      </div>

      <footer className="mt-4 flex flex-wrap items-center gap-3">
        {freeNav && (
          <button
            type="button"
            onClick={goPrev}
            disabled={currentIndex === 0}
            className="rounded-lg border border-zinc-200 px-4 py-2 text-sm font-medium disabled:opacity-40 dark:border-zinc-700"
          >
            Previous
          </button>
        )}
        {practice && (
          <button
            type="button"
            onClick={() => sessionStore.getState().flag(question.id)}
            className={`rounded-lg border px-4 py-2 text-sm font-medium ${
              session.flagged.includes(question.id)
                ? 'border-warning bg-warning/10 text-warning'
                : 'border-zinc-200 dark:border-zinc-700'
            }`}
          >
            {session.flagged.includes(question.id) ? 'Flagged' : 'Flag'}
          </button>
        )}
        {practice && (
          <div className="order-last w-full sm:order-none sm:w-auto sm:flex-1">
            <QuestionPalette
              total={session.questions.length}
              currentIndex={currentIndex}
              answeredIds={new Set(Object.keys(answers))}
              flaggedIds={new Set(session.flagged)}
              questionIds={session.questions.map((q) => q.id)}
              onJump={(i) => sessionStore.getState().goTo(i)}
            />
          </div>
        )}
        {!practice && <div className="flex-1" />}
        {isExam && !isLast && (
          <button
            type="button"
            onClick={() => setSubmitAsk(true)}
            className="rounded-lg px-4 py-2 text-sm font-medium text-zinc-500 hover:bg-zinc-100 dark:text-zinc-400 dark:hover:bg-zinc-800"
          >
            Submit early
          </button>
        )}
        {isLast ? (
          <button
            type="button"
            onClick={trySubmit}
            className="ml-auto rounded-lg bg-accent px-6 py-2.5 font-semibold text-white hover:bg-accent-hover sm:ml-0"
          >
            Submit
          </button>
        ) : (
          <button
            type="button"
            onClick={goNext}
            className="ml-auto rounded-lg bg-accent px-6 py-2.5 font-semibold text-white hover:bg-accent-hover sm:ml-0"
          >
            Next →
          </button>
        )}
      </footer>

      <ConfirmDialog
        open={submitAsk}
        title="Submit this test?"
        body={
          answeredCount < session.questions.length
            ? `${session.questions.length - answeredCount} question${
                session.questions.length - answeredCount === 1 ? ' is' : 's are'
              } unanswered and will count as wrong. Guessing costs nothing — no negative marking.`
            : 'All questions answered. Ready to see your result?'
        }
        confirmLabel={answeredCount < session.questions.length ? 'Submit anyway' : 'Submit'}
        onConfirm={() => {
          setSubmitAsk(false);
          void sessionStore.getState().submit();
        }}
        onCancel={() => setSubmitAsk(false)}
      />
    </section>
  );
}
