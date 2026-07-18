import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { sessionStore, useSession } from '../../state/sessionStore';
import { useSettings } from '../../state/settingsStore';
import { isAnswerCorrect } from '../../state/scoring';
import type { FigureAnswer, GamAnswer, LatinLetter, Question } from '../../engine/types';
import { explainLatinQuestion } from '../../engine/latinSquares/explain';
import TimerDisplay from '../components/TimerDisplay';
import QuestionPalette from '../components/QuestionPalette';
import ConfirmDialog from '../components/ConfirmDialog';
import FigureQuestionView from '../questions/FigureQuestionView';
import EquationQuestionView from '../questions/EquationQuestionView';
import LatinQuestionView from '../questions/LatinQuestionView';
import GamQuestionView from '../questions/GamQuestionView';
import { formatMs } from '../format';
import { fxCorrect, fxWrong, fxTimeWarning } from '../feedbackFx';

const SUBTEST_NAMES = {
  figures: 'Figure Sequences',
  equations: 'Mathematical Equations',
  latin: 'Latin Squares',
  gam: 'General Academic Module',
} as const;

const LATIN_KEYS: LatinLetter[] = ['A', 'B', 'C', 'D', 'E'];

const SCALE_CLASS = {
  compact: 'text-[0.93rem]',
  comfortable: '',
  large: 'text-[1.08rem]',
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
  const gamPassage = useSession((s) =>
    question.type === 'gam'
      ? s.session?.gamPassages?.find((p) => p.id === question.passageId)
      : undefined,
  );
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
    case 'gam':
      return (
        <GamQuestionView
          question={question}
          passage={gamPassage}
          answer={answer as GamAnswer | undefined}
          onAnswer={editable ? onCommit : undefined}
          reveal={reveal}
        />
      );
  }
}

/** Live elapsed time on the current question (updates every second). */
function QuestionElapsed({ budgetS = 75 }: { budgetS?: number }) {
  const shownAt = useSession((s) => s.questionShownAt);
  const [, force] = useState(0);
  useEffect(() => {
    const id = window.setInterval(() => force((n) => n + 1), 1000);
    return () => window.clearInterval(id);
  }, []);
  if (shownAt === null) return null;
  const s = Math.max(0, Math.round((Date.now() - shownAt) / 1000));
  return (
    <span
      className={`timer-digits hidden rounded px-1.5 text-xs sm:inline ${
        s > budgetS ? 'text-warning' : 'text-zinc-400 dark:text-zinc-500'
      }`}
      title={`Time on this question (${budgetS} s budget per task)`}
    >
      {s}s
    </span>
  );
}

function ShortcutsOverlay({
  onClose,
  isLatin,
  isGam,
}: {
  onClose: () => void;
  isLatin: boolean;
  isGam: boolean;
}) {
  const rows: Array<[string, string]> = [
    [isGam ? '1 – 4' : '1 – 3 / 1 – 5', 'Choose an answer option'],
    ...(isLatin
      ? ([['A – E or 1 – 5', 'Pick the 1st – 5th symbol']] as Array<[string, string]>)
      : []),
    ...(isGam ? ([['A – D', 'Pick option a) – d)']] as Array<[string, string]>) : []),
    ['Enter or →', 'Next question / submit'],
    ['←', 'Previous question (practice)'],
    ['F', 'Flag for review (practice)'],
    ['P', 'Pause / resume (practice)'],
    ['?', 'Show or hide this help'],
  ];
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
      role="dialog"
      aria-modal="true"
      aria-label="Keyboard shortcuts"
      onClick={onClose}
    >
      <div
        className="w-full max-w-sm rounded-card bg-surface p-5 shadow-card-lift dark:bg-surface-dark-alt"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="text-lg font-semibold">Keyboard shortcuts</h2>
        <table className="mt-3 w-full text-sm">
          <tbody>
            {rows.map(([keys, what]) => (
              <tr key={keys} className="border-b border-zinc-100 last:border-0 dark:border-zinc-800">
                <td className="py-1.5 pr-3 font-mono text-xs font-semibold whitespace-nowrap">{keys}</td>
                <td className="py-1.5 text-zinc-600 dark:text-zinc-300">{what}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <button
          type="button"
          onClick={onClose}
          className="mt-4 w-full rounded-lg bg-accent px-4 py-2 text-sm font-semibold text-white hover:bg-accent-hover"
        >
          Close
        </button>
      </div>
    </div>
  );
}

export default function Runner() {
  const navigate = useNavigate();
  const session = useSession((s) => s.session);
  const progress = useSession((s) => s.progress);
  const currentIndex = useSession((s) => s.currentIndex);
  const remainingMs = useSession((s) => s.remainingMs);
  const settings = useSettings();

  const [revealed, setRevealed] = useState<Set<string>>(new Set());
  const [submitAsk, setSubmitAsk] = useState(false);
  const [bannerDismissed, setBannerDismissed] = useState(false);
  const [paused, setPaused] = useState(false);
  const [showShortcuts, setShowShortcuts] = useState(false);
  const startRequested = useRef(false);
  const warned = useRef<{ five: boolean; one: boolean }>({ five: false, one: false });
  const autoAdvanceTimer = useRef<number | undefined>(undefined);

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

  // exam integrity: closing/refreshing the tab mid-exam triggers the native
  // browser warning; if the user leaves anyway, the unfinished exam is
  // deleted on the next load instead of resumed
  useEffect(() => {
    if (!isExam || state !== 'running') return;
    const warn = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = '';
    };
    window.addEventListener('beforeunload', warn);
    return () => window.removeEventListener('beforeunload', warn);
  }, [isExam, state]);

  // soft time warnings at 5:00 and 1:00 (sound/haptic settings apply)
  useEffect(() => {
    if (state !== 'running') return;
    if (!warned.current.five && remainingMs > 0 && remainingMs < 5 * 60_000) {
      warned.current.five = true;
      fxTimeWarning();
    }
    if (!warned.current.one && remainingMs > 0 && remainingMs < 60_000) {
      warned.current.one = true;
      fxTimeWarning();
    }
  }, [remainingMs, state]);

  const question = session?.questions[currentIndex];
  const answers = session?.answers ?? {};
  const isLast = session ? currentIndex === session.questions.length - 1 : false;

  const answeredCount = useMemo(
    () => (session ? session.questions.filter((q) => answers[q.id] !== undefined).length : 0),
    [session, answers],
  );

  const answerComplete = useCallback((q: Question, value: unknown): boolean => {
    if (q.type === 'figures') {
      const a = value as FigureAnswer;
      return a?.image1 !== undefined && a?.image2 !== undefined;
    }
    if (q.type === 'equations' && q.askMode === 'entry') {
      const a = (value ?? {}) as Record<string, number>;
      return q.variables.every((v) => a[v] !== undefined);
    }
    return value !== undefined;
  }, []);

  const goNext = useCallback(() => {
    if (!session) return;
    if (!isLast) sessionStore.getState().goTo(currentIndex + 1);
  }, [session, isLast, currentIndex]);

  const commit = useCallback(
    (value: unknown) => {
      if (!question || paused) return;
      sessionStore.getState().answer(question.id, value);
      if (instantFeedback && answerComplete(question, value)) {
        setRevealed((prev) => new Set(prev).add(question.id));
        if (isAnswerCorrect(question, value)) fxCorrect();
        else fxWrong();
        if (settings.autoAdvance && !isLast) {
          window.clearTimeout(autoAdvanceTimer.current);
          autoAdvanceTimer.current = window.setTimeout(() => goNext(), 900);
        }
      }
    },
    [question, paused, instantFeedback, answerComplete, settings.autoAdvance, isLast, goNext],
  );

  useEffect(() => () => window.clearTimeout(autoAdvanceTimer.current), []);

  const goPrev = useCallback(() => {
    if (freeNav && currentIndex > 0) sessionStore.getState().goTo(currentIndex - 1);
  }, [freeNav, currentIndex]);

  const trySubmit = useCallback(() => {
    if (!session) return;
    if (answeredCount < session.questions.length) setSubmitAsk(true);
    else void sessionStore.getState().submit();
  }, [session, answeredCount]);

  const togglePause = useCallback(() => {
    if (!practice || state !== 'running') return;
    setPaused((p) => {
      if (p) sessionStore.getState().unfreeze();
      else sessionStore.getState().freeze();
      return !p;
    });
  }, [practice, state]);

  // keyboard operation (§8): 1–3 figures (two-stage), 1–5 equations/latin, A–E latin
  useEffect(() => {
    if (state !== 'running' || !question) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement) return;
      if (e.key === '?') {
        setShowShortcuts((v) => !v);
        return;
      }
      if (practice && e.key.toLowerCase() === 'p') {
        togglePause();
        return;
      }
      if (paused || showShortcuts) return;
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
      } else if (question.type === 'latin') {
        if (/^[a-eA-E]$/.test(e.key)) commit(e.key.toUpperCase() as LatinLetter);
        else if (/^[1-5]$/.test(e.key)) commit(LATIN_KEYS[Number(e.key) - 1]);
      } else if (question.type === 'gam') {
        // a–d or 1–4 pick an option ('f' stays the flag shortcut above)
        if (/^[a-dA-D]$/.test(e.key)) {
          commit((e.key.toLowerCase().charCodeAt(0) - 97) as GamAnswer);
        } else if (/^[1-4]$/.test(e.key)) {
          commit((Number(e.key) - 1) as GamAnswer);
        }
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [state, question, answers, commit, goNext, goPrev, trySubmit, isLast, practice, revealed, paused, showShortcuts, togglePause]);

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
      <section className="mx-auto max-w-lg py-6 sm:py-10">
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
  // latin explanations are re-rendered in the question's display alphabet
  const latinExplain = question.type === 'latin' ? explainLatinQuestion(question) : null;

  return (
    <section
      className={`mx-auto pb-24 sm:pb-0 ${question.type === 'gam' ? 'max-w-6xl' : 'max-w-4xl'}`}
    >
      <header className="mb-4 flex items-center gap-2 sm:gap-3">
        <h1 className="hidden text-sm font-semibold sm:block sm:text-base">
          {SUBTEST_NAMES[question.type]}
        </h1>
        <span className="text-sm text-zinc-500 dark:text-zinc-400">
          {currentIndex + 1} / {session.questions.length}
        </span>
        <QuestionElapsed budgetS={question.type === 'gam' ? 160 : 75} />
        {!settings.focusMode && (
          <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-zinc-200 dark:bg-zinc-800">
            <div
              className="h-full bg-accent transition-all dark:bg-accent-dark"
              style={{ width: `${(answeredCount / session.questions.length) * 100}%` }}
            />
          </div>
        )}
        {settings.focusMode && <div className="flex-1" />}
        {practice && (
          <button
            type="button"
            onClick={togglePause}
            className="rounded-lg p-2 text-zinc-400 hover:bg-zinc-100 hover:text-zinc-600 dark:hover:bg-zinc-800"
            aria-label={paused ? 'Resume' : 'Pause'}
            title={paused ? 'Resume (P)' : 'Pause (P) — practice only'}
          >
            {paused ? (
              <svg viewBox="0 0 24 24" className="h-4 w-4" fill="currentColor" aria-hidden="true">
                <path d="M8 5v14l11-7z" />
              </svg>
            ) : (
              <svg viewBox="0 0 24 24" className="h-4 w-4" fill="currentColor" aria-hidden="true">
                <path d="M6 5h4v14H6zM14 5h4v14h-4z" />
              </svg>
            )}
          </button>
        )}
        <button
          type="button"
          onClick={() => settings.set('focusMode', !settings.focusMode)}
          className={`hidden rounded-lg p-2 sm:block ${
            settings.focusMode
              ? 'bg-accent-tint text-accent dark:bg-accent/20 dark:text-accent-dark'
              : 'text-zinc-400 hover:bg-zinc-100 hover:text-zinc-600 dark:hover:bg-zinc-800'
          }`}
          aria-label="Toggle focus mode"
          title="Focus mode: hide progress and palette"
        >
          <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
            <circle cx="12" cy="12" r="3" />
            <path d="M12 3v3m0 12v3M3 12h3m12 0h3" />
          </svg>
        </button>
        <button
          type="button"
          onClick={() => setShowShortcuts(true)}
          className="hidden rounded-lg p-2 text-zinc-400 hover:bg-zinc-100 hover:text-zinc-600 sm:block dark:hover:bg-zinc-800"
          aria-label="Keyboard shortcuts"
          title="Keyboard shortcuts (?)"
        >
          <span className="text-sm font-bold">?</span>
        </button>
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

      <div className={`relative rounded-card border border-zinc-200 bg-surface p-4 shadow-card sm:p-6 dark:border-zinc-800 dark:bg-surface-dark-alt ${SCALE_CLASS[settings.questionScale]}`}>
        {paused && (
          <div className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-3 rounded-card bg-surface/95 backdrop-blur-sm dark:bg-surface-dark-alt/95">
            <p className="text-xl font-bold">Paused</p>
            <p className="text-sm text-zinc-500 dark:text-zinc-400">The clock is stopped. Breathe.</p>
            <button
              type="button"
              onClick={togglePause}
              className="rounded-lg bg-accent px-5 py-2.5 font-semibold text-white hover:bg-accent-hover"
            >
              Resume
            </button>
          </div>
        )}
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
            </details>
          </div>
        )}
      </div>

      <footer className="fixed inset-x-0 bottom-0 z-20 flex flex-wrap items-center gap-2 border-t border-zinc-200 bg-surface/95 px-4 py-3 backdrop-blur pb-[calc(0.75rem+env(safe-area-inset-bottom))] sm:static sm:mt-4 sm:flex-nowrap sm:gap-3 sm:border-0 sm:bg-transparent sm:p-0 sm:pb-0 sm:backdrop-blur-none dark:border-zinc-800 dark:bg-surface-dark/95 sm:dark:bg-transparent">
        {freeNav && (
          <button
            type="button"
            onClick={goPrev}
            disabled={currentIndex === 0}
            className="min-h-11 touch-manipulation rounded-lg border border-zinc-200 px-4 py-2 text-sm font-medium disabled:opacity-40 dark:border-zinc-700"
          >
            Previous
          </button>
        )}
        {practice && (
          <button
            type="button"
            onClick={() => sessionStore.getState().flag(question.id)}
            className={`min-h-11 touch-manipulation rounded-lg border px-4 py-2 text-sm font-medium ${
              session.flagged.includes(question.id)
                ? 'border-warning bg-warning/10 text-warning'
                : 'border-zinc-200 dark:border-zinc-700'
            }`}
          >
            {session.flagged.includes(question.id) ? 'Flagged' : 'Flag'}
          </button>
        )}
        {practice && !settings.focusMode && (
          <div className="order-last hidden w-full sm:order-none sm:block sm:w-auto sm:flex-1">
            <QuestionPalette
              total={session.questions.length}
              currentIndex={currentIndex}
              answeredIds={new Set(Object.keys(answers))}
              flaggedIds={new Set(session.flagged)}
              questionIds={session.questions.map((q) => q.id)}
              groupKeys={
                session.subtest === 'gam'
                  ? session.questions.map((q) => (q.type === 'gam' ? q.passageId : ''))
                  : undefined
              }
              onJump={(i) => sessionStore.getState().goTo(i)}
            />
          </div>
        )}
        {(!practice || settings.focusMode) && <div className="hidden flex-1 sm:block" />}
        {isExam && !isLast && (
          <button
            type="button"
            onClick={() => setSubmitAsk(true)}
            className="min-h-11 touch-manipulation rounded-lg px-4 py-2 text-sm font-medium text-zinc-500 hover:bg-zinc-100 dark:text-zinc-400 dark:hover:bg-zinc-800"
          >
            Submit early
          </button>
        )}
        {isLast ? (
          <button
            type="button"
            onClick={trySubmit}
            className="ml-auto min-h-11 touch-manipulation rounded-lg bg-accent px-6 py-2.5 font-semibold text-white hover:bg-accent-hover"
          >
            Submit
          </button>
        ) : (
          <button
            type="button"
            onClick={goNext}
            className="ml-auto min-h-11 touch-manipulation rounded-lg bg-accent px-6 py-2.5 font-semibold text-white hover:bg-accent-hover"
          >
            Next →
          </button>
        )}
      </footer>

      {showShortcuts && (
        <ShortcutsOverlay
          onClose={() => setShowShortcuts(false)}
          isLatin={question.type === 'latin'}
          isGam={question.type === 'gam'}
        />
      )}

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
