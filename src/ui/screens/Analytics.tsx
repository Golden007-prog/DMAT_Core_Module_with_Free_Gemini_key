import { useEffect, useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useHistory } from '../../state/historyStore';
import { sessionStore } from '../../state/sessionStore';
import { computeInsights, computeStreakDays } from '../../state/insights';
import { useChartPalette } from '../charts/palette';
import LineChart, { type LineSeries } from '../charts/LineChart';
import HeatStrip from '../charts/HeatStrip';
import WeaknessBars from '../charts/WeaknessBars';
import CoachCard from '../components/CoachCard';
import { formatPercent } from '../format';
import type { Difficulty, SubtestType } from '../../engine/types';

const SUBTEST_NAMES: Record<SubtestType, string> = {
  figures: 'Figures',
  equations: 'Equations',
  latin: 'Latin Squares',
};

const MIN_TAG_ATTEMPTS = 5;

export default function Analytics() {
  const navigate = useNavigate();
  const { sessions, attempts, loaded, refresh } = useHistory();
  const pal = useChartPalette();

  useEffect(() => {
    void refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const scored = useMemo(
    () => sessions.filter((s) => s.score).sort((a, b) => a.createdAt - b.createdAt),
    [sessions],
  );

  const accuracySeries: LineSeries[] = useMemo(
    () =>
      (Object.keys(SUBTEST_NAMES) as SubtestType[])
        .map((key) => ({
          key,
          name: SUBTEST_NAMES[key],
          color: pal.series[key],
          points: scored
            .filter((s) => s.subtest === key)
            .map((s) => ({
              x: s.createdAt,
              y: s.score!.accuracy * 100,
              label: `${SUBTEST_NAMES[key]} · ${new Date(s.createdAt).toLocaleDateString()} · ${formatPercent(s.score!.accuracy)}`,
            })),
        }))
        .filter((s) => s.points.length > 0),
    [scored, pal],
  );

  const timeSeries: LineSeries[] = useMemo(() => {
    const points = scored
      .filter((s) => s.score!.avgTimePerQuestionMs > 0)
      .map((s) => ({
        x: s.createdAt,
        y: s.score!.avgTimePerQuestionMs / 1000,
        label: `${new Date(s.createdAt).toLocaleDateString()} · ${Math.round(s.score!.avgTimePerQuestionMs / 1000)} s/question`,
      }));
    return points.length > 0
      ? [{ key: 'time', name: 'Avg time per question', color: pal.series.equations, points }]
      : [];
  }, [scored, pal]);

  const diffCells = useMemo(() => {
    const byDiff = new Map<Difficulty, { correct: number; total: number }>();
    for (const a of attempts) {
      const d = byDiff.get(a.difficulty) ?? { correct: 0, total: 0 };
      d.total++;
      if (a.correct) d.correct++;
      byDiff.set(a.difficulty, d);
    }
    return (['easy', 'medium', 'hard'] as Difficulty[]).map((d) => {
      const v = byDiff.get(d);
      return {
        label: d,
        accuracy: v && v.total > 0 ? v.correct / v.total : null,
        total: v?.total ?? 0,
      };
    });
  }, [attempts]);

  const weakness = useMemo(() => {
    const byTag = new Map<string, { correct: number; total: number }>();
    for (const a of attempts) {
      for (const tag of a.ruleTags) {
        const t = byTag.get(tag) ?? { correct: 0, total: 0 };
        t.total++;
        if (a.correct) t.correct++;
        byTag.set(tag, t);
      }
    }
    return [...byTag.entries()]
      .filter(([, v]) => v.total >= MIN_TAG_ATTEMPTS)
      .map(([tag, v]) => ({ tag, ...v }))
      .sort((a, b) => a.correct / a.total - b.correct / b.total)
      .slice(0, 8);
  }, [attempts]);

  const insights = useMemo(() => computeInsights(scored, attempts), [scored, attempts]);
  const streak = useMemo(() => computeStreakDays(scored), [scored]);
  const overall = useMemo(() => {
    const total = attempts.length;
    const correct = attempts.filter((a) => a.correct).length;
    return total > 0 ? correct / total : null;
  }, [attempts]);

  if (loaded && scored.length === 0) {
    return (
      <section className="py-10 text-center">
        <h1 className="text-2xl font-bold">Analytics</h1>
        <p className="mt-3 text-zinc-500 dark:text-zinc-400">
          Finish a few sessions and your accuracy trends, weak spots, and pacing land here.
        </p>
        <Link to="/" className="mt-4 inline-block rounded-lg bg-accent px-5 py-2.5 font-semibold text-white hover:bg-accent-hover">
          Start practicing
        </Link>
      </section>
    );
  }

  return (
    <section className="space-y-5">
      <h1 className="text-2xl font-bold">Analytics</h1>

      <div className="grid grid-cols-3 gap-4">
        {[
          { label: 'Sessions', value: String(scored.length) },
          { label: 'Overall accuracy', value: overall === null ? '—' : formatPercent(overall) },
          { label: 'Day streak', value: streak > 0 ? `${streak} 🔥` : '0' },
        ].map((t) => (
          <div key={t.label} className="rounded-card border border-zinc-200 bg-surface p-4 text-center shadow-card dark:border-zinc-800 dark:bg-surface-dark-alt">
            <p className="text-2xl font-bold tabular-nums">{t.value}</p>
            <p className="mt-0.5 text-xs text-zinc-500 uppercase tracking-wide dark:text-zinc-400">{t.label}</p>
          </div>
        ))}
      </div>

      {accuracySeries.length > 0 && (
        <div className="rounded-card border border-zinc-200 bg-surface p-5 shadow-card dark:border-zinc-800 dark:bg-surface-dark-alt">
          <h2 className="mb-3 font-semibold">Accuracy over time</h2>
          <LineChart
            series={accuracySeries}
            yDomain={[0, 100]}
            yTicks={[0, 25, 50, 75, 100]}
            yFormat={(v) => `${v}%`}
          />
        </div>
      )}

      <div className="grid gap-5 lg:grid-cols-2">
        <div className="rounded-card border border-zinc-200 bg-surface p-5 shadow-card dark:border-zinc-800 dark:bg-surface-dark-alt">
          <h2 className="mb-3 font-semibold">Accuracy by difficulty</h2>
          <HeatStrip cells={diffCells} />
        </div>

        {timeSeries.length > 0 && (
          <div className="rounded-card border border-zinc-200 bg-surface p-5 shadow-card dark:border-zinc-800 dark:bg-surface-dark-alt">
            <h2 className="mb-3 font-semibold">Pacing vs the 75 s budget</h2>
            <LineChart
              series={timeSeries}
              yDomain={[0, 150]}
              yTicks={[0, 50, 75, 100, 150]}
              yFormat={(v) => `${v}s`}
              refLineY={75}
              refLineLabel="75 s budget"
            />
          </div>
        )}
      </div>

      <div className="rounded-card border border-zinc-200 bg-surface p-5 shadow-card dark:border-zinc-800 dark:bg-surface-dark-alt">
        <h2 className="mb-1 font-semibold">Weakest rule types</h2>
        <p className="mb-3 text-xs text-zinc-500 dark:text-zinc-400">
          Shown after {MIN_TAG_ATTEMPTS}+ attempts per rule type, weakest first.
        </p>
        {weakness.length > 0 ? (
          <WeaknessBars rows={weakness} />
        ) : (
          <p className="text-sm text-zinc-500 dark:text-zinc-400">
            Not enough data yet — each rule type needs at least {MIN_TAG_ATTEMPTS} attempts before it appears here.
          </p>
        )}
      </div>

      <div className="rounded-card border border-zinc-200 bg-surface p-5 shadow-card dark:border-zinc-800 dark:bg-surface-dark-alt">
        <h2 className="mb-3 font-semibold">What to improve</h2>
        {insights.length > 0 ? (
          <ul className="space-y-3">
            {insights.map((i) => (
              <li key={i.id} className="flex flex-wrap items-center gap-3 rounded-lg bg-zinc-50 p-3 text-sm dark:bg-zinc-900">
                <span className="flex-1">{i.message}</span>
                {i.drill && (
                  <button
                    type="button"
                    onClick={() => {
                      void sessionStore.getState().startNewSession({
                        mode: 'practice',
                        subtest: i.drill!.subtest,
                        difficulty: i.drill!.difficulty,
                        questionCount: i.drill!.count,
                        seed: 0,
                      });
                      navigate('/run');
                    }}
                    className="rounded-lg bg-accent px-3 py-1.5 text-xs font-semibold text-white hover:bg-accent-hover"
                  >
                    Drill: {i.drill.count} {SUBTEST_NAMES[i.drill.subtest]} ({i.drill.difficulty})
                  </button>
                )}
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-zinc-500 dark:text-zinc-400">
            Nothing stands out yet — keep practicing and concrete suggestions appear here.
          </p>
        )}
        <CoachCard sessions={scored} attempts={attempts} />
      </div>
    </section>
  );
}
