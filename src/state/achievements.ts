import type { Session, SubtestType } from '../engine/types';
import type { AttemptRow } from '../storage/db';
import { computeStreakDays } from './insights';

export interface Achievement {
  id: string;
  name: string;
  description: string;
  icon: string;
  earned: boolean;
  /** e.g. "64/100" for in-progress badges */
  progress?: string;
}

/** Local, deterministic badges — computed from history, no server needed. */
export function computeAchievements(sessions: Session[], attempts: AttemptRow[]): Achievement[] {
  const scored = sessions.filter((s) => s.score);
  const correct = attempts.filter((a) => a.correct);
  const hardCorrect = correct.filter((a) => a.difficulty === 'hard').length;
  const subtests = new Set(scored.map((s) => s.subtest));
  const streak = computeStreakDays(scored);

  const perfectSet = scored.some((s) => s.questionCount >= 5 && s.score!.accuracy === 1);
  const sharpshooter = scored.some((s) => s.questionCount >= 20 && s.score!.accuracy >= 0.9);
  const speedDemon = scored.some((s) => {
    if (s.startedAt === undefined || s.finishedAt === undefined || s.score!.unanswered > 0) {
      return false;
    }
    return s.finishedAt - s.startedAt <= s.durationMs / 2 && s.score!.accuracy >= 0.8;
  });
  const examSubtests = new Set(
    scored.filter((s) => s.mode === 'exam' && s.questionCount >= 20).map((s) => s.subtest),
  );

  const fmt = (n: number, goal: number) => `${Math.min(n, goal)}/${goal}`;

  return [
    {
      id: 'first-steps',
      name: 'First steps',
      description: 'Finish your first practice set.',
      icon: '🌱',
      earned: scored.length >= 1,
    },
    {
      id: 'century',
      name: 'Century',
      description: 'Answer 100 questions.',
      icon: '💯',
      earned: attempts.length >= 100,
      progress: attempts.length < 100 ? fmt(attempts.length, 100) : undefined,
    },
    {
      id: 'marathon',
      name: 'Marathon',
      description: 'Answer 1000 questions.',
      icon: '🏃',
      earned: attempts.length >= 1000,
      progress: attempts.length < 1000 ? fmt(attempts.length, 1000) : undefined,
    },
    {
      id: 'perfect-set',
      name: 'Perfect set',
      description: '100% on a set of 5 or more.',
      icon: '🎯',
      earned: perfectSet,
    },
    {
      id: 'sharpshooter',
      name: 'Sharpshooter',
      description: '90%+ on a full 20-question set.',
      icon: '🏹',
      earned: sharpshooter,
    },
    {
      id: 'speed-demon',
      name: 'Speed demon',
      description: 'Full set, half the time, 80%+ accuracy.',
      icon: '⚡',
      earned: speedDemon,
    },
    {
      id: 'week-streak',
      name: 'On fire',
      description: 'Practice 7 days in a row.',
      icon: '🔥',
      earned: streak >= 7,
      progress: streak < 7 ? fmt(streak, 7) : undefined,
    },
    {
      id: 'all-rounder',
      name: 'All-rounder',
      description: 'Finish sets in all three subtests.',
      icon: '🧩',
      earned: (['figures', 'equations', 'latin'] as SubtestType[]).every((t) => subtests.has(t)),
      progress: subtests.size < 3 ? fmt(subtests.size, 3) : undefined,
    },
    {
      id: 'exam-ready',
      name: 'Exam ready',
      description: 'A full 20-task exam run in every subtest.',
      icon: '🎓',
      earned: examSubtests.size >= 3,
      progress: examSubtests.size < 3 ? fmt(examSubtests.size, 3) : undefined,
    },
    {
      id: 'hard-boiled',
      name: 'Hard-boiled',
      description: '50 hard questions answered correctly.',
      icon: '🪨',
      earned: hardCorrect >= 50,
      progress: hardCorrect < 50 ? fmt(hardCorrect, 50) : undefined,
    },
  ];
}
