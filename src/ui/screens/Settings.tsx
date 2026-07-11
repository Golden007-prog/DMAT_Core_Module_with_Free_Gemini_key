import { useEffect, useRef, useState } from 'react';
import {
  useSettings,
  DEFAULT_MODEL_CHAIN,
  RECOMMENDED_MODEL_PREFERENCE,
} from '../../state/settingsStore';
import { useThemeStore, type Theme } from '../../state/themeStore';
import { GeminiUnavailableError, listAvailableModels } from '../../ai/gemini';
import { getUsageToday } from '../../ai/aiUsage';
import { getStorage } from '../../storage/db';
import { exportAll, importAll } from '../../storage/exportImport';
import { useHistory } from '../../state/historyStore';
import { toast } from '../components/Toast';
import ConfirmDialog from '../components/ConfirmDialog';
import AccountCard from '../components/AccountCard';

function Card({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-card border border-zinc-200 bg-surface p-5 shadow-card dark:border-zinc-800 dark:bg-surface-dark-alt">
      <h2 className="font-semibold">{title}</h2>
      {children}
    </div>
  );
}

interface InstallPromptEvent extends Event {
  prompt(): Promise<void>;
}

let deferredInstall: InstallPromptEvent | null = null;
if (typeof window !== 'undefined') {
  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    deferredInstall = e as InstallPromptEvent;
  });
}

export default function Settings() {
  const settings = useSettings();
  const theme = useThemeStore((s) => s.theme);
  const setTheme = useThemeStore((s) => s.setTheme);
  const [canInstall, setCanInstall] = useState(deferredInstall !== null);
  const [keyTest, setKeyTest] = useState<'idle' | 'testing' | 'ok' | 'fail'>('idle');

  useEffect(() => {
    const onPrompt = () => setCanInstall(true);
    window.addEventListener('beforeinstallprompt', onPrompt);
    return () => window.removeEventListener('beforeinstallprompt', onPrompt);
  }, []);
  /** every generateContent-capable model this key can see — not just the chain */
  const [foundModels, setFoundModels] = useState<string[]>([]);
  const [keyError, setKeyError] = useState('');
  const [keyDetail, setKeyDetail] = useState('');
  const [confirmDelete, setConfirmDelete] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  // getUsageToday() reads storage, so it needs a nudge to stay honest after an AI
  // call in another tab (or in the runner) spends budget
  const [usage, setUsage] = useState(getUsageToday);
  useEffect(() => {
    const sync = () => setUsage(getUsageToday());
    window.addEventListener('focus', sync);
    window.addEventListener('storage', sync);
    return () => {
      window.removeEventListener('focus', sync);
      window.removeEventListener('storage', sync);
    };
  }, []);

  const testKey = async () => {
    setKeyTest('testing');
    try {
      setFoundModels(await listAvailableModels(settings.geminiKey));
      setKeyTest('ok');
    } catch (e) {
      setFoundModels([]);
      setKeyError(
        e instanceof GeminiUnavailableError
          ? e.message
          : 'Could not check the key — you appear to be offline.',
      );
      setKeyDetail(e instanceof GeminiUnavailableError ? (e.apiMessage ?? '') : '');
      setKeyTest('fail');
    }
  };

  const recommendedChain = RECOMMENDED_MODEL_PREFERENCE.filter((m) =>
    foundModels.includes(m),
  ).slice(0, 3);

  /** Chain entries the live model list does not contain. A model that 404s is the
   *  single most common cause of "AI unavailable" on a perfectly good key, so it
   *  is named outright rather than left as a grey dot in a list. */
  const deadChain = keyTest === 'ok' ? settings.modelChain.filter((m) => !foundModels.includes(m)) : [];
  // prefer the curated order; if this key sees none of them, its own list still beats a dead chain
  const repairChain = recommendedChain.length > 0 ? recommendedChain : foundModels.slice(0, 3);

  /** What the user is *typing*, which is not always a chain: select-all + delete
   *  is the normal first move when retyping the field, and it must not persist
   *  `modelChain: []` — an empty chain makes generateJson fail before it sends a
   *  single request. The draft holds the raw text; only a non-empty parse reaches
   *  the store, and blur snaps the box back to the chain actually in force so a
   *  field left empty never misrepresents what the app will use. */
  const [chainDraft, setChainDraft] = useState<string | null>(null);
  const chainText = chainDraft ?? settings.modelChain.join(', ');

  const editChain = (text: string) => {
    setChainDraft(text);
    const next = text.split(',').map((s) => s.trim()).filter(Boolean);
    if (next.length > 0) settings.set('modelChain', next);
  };

  /** the buttons below set the chain wholesale — drop the draft so the box shows it */
  const applyChain = (chain: string[]) => {
    setChainDraft(null);
    settings.set('modelChain', chain);
  };

  const doExport = async () => {
    const storage = await getStorage();
    const json = await exportAll(storage);
    const blob = new Blob([json], { type: 'application/json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `coreforge-export-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(a.href);
  };

  const doImport = async (file: File) => {
    try {
      const storage = await getStorage();
      await importAll(storage, await file.text());
      await useHistory.getState().refresh();
      toast('Import complete — your history is restored.', 'success');
    } catch (e) {
      toast((e as Error).message, 'error');
    }
  };

  const doDeleteAll = async () => {
    const storage = await getStorage();
    await storage.deleteAll();
    await useHistory.getState().refresh();
    setConfirmDelete(false);
    toast('All local data deleted.', 'success');
  };

  return (
    <section className="mx-auto max-w-2xl space-y-5">
      <h1 className="text-2xl font-bold">Settings</h1>

      <AccountCard />

      <Card title="Gemini AI (optional — bring your own key)">
        <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-300">
          Everything works fully without AI. A free Gemini API key adds AI-generated equation variety,
          per-mistake tutor explanations, and a coaching narrative. Create one at{' '}
          <a
            href="https://aistudio.google.com/apikey"
            target="_blank"
            rel="noreferrer"
            className="font-semibold text-accent hover:underline dark:text-accent-dark"
          >
            Google AI Studio
          </a>
          .
        </p>
        <div className="mt-3 flex gap-2">
          <input
            type="password"
            value={settings.geminiKey}
            onChange={(e) => {
              settings.set('geminiKey', e.target.value.trim());
              setKeyTest('idle');
            }}
            placeholder="Paste your Gemini API key"
            className="flex-1 rounded-lg border border-zinc-300 px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-900"
            aria-label="Gemini API key"
          />
          <button
            type="button"
            onClick={testKey}
            disabled={!settings.geminiKey || keyTest === 'testing'}
            className="rounded-lg bg-accent px-4 py-2 text-sm font-semibold text-white hover:bg-accent-hover disabled:opacity-40"
          >
            {keyTest === 'testing' ? 'Testing…' : 'Test key'}
          </button>
        </div>
        {keyTest === 'ok' && (
          <p className="mt-2 text-sm text-success">
            Key accepted — {foundModels.length} models available. Honest caveat: this lists models,
            it does not generate, so a project-level block can still surface on first use.
          </p>
        )}
        {keyTest === 'fail' && (
          <>
            <p className="mt-2 text-sm text-error">{keyError}</p>
            {keyDetail && (
              <p className="mt-1 font-mono text-xs text-zinc-500 dark:text-zinc-400">{keyDetail}</p>
            )}
          </>
        )}
        <p className="mt-3 text-xs text-zinc-500 dark:text-zinc-400">
          The key is stored in this browser and synced privately to your signed-in account (your own
          access-controlled row), so you enter it once across all devices. It is sent only to
          generativelanguage.googleapis.com. Honest note: Google may use free-tier prompts to improve
          its products — don't paste anything private into AI features.
        </p>

        <div className="mt-4 border-t border-zinc-100 pt-4 dark:border-zinc-800">
          <label className="flex items-center gap-2 text-sm font-medium">
            <input
              type="checkbox"
              checked={settings.aiEquationsEnabled}
              onChange={(e) => settings.set('aiEquationsEnabled', e.target.checked)}
              className="h-4 w-4 accent-[#A3195B]"
            />
            <span>
              AI equation sets — generated fresh with your key (and shared to the community pool),
              or loaded from the pool when you have no key. Every system is re-validated locally.
            </span>
          </label>

          <label className="mt-3 block text-sm font-medium" htmlFor="model-chain">
            Model chain (first available wins)
          </label>
          <input
            id="model-chain"
            type="text"
            value={chainText}
            onChange={(e) => editChain(e.target.value)}
            onBlur={() => setChainDraft(null)}
            className="mt-1 w-full rounded-lg border border-zinc-300 px-3 py-2 font-mono text-xs dark:border-zinc-700 dark:bg-zinc-900"
          />

          {keyTest === 'ok' && deadChain.length > 0 && (
            <div className="mt-2 rounded-lg border border-error/40 bg-error/5 p-3">
              <p className="text-sm text-error">
                {deadChain.length === 1 ? 'This model does not exist' : 'These models do not exist'} for
                your key:{' '}
                <span className="font-mono">{deadChain.join(', ')}</span>. That is enough to make AI
                report itself unavailable.
              </p>
              {repairChain.length > 0 && (
                <button
                  type="button"
                  onClick={() => applyChain(repairChain)}
                  className="mt-2 rounded-lg bg-accent px-3 py-1.5 text-xs font-semibold text-white hover:bg-accent-hover"
                >
                  Fix chain → {repairChain.join(', ')}
                </button>
              )}
            </div>
          )}

          {keyTest === 'ok' && (
            <ul className="mt-2 space-y-1">
              {settings.modelChain.map((m) => {
                const exists = foundModels.includes(m);
                return (
                  <li key={m} className="flex items-center gap-2 font-mono text-xs">
                    <span
                      aria-hidden
                      className={`h-2 w-2 shrink-0 rounded-full ${
                        exists ? 'bg-success' : 'bg-zinc-300 dark:bg-zinc-600'
                      }`}
                    />
                    <span className={exists ? '' : 'text-zinc-400 line-through dark:text-zinc-500'}>
                      {m}
                    </span>
                    <span className="font-sans text-zinc-500 dark:text-zinc-400">
                      {exists ? 'available' : 'not available for this key'}
                    </span>
                  </li>
                );
              })}
            </ul>
          )}

          <div className="mt-1 flex flex-wrap gap-3">
            <button
              type="button"
              onClick={() => applyChain(DEFAULT_MODEL_CHAIN)}
              className="text-xs font-medium text-accent hover:underline dark:text-accent-dark"
            >
              Reset to default chain
            </button>
            {recommendedChain.length > 0 && (
              <button
                type="button"
                onClick={() => applyChain(recommendedChain)}
                className="text-xs font-medium text-accent hover:underline dark:text-accent-dark"
              >
                Use recommended chain ({recommendedChain.join(', ')})
              </button>
            )}
          </div>

          <div className="mt-3">
            <label className="text-sm font-medium" htmlFor="budget">
              Daily AI call budget
            </label>
            <div className="mt-1 flex items-center gap-3">
              <input
                id="budget"
                type="number"
                min={1}
                max={200}
                value={settings.aiDailyBudget}
                onChange={(e) =>
                  settings.set('aiDailyBudget', Math.max(1, Math.min(200, Number(e.target.value) || 25)))
                }
                className="w-24 rounded-lg border border-zinc-300 px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-900"
              />
              <div className="flex-1">
                <div className="h-2 overflow-hidden rounded-full bg-zinc-200 dark:bg-zinc-800">
                  <div
                    className="h-full bg-accent dark:bg-accent-dark"
                    style={{ width: `${Math.min(100, (usage / settings.aiDailyBudget) * 100)}%` }}
                  />
                </div>
                <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
                  {usage >= settings.aiDailyBudget
                    ? `Budget reached (${usage} of ${settings.aiDailyBudget}) — AI features use the built-in generator until tomorrow.`
                    : `${usage} of ${settings.aiDailyBudget} calls used today`}
                </p>
              </div>
            </div>
          </div>
        </div>
      </Card>

      <Card title="Practice experience">
        <div className="mt-3 space-y-4">
          <fieldset>
            <legend className="text-sm font-medium">Theme</legend>
            <div className="mt-1.5 flex gap-1.5">
              {(['light', 'dark', 'system'] as Theme[]).map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => setTheme(t)}
                  aria-pressed={theme === t}
                  className={`rounded-lg px-3 py-1.5 text-sm font-medium capitalize ${
                    theme === t
                      ? 'bg-accent text-white dark:bg-accent-dark'
                      : 'bg-zinc-100 text-zinc-600 hover:bg-zinc-200 dark:bg-zinc-800 dark:text-zinc-300'
                  }`}
                >
                  {t}
                </button>
              ))}
            </div>
          </fieldset>

          <fieldset>
            <legend className="text-sm font-medium">Question size</legend>
            <div className="mt-1.5 flex gap-1.5">
              {(['compact', 'comfortable', 'large'] as const).map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => settings.set('questionScale', s)}
                  aria-pressed={settings.questionScale === s}
                  className={`rounded-lg px-3 py-1.5 text-sm font-medium capitalize ${
                    settings.questionScale === s
                      ? 'bg-accent text-white dark:bg-accent-dark'
                      : 'bg-zinc-100 text-zinc-600 hover:bg-zinc-200 dark:bg-zinc-800 dark:text-zinc-300'
                  }`}
                >
                  {s}
                </button>
              ))}
            </div>
          </fieldset>

          <label className="flex items-center gap-2 text-sm font-medium">
            <input
              type="checkbox"
              checked={settings.soundEffects}
              onChange={(e) => settings.set('soundEffects', e.target.checked)}
              className="h-4 w-4 accent-[#A3195B]"
            />
            Sound effects
            <span className="text-xs font-normal text-zinc-500 dark:text-zinc-400">
              (answer feedback, time warnings, promotions)
            </span>
          </label>

          <label className="flex items-center gap-2 text-sm font-medium">
            <input
              type="checkbox"
              checked={settings.haptics}
              onChange={(e) => settings.set('haptics', e.target.checked)}
              className="h-4 w-4 accent-[#A3195B]"
            />
            Vibration on answers
            <span className="text-xs font-normal text-zinc-500 dark:text-zinc-400">(phones only)</span>
          </label>

          <label className="flex items-center gap-2 text-sm font-medium">
            <input
              type="checkbox"
              checked={settings.autoAdvance}
              onChange={(e) => settings.set('autoAdvance', e.target.checked)}
              className="h-4 w-4 accent-[#A3195B]"
            />
            Auto-advance in practice
            <span className="text-xs font-normal text-zinc-500 dark:text-zinc-400">
              (next question ~1 s after instant feedback)
            </span>
          </label>

          <div>
            <label className="text-sm font-medium" htmlFor="daily-goal">
              Daily goal (questions, 0 = off)
            </label>
            <input
              id="daily-goal"
              type="number"
              min={0}
              max={200}
              value={settings.dailyGoal}
              onChange={(e) =>
                settings.set('dailyGoal', Math.max(0, Math.min(200, Number(e.target.value) || 0)))
              }
              className="mt-1 block w-24 rounded-lg border border-zinc-300 px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-900"
            />
          </div>

          {canInstall && (
            <button
              type="button"
              onClick={async () => {
                await deferredInstall?.prompt();
                deferredInstall = null;
                setCanInstall(false);
              }}
              className="rounded-lg border border-accent px-4 py-2 text-sm font-semibold text-accent hover:bg-accent-tint dark:border-accent-dark dark:text-accent-dark dark:hover:bg-accent/15"
            >
              Install CoreForge as an app
            </button>
          )}
        </div>
      </Card>

      <Card title="Test behaviour">
        <div className="mt-3 space-y-4">
          <fieldset>
            <legend className="text-sm font-medium">Equation answering</legend>
            <div className="mt-1.5 flex gap-1.5">
              {(
                [
                  ['choice', 'Choice (exam-faithful)'],
                  ['entry', 'Entry (harder practice)'],
                ] as const
              ).map(([value, label]) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => settings.set('equationAskMode', value)}
                  aria-pressed={settings.equationAskMode === value}
                  className={`rounded-lg px-3 py-1.5 text-sm font-medium ${
                    settings.equationAskMode === value
                      ? 'bg-accent text-white dark:bg-accent-dark'
                      : 'bg-zinc-100 text-zinc-600 hover:bg-zinc-200 dark:bg-zinc-800 dark:text-zinc-300'
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
          </fieldset>

          <label className="flex items-center gap-2 text-sm font-medium">
            <input
              type="checkbox"
              checked={settings.examNavFree}
              onChange={(e) => settings.set('examNavFree', e.target.checked)}
              className="h-4 w-4 accent-[#A3195B]"
            />
            Allow backwards navigation in exam mode
            <span className="text-xs font-normal text-zinc-500 dark:text-zinc-400">
              (official behaviour unconfirmed — default is forward-only)
            </span>
          </label>

          <label className="flex items-center gap-2 text-sm font-medium">
            <input
              type="checkbox"
              checked={settings.hideTimer}
              onChange={(e) => settings.set('hideTimer', e.target.checked)}
              className="h-4 w-4 accent-[#A3195B]"
            />
            Hide the timer digits
            <span className="text-xs font-normal text-zinc-500 dark:text-zinc-400">
              (time is still enforced)
            </span>
          </label>
        </div>
      </Card>

      <Card title="Your data">
        <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-300">
          Everything lives in this browser — no accounts, no telemetry. Export a JSON backup any time.
        </p>
        <div className="mt-3 flex flex-wrap gap-2">
          <button
            type="button"
            onClick={doExport}
            className="rounded-lg border border-zinc-300 px-4 py-2 text-sm font-semibold hover:bg-zinc-50 dark:border-zinc-700 dark:hover:bg-zinc-800"
          >
            Export history
          </button>
          <button
            type="button"
            onClick={() => fileRef.current?.click()}
            className="rounded-lg border border-zinc-300 px-4 py-2 text-sm font-semibold hover:bg-zinc-50 dark:border-zinc-700 dark:hover:bg-zinc-800"
          >
            Import backup
          </button>
          <input
            ref={fileRef}
            type="file"
            accept="application/json"
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) void doImport(f);
              e.target.value = '';
            }}
          />
          <button
            type="button"
            onClick={() => setConfirmDelete(true)}
            className="rounded-lg border border-error/40 px-4 py-2 text-sm font-semibold text-error hover:bg-error/5"
          >
            Delete all data
          </button>
        </div>
      </Card>

      <ConfirmDialog
        open={confirmDelete}
        title="Delete all local data?"
        body="Sessions, attempts, analytics, and the AI cache are removed from this browser. Export a backup first if you want to keep them. This cannot be undone."
        confirmLabel="Delete everything"
        danger
        onConfirm={() => void doDeleteAll()}
        onCancel={() => setConfirmDelete(false)}
      />
    </section>
  );
}
