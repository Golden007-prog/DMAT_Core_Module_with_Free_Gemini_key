import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { sessionStore, useSession } from '../../state/sessionStore';
import { fullCoreStore } from '../../state/fullCoreStore';
import { useHistory } from '../../state/historyStore';
import type { Difficulty, GamTopicArea } from '../../engine/types';
import { GAM_TOPIC_AREAS } from '../../engine/types';
import { GAM_TOPIC_LABELS } from '../gamLabels';
import { GAM_INFO } from '../../content/gamInfo';
import { formatPercent } from '../format';
import ConfirmDialog from '../components/ConfirmDialog';

const AREA_ICONS: Record<GamTopicArea, string> = {
  mathematics: '∑',
  'computational-sciences': '⌘',
  'natural-sciences': '⚛',
  engineering: '⚙',
  'business-administration': '₿',
  economics: '€',
  'social-sciences': '⚖',
  humanities: '¶',
};

function AccuracyRing({ accuracy }: { accuracy: number | null }) {
  const r = 15;
  const c = 2 * Math.PI * r;
  return (
    <svg viewBox="0 0 36 36" className="h-9 w-9" aria-hidden="true">
      <circle
        cx="18"
        cy="18"
        r={r}
        fill="none"
        stroke="currentColor"
        strokeWidth="3.5"
        className="text-zinc-200 dark:text-zinc-800"
      />
      {accuracy !== null && (
        <circle
          cx="18"
          cy="18"
          r={r}
          fill="none"
          stroke={accuracy >= 0.85 ? '#2E8B57' : '#A3195B'}
          strokeWidth="3.5"
          strokeLinecap="round"
          strokeDasharray={`${accuracy * c} ${c}`}
          transform="rotate(-90 18 18)"
        />
      )}
    </svg>
  );
}

/** Hub for the General Academic Module: what it is, per-area progress, and
 *  every practice mode from a one-passage drill to the full dMAT chain. */
export default function GamHub() {
  const navigate = useNavigate();
  const history = useHistory();
  const [selected, setSelected] = useState<Set<GamTopicArea>>(new Set());
  const [difficulty, setDifficulty] = useState<Difficulty | 'mixed'>('mixed');
  const [pendingAction, setPendingAction] = useState<null | (() => void)>(null);
  const hasRunningAttempt = useSession(
    (s) => s.session?.state === 'running' && Object.keys(s.session.answers).length > 0,
  );

  useEffect(() => {
    void history.refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /** per-area accuracy from the denormalised attempt rows */
  const areaStats = useMemo(() => {
    const map = new Map<GamTopicArea, { correct: number; total: number }>();
    for (const a of history.attempts) {
      if (a.type !== 'gam') continue;
      for (const area of GAM_TOPIC_AREAS) {
        if (a.ruleTags.includes(`gam.topic.${area}`)) {
          const s = map.get(area) ?? { correct: 0, total: 0 };
          s.total++;
          if (a.correct) s.correct++;
          map.set(area, s);
        }
      }
    }
    return map;
  }, [history.attempts]);

  const toggleArea = (area: GamTopicArea) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(area)) next.delete(area);
      else next.add(area);
      return next;
    });
  };

  const guarded = (action: () => void) => {
    if (hasRunningAttempt) setPendingAction(() => action);
    else action();
  };

  const startDrill = (passageCount: number, mode: 'practice' | 'exam' = 'practice') =>
    guarded(() => {
      fullCoreStore.getState().reset();
      void sessionStore.getState().startNewSession({
        mode,
        subtest: 'gam',
        difficulty,
        questionCount: 0, // derived from assembly
        seed: 0, // store draws a fresh seed
        gamTopicAreas: selected.size > 0 ? [...selected] : undefined,
        gamPassageCount: passageCount,
      });
      navigate('/run');
    });

  const startGamExam = () =>
    guarded(() => {
      fullCoreStore.getState().reset();
      void sessionStore.getState().startNewSession({
        mode: 'exam',
        subtest: 'gam',
        difficulty: 'mixed',
        questionCount: 0,
        seed: 0,
      });
      navigate('/run');
    });

  const startFullDmat = () =>
    guarded(() => {
      fullCoreStore.getState().begin('full-dmat');
      void sessionStore.getState().startNewSession(fullCoreStore.getState().stageConfig());
      navigate('/run');
    });

  return (
    <section>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">General Academic Module</h1>
          <p className="mt-1 max-w-2xl text-zinc-600 dark:text-zinc-300">
            The dMAT Subject Module for the India/APS requirement: a reading passage teaches a
            subject-related problem, then single-choice questions make you apply it. {GAM_INFO.gam.durationMinutes}{' '}
            minutes, 4 options each, across eight academic fields.
          </p>
        </div>
        <Link
          to="/dmat-info"
          className="rounded-lg border border-zinc-200 px-3 py-1.5 text-sm font-semibold text-accent hover:bg-zinc-50 dark:border-zinc-700 dark:text-accent-dark dark:hover:bg-zinc-800"
        >
          Do I need the dMAT? →
        </Link>
      </div>

      <ul className="mt-3 flex flex-wrap gap-2 text-xs font-medium text-zinc-600 dark:text-zinc-300">
        {[
          '90 minutes',
          'single choice, a)–d)',
          'passage teaches everything needed',
          'no notes allowed',
          'guessing is free',
        ].map((fact) => (
          <li key={fact} className="rounded-full bg-zinc-100 px-2.5 py-1 dark:bg-zinc-800">
            {fact}
          </li>
        ))}
      </ul>

      <h2 className="mt-6 text-sm font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
        Topic areas — tap to focus your drill
      </h2>
      <div
        className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-3 sm:gap-3 lg:grid-cols-4"
        role="group"
        aria-label="Topic areas"
      >
        {GAM_TOPIC_AREAS.map((area) => {
          const stats = areaStats.get(area);
          const accuracy = stats && stats.total > 0 ? stats.correct / stats.total : null;
          const active = selected.has(area);
          return (
            <button
              key={area}
              type="button"
              aria-pressed={active}
              onClick={() => toggleArea(area)}
              className={`flex min-h-11 items-center gap-3 rounded-card border-2 p-3 text-left transition-all ${
                active
                  ? 'border-accent bg-accent-tint/50 dark:border-accent-dark dark:bg-accent/10'
                  : 'border-zinc-200 bg-surface hover:-translate-y-px hover:shadow-card-lift dark:border-zinc-800 dark:bg-surface-dark-alt'
              }`}
            >
              <span aria-hidden="true" className="text-lg text-zinc-400 dark:text-zinc-500">
                {AREA_ICONS[area]}
              </span>
              <span className="min-w-0 flex-1">
                <span className="block truncate text-sm font-semibold">{GAM_TOPIC_LABELS[area]}</span>
                <span className="block text-xs text-zinc-500 dark:text-zinc-400">
                  {accuracy !== null && stats
                    ? `${formatPercent(accuracy)} · ${stats.total} answered`
                    : 'Not attempted yet'}
                </span>
              </span>
              <AccuracyRing accuracy={accuracy} />
            </button>
          );
        })}
      </div>

      <div className="mt-6 rounded-card border border-zinc-200 bg-surface p-5 shadow-card dark:border-zinc-800 dark:bg-surface-dark-alt">
        <fieldset>
          <legend className="text-sm font-semibold">Difficulty</legend>
          <div className="mt-2 flex flex-wrap gap-1.5">
            {(['easy', 'medium', 'hard', 'mixed'] as const).map((d) => (
              <button
                key={d}
                type="button"
                onClick={() => setDifficulty(d)}
                aria-pressed={difficulty === d}
                className={`rounded-lg px-3 py-1.5 text-sm font-medium capitalize ${
                  difficulty === d
                    ? 'bg-accent text-white dark:bg-accent-dark'
                    : 'bg-zinc-100 text-zinc-600 hover:bg-zinc-200 dark:bg-zinc-800 dark:text-zinc-300'
                }`}
              >
                {d}
              </button>
            ))}
          </div>
        </fieldset>

        <div className="mt-4 grid gap-2 sm:grid-cols-3">
          <button
            type="button"
            onClick={() => startDrill(1)}
            className="rounded-xl bg-accent px-4 py-3 font-semibold text-white transition-colors hover:bg-accent-hover"
          >
            Quick drill
            <span className="block text-xs font-normal opacity-90">1 passage · ≈15 min</span>
          </button>
          <button
            type="button"
            onClick={() => startDrill(2)}
            className="rounded-xl border-2 border-accent px-4 py-3 font-semibold text-accent transition-colors hover:bg-accent-tint/50 dark:border-accent-dark dark:text-accent-dark dark:hover:bg-accent/10"
          >
            Topic drill
            <span className="block text-xs font-normal opacity-80">
              2 passages{selected.size > 0 ? ` · ${selected.size} area${selected.size === 1 ? '' : 's'}` : ' · all areas'}
            </span>
          </button>
          <button
            type="button"
            onClick={() => startDrill(3)}
            className="rounded-xl border-2 border-accent px-4 py-3 font-semibold text-accent transition-colors hover:bg-accent-tint/50 dark:border-accent-dark dark:text-accent-dark dark:hover:bg-accent/10"
          >
            Timed set
            <span className="block text-xs font-normal opacity-80">3 passages · ≈50 min</span>
          </button>
        </div>
        {selected.size > 0 && (
          <p className="mt-2 text-xs text-zinc-500 dark:text-zinc-400">
            Drills draw from: {[...selected].map((a) => GAM_TOPIC_LABELS[a]).join(', ')} —{' '}
            <button type="button" className="font-semibold underline" onClick={() => setSelected(new Set())}>
              clear
            </button>
          </p>
        )}
      </div>

      <div className="mt-6 grid gap-4 lg:grid-cols-2">
        <div className="rounded-card border-2 border-accent/30 bg-gradient-to-r from-accent-tint/60 to-surface p-6 shadow-card dark:border-accent-dark/30 dark:from-accent/10 dark:to-surface-dark-alt">
          <h2 className="text-lg font-bold">Full GAM exam</h2>
          <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-300">
            90:00 on the clock, a balanced draw across the topic areas, ~24–34 questions — modeled on
            the official samples (g.a.s.t. does not publish exact counts). No notes, as in the real
            exam.
          </p>
          <button
            type="button"
            onClick={startGamExam}
            className="mt-4 rounded-xl bg-accent px-6 py-3 font-semibold text-white transition-colors hover:bg-accent-hover"
          >
            Start GAM exam
          </button>
        </div>
        <div className="rounded-card border-2 border-zinc-300 bg-surface p-6 shadow-card dark:border-zinc-700 dark:bg-surface-dark-alt">
          <h2 className="text-lg font-bold">Full dMAT simulation</h2>
          <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-300">
            The complete sitting: Core Module (3 × 20 tasks × 25:00 with 60 s breaks), the official
            30-minute module break, then the 90:00 General Academic Module. ≈3.5 hours total.
          </p>
          <button
            type="button"
            onClick={startFullDmat}
            className="mt-4 rounded-xl border-2 border-accent px-6 py-3 font-semibold text-accent transition-colors hover:bg-accent-tint/50 dark:border-accent-dark dark:text-accent-dark dark:hover:bg-accent/10"
          >
            Start full dMAT
          </button>
        </div>
      </div>

      <p className="mt-6 text-xs text-zinc-500 dark:text-zinc-400">
        All passages and questions are original CoreForge content in the officially documented format
        — practice material, not real exam content. Sample-style difficulty may differ from the real
        test.
      </p>

      <ConfirmDialog
        open={pendingAction !== null}
        title="Discard current attempt?"
        body="You have a test in progress with answers. Starting something new discards it entirely."
        confirmLabel="Discard and start"
        danger
        onConfirm={() => {
          pendingAction?.();
          setPendingAction(null);
        }}
        onCancel={() => setPendingAction(null)}
      />
    </section>
  );
}
