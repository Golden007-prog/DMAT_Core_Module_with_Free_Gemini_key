import type { EquationEntryAnswer, EquationQuestion } from '../../engine/types';

/** §3.2: system of equations; Choice mode (exam-faithful default) asks for
 *  one variable with 5 options; Entry mode wants every variable. */
export default function EquationQuestionView({
  question,
  answer,
  onAnswer,
  reveal = false,
}: {
  question: EquationQuestion;
  answer: unknown;
  onAnswer?: (value: unknown) => void;
  reveal?: boolean;
}) {
  return (
    <div className="mx-auto max-w-md space-y-6">
      <div
        className="rounded-card bg-white px-6 py-5 font-mono text-xl leading-9 tracking-wide text-ink shadow-card"
        aria-label="Equation system"
      >
        {question.equationsDisplay.map((eq) => (
          <div key={eq}>{eq}</div>
        ))}
      </div>

      {question.askMode === 'choice' && question.target && (
        <fieldset>
          <legend className="mb-3 text-base font-semibold">
            What is <span className="font-mono text-accent dark:text-accent-dark">{question.target.variable}</span>?
          </legend>
          <div className="flex flex-wrap gap-2" role="radiogroup" aria-label={`Value of ${question.target.variable}`}>
            {question.target.options.map((opt, i) => {
              const isSelected = answer === opt;
              const isCorrect = i === question.target!.correct;
              const style = reveal
                ? isCorrect
                  ? 'border-success bg-success/10 text-success'
                  : isSelected
                    ? 'border-error bg-error/10 text-error'
                    : 'border-zinc-200 text-zinc-500 dark:border-zinc-700'
                : isSelected
                  ? 'border-accent bg-accent text-white dark:border-accent-dark dark:bg-accent-dark'
                  : 'border-zinc-200 hover:border-accent hover:text-accent dark:border-zinc-700 dark:hover:border-accent-dark';
              return (
                <button
                  key={opt}
                  type="button"
                  role="radio"
                  aria-checked={isSelected}
                  disabled={!onAnswer}
                  onClick={() => onAnswer?.(opt)}
                  className={`min-w-14 rounded-lg border-2 px-4 py-2.5 font-mono text-lg font-semibold transition-colors ${style}`}
                >
                  {opt}
                </button>
              );
            })}
          </div>
        </fieldset>
      )}

      {question.askMode === 'entry' && (
        <fieldset className="space-y-3">
          <legend className="mb-1 text-base font-semibold">Enter every value (1–20)</legend>
          {question.variables.map((v) => {
            const entry = (answer as EquationEntryAnswer | undefined)?.[v] ?? '';
            const correctValue = question.solution[v];
            const showState = reveal && entry !== '';
            return (
              <label key={v} className="flex items-center gap-3">
                <span className="w-8 font-mono text-lg font-semibold">{v}</span>
                <input
                  type="number"
                  min={1}
                  max={20}
                  value={entry}
                  disabled={!onAnswer}
                  onChange={(e) => {
                    const n = Number(e.target.value);
                    const next = { ...((answer as EquationEntryAnswer) ?? {}) };
                    if (e.target.value === '' || Number.isNaN(n)) delete next[v];
                    else next[v] = Math.min(20, Math.max(1, Math.round(n)));
                    onAnswer?.(next);
                  }}
                  className={`w-24 rounded-lg border-2 px-3 py-2 font-mono text-lg dark:bg-zinc-900 ${
                    showState
                      ? entry === correctValue
                        ? 'border-success'
                        : 'border-error'
                      : 'border-zinc-200 dark:border-zinc-700'
                  }`}
                  aria-label={`Value of ${v}`}
                />
                {reveal && entry !== correctValue && (
                  <span className="text-sm font-medium text-success">→ {correctValue}</span>
                )}
              </label>
            );
          })}
        </fieldset>
      )}
    </div>
  );
}
