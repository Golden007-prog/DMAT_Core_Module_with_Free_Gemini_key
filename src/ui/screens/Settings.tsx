import { useRef, useState } from 'react';
import { useSettings, DEFAULT_MODEL_CHAIN } from '../../state/settingsStore';
import { listAvailableModels } from '../../ai/gemini';
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

export default function Settings() {
  const settings = useSettings();
  const [keyTest, setKeyTest] = useState<'idle' | 'testing' | 'ok' | 'fail'>('idle');
  const [foundModels, setFoundModels] = useState<string[]>([]);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const usage = getUsageToday();

  const testKey = async () => {
    setKeyTest('testing');
    try {
      const models = await listAvailableModels(settings.geminiKey);
      const available = settings.modelChain.filter((m) => models.includes(m));
      setFoundModels(available);
      setKeyTest('ok');
    } catch {
      setFoundModels([]);
      setKeyTest('fail');
    }
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
            Key works.{' '}
            {foundModels.length > 0
              ? `Available from your chain: ${foundModels.join(', ')}.`
              : 'None of the configured chain models were found — check the model names below.'}
          </p>
        )}
        {keyTest === 'fail' && (
          <p className="mt-2 text-sm text-error">Key rejected — double-check it in AI Studio.</p>
        )}
        <p className="mt-3 text-xs text-zinc-500 dark:text-zinc-400">
          The key is stored only in this browser's localStorage and sent only to
          generativelanguage.googleapis.com. Honest note: Google may use free-tier prompts to improve its
          products — don't paste anything private into AI features.
        </p>

        <div className="mt-4 border-t border-zinc-100 pt-4 dark:border-zinc-800">
          <label className="flex items-center gap-2 text-sm font-medium">
            <input
              type="checkbox"
              checked={settings.aiEquationsEnabled}
              onChange={(e) => settings.set('aiEquationsEnabled', e.target.checked)}
              className="h-4 w-4 accent-[#A3195B]"
              disabled={!settings.geminiKey}
            />
            AI-generated equation sets (single-difficulty sets; every system is re-validated locally)
          </label>

          <label className="mt-3 block text-sm font-medium" htmlFor="model-chain">
            Model chain (first available wins)
          </label>
          <input
            id="model-chain"
            type="text"
            value={settings.modelChain.join(', ')}
            onChange={(e) =>
              settings.set(
                'modelChain',
                e.target.value
                  .split(',')
                  .map((s) => s.trim())
                  .filter(Boolean),
              )
            }
            className="mt-1 w-full rounded-lg border border-zinc-300 px-3 py-2 font-mono text-xs dark:border-zinc-700 dark:bg-zinc-900"
          />
          <button
            type="button"
            onClick={() => settings.set('modelChain', DEFAULT_MODEL_CHAIN)}
            className="mt-1 text-xs font-medium text-accent hover:underline dark:text-accent-dark"
          >
            Reset to default chain
          </button>

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
                  {usage} of {settings.aiDailyBudget} calls used today
                </p>
              </div>
            </div>
          </div>
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
