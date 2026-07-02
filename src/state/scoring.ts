import type {
  Difficulty,
  EquationEntryAnswer,
  FigureAnswer,
  Question,
  RuleTagScore,
  Session,
  SessionScore,
} from '../engine/types';

/** Single source of truth for correctness — used by scoring, instant
 *  feedback, review, and analytics rows. */
export function isAnswerCorrect(question: Question, answer: unknown): boolean {
  if (answer === undefined || answer === null) return false;

  switch (question.type) {
    case 'figures': {
      const a = answer as FigureAnswer;
      return a.image1 === question.image1.correct && a.image2 === question.image2.correct;
    }
    case 'equations': {
      if (question.askMode === 'choice') {
        return answer === question.solution[question.target!.variable];
      }
      const a = answer as EquationEntryAnswer;
      return question.variables.every((v) => a[v] === question.solution[v]);
    }
    case 'latin':
      return answer === question.solutionLetter;
  }
}

export function computeScore(
  session: Pick<Session, 'questions' | 'answers'>,
  perQuestionTimeMs: Record<string, number> = {},
): SessionScore {
  const perDifficulty: Partial<Record<Difficulty, RuleTagScore>> = {};
  const perRuleTag: Record<string, RuleTagScore> = {};
  let correct = 0;
  let unanswered = 0;

  for (const q of session.questions) {
    const answer = session.answers[q.id];
    const isCorrect = isAnswerCorrect(q, answer);
    if (answer === undefined) unanswered++;
    if (isCorrect) correct++;

    const d = (perDifficulty[q.difficulty] ??= { correct: 0, total: 0 });
    d.total++;
    if (isCorrect) d.correct++;

    for (const tag of q.ruleTags) {
      const t = (perRuleTag[tag] ??= { correct: 0, total: 0 });
      t.total++;
      if (isCorrect) t.correct++;
    }
  }

  const totalQuestions = session.questions.length;
  const times = Object.values(perQuestionTimeMs);
  const totalTimeMs = times.reduce((a, b) => a + b, 0);

  return {
    totalQuestions,
    correct,
    wrong: totalQuestions - correct, // guessing allowed; unanswered counts as wrong
    unanswered,
    accuracy: totalQuestions === 0 ? 0 : correct / totalQuestions,
    perDifficulty,
    perRuleTag,
    totalTimeMs,
    avgTimePerQuestionMs: times.length === 0 ? 0 : totalTimeMs / times.length,
    perQuestionTimeMs,
  };
}
