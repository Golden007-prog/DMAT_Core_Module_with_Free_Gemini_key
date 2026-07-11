import { useEffect, useRef, useState } from 'react';
import {
  useSettings,
  DEFAULT_MODEL_CHAIN,
  DEFAULT_AI_DAILY_BUDGET,
  RECOMMENDED_MODEL_PREFERENCE,
} from '../../state/settingsStore';
import { PICKER_MODELS, catalogEntry, type ModelEntry } from '../../ai/modelCatalog';
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

  /** Only meaningful once the key test has run — before that, an empty foundModels
   *  means "not checked", not "your key cannot see this". */
  const keyChecked = keyTest === 'ok';
  const unseen = (id: string) => keyChecked && !foundModels.includes(id);

  /** The curated order, minus anything this key cannot actually see.
   *
   *  There is no raw-ListModels fallback behind it any more. The old one took
   *  foundModels.slice(0, 3) when the curated list intersected the key's models
   *  nowhere — but ListModels returns every model advertising generateContent,
   *  which includes the billing-walled ones (gemini-2.5-pro, gemini-3.1-pro-preview)
   *  and the image-output ones (gemini-3-pro-image), none of which can serve this
   *  app's text-in/JSON-out calls on a free key. It offered a one-click chain of
   *  models that 429 or cannot answer at all. Filtering it through the catalogue
   *  instead is a no-op by construction — RECOMMENDED_MODEL_PREFERENCE already IS
   *  every free, text-capable, live model — so when nothing is left, the honest
   *  move is to offer no button (see the guard on recommendedChain.length below)
   *  rather than a chain we know is broken. */
  const recommendedChain = keyChecked
    ? RECOMMENDED_MODEL_PREFERENCE.filter((m) => foundModels.includes(m)).slice(0, 3)
    : DEFAULT_MODEL_CHAIN;

  /** The store rejects an empty chain outright (an empty chain makes generateJson
   *  fail before it sends a request), so the UI never offers a move that would
   *  produce one — removing the last remaining model is disabled, not silently
   *  swallowed. */
  const applyChain = (chain: string[]) => {
    if (chain.length > 0) settings.set('modelChain', chain);
  };

  const addModel = (id: string) => applyChain([...settings.modelChain, id]);
  const removeModel = (id: string) => {
    if (settings.modelChain.length <= 1) return;
    applyChain(settings.modelChain.filter((m) => m !== id));
  };
  const moveModel = (from: number, to: number) => {
    if (to < 0 || to >= settings.modelChain.length) return;
    const next = [...settings.modelChain];
    const [moved] = next.splice(from, 1);
    next.splice(to, 0, moved);
    applyChain(next);
  };

  /** Why a row is not selectable — the whole point of the registry. A billing wall
   *  and a spent free quota both arrive as 429 RESOURCE_EXHAUSTED, so the user can
   *  only learn the difference here. */
  const blockedReason = (m: ModelEntry): string | null => {
    if (m.tier === 'billing') return 'requires billing on your Google Cloud project';
    if (unseen(m.id)) return 'your key cannot see this model';
    return null;
  };

  /** The fact that decides whether a model belongs in a chain at all. */
  const capLabel = (m: ModelEntry | undefined) =>
    m?.freeRequestsPerDay !== undefined ? `${m.freeRequestsPerDay}/day` : null;

  const chainIcon =
    'rounded border border-zinc-300 px-1.5 py-0.5 text-xs leading-none hover:bg-zinc-100 disabled:opacity-30 dark:border-zinc-700 dark:hover:bg-zinc-800';

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

          <p className="mt-4 text-sm font-medium">Model chain (first available wins)</p>
          <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
            Measured on a free key: gemini-3.1-flash-lite answers in under a second and keeps
            answering all day, while gemini-3.5-flash is capped at 20 requests a day — about one
            practice session. So volume leads and quality escalates behind it.
          </p>

          <ol className="mt-2 space-y-1.5">
            {settings.modelChain.map((id, i) => {
              const entry = catalogEntry(id);
              const cap = capLabel(entry);
              const missing = unseen(id);
              return (
                <li
                  key={id}
                  className="flex flex-wrap items-center gap-x-2 gap-y-1 rounded-lg border border-zinc-200 px-2.5 py-2 dark:border-zinc-800"
                >
                  <span className="text-xs font-semibold tabular-nums text-zinc-400">{i + 1}</span>
                  <span className="font-mono text-xs">{id}</span>
                  {cap && (
                    <span className="rounded bg-amber-100 px-1.5 py-0.5 text-[10px] font-semibold text-amber-800 dark:bg-amber-900/40 dark:text-amber-200">
                      {cap}
                    </span>
                  )}
                  {missing && <span className="text-xs text-error">not available for this key</span>}
                  {!entry && (
                    <span className="text-xs text-zinc-500 dark:text-zinc-400">
                      not in the tested catalogue
                    </span>
                  )}
                  <span className="ml-auto flex shrink-0 gap-1">
                    <button
                      type="button"
                      onClick={() => moveModel(i, i - 1)}
                      disabled={i === 0}
                      aria-label={`Move ${id} earlier`}
                      className={chainIcon}
                    >
                      ↑
                    </button>
                    <button
                      type="button"
                      onClick={() => moveModel(i, i + 1)}
                      disabled={i === settings.modelChain.length - 1}
                      aria-label={`Move ${id} later`}
                      className={chainIcon}
                    >
                      ↓
                    </button>
                    <button
                      type="button"
                      onClick={() => removeModel(id)}
                      // the chain can never be emptied — the store rejects it, and
                      // an empty chain makes every AI call fail before it is sent
                      disabled={settings.modelChain.length <= 1}
                      title={
                        settings.modelChain.length <= 1
                          ? 'The chain needs at least one model'
                          : undefined
                      }
                      aria-label={`Remove ${id} from the chain`}
                      className={chainIcon}
                    >
                      ✕
                    </button>
                  </span>
                </li>
              );
            })}
          </ol>

          <p className="mt-3 text-sm font-medium">Add a model</p>
          <ul className="mt-1.5 space-y-1.5">
            {PICKER_MODELS.filter((m) => !settings.modelChain.includes(m.id)).map((m) => {
              const blocked = blockedReason(m);
              const cap = capLabel(m);
              return (
                <li key={m.id}>
                  <button
                    type="button"
                    onClick={() => addModel(m.id)}
                    disabled={blocked !== null}
                    className={`flex w-full flex-wrap items-center gap-x-2 gap-y-1 rounded-lg border px-2.5 py-2 text-left ${
                      blocked
                        ? 'cursor-not-allowed border-zinc-200 opacity-60 dark:border-zinc-800'
                        : 'border-zinc-200 hover:border-accent hover:bg-accent-tint dark:border-zinc-800 dark:hover:border-accent-dark dark:hover:bg-accent/10'
                    }`}
                  >
                    <span className="font-mono text-xs">{m.id}</span>
                    {cap && (
                      <span className="rounded bg-amber-100 px-1.5 py-0.5 text-[10px] font-semibold text-amber-800 dark:bg-amber-900/40 dark:text-amber-200">
                        {cap} on the free tier
                      </span>
                    )}
                    {m.status === 'recommended' && (
                      <span className="rounded bg-success/15 px-1.5 py-0.5 text-[10px] font-semibold text-success">
                        recommended
                      </span>
                    )}
                    <span className="w-full text-xs text-zinc-500 dark:text-zinc-400">
                      {blocked ?? m.note}
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>

          <div className="mt-2 flex flex-wrap gap-3">
            <button
              type="button"
              onClick={() => applyChain(DEFAULT_MODEL_CHAIN)}
              className="text-xs font-medium text-accent hover:underline dark:text-accent-dark"
            >
              Reset to the recommended chain ({DEFAULT_MODEL_CHAIN.join(', ')})
            </button>
            {keyChecked &&
              recommendedChain.length > 0 &&
              recommendedChain.join() !== DEFAULT_MODEL_CHAIN.join() && (
                <button
                  type="button"
                  onClick={() => applyChain(recommendedChain)}
                  className="text-xs font-medium text-accent hover:underline dark:text-accent-dark"
                >
                  Use the best chain your key can see ({recommendedChain.join(', ')})
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
                  settings.set(
                    'aiDailyBudget',
                    Math.max(1, Math.min(200, Number(e.target.value) || DEFAULT_AI_DAILY_BUDGET)),
                  )
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
