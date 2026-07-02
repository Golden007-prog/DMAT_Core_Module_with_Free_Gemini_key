import { useEffect, useState } from 'react';
import { Routes, Route, useNavigate } from 'react-router-dom';
import { useThemeStore, applyThemeClass } from './state/themeStore';
import { sessionStore, useSession } from './state/sessionStore';
import { initTabLock } from './state/tabLock';
import TopBar from './ui/shell/TopBar';
import Footer from './ui/shell/Footer';
import ToastHost from './ui/components/Toast';
import Home from './ui/screens/Home';
import Runner from './ui/screens/Runner';
import Results from './ui/screens/Results';
import Review from './ui/screens/Review';
import Break from './ui/screens/Break';
import History from './ui/screens/History';
import Analytics from './ui/screens/Analytics';
import Learn from './ui/screens/Learn';
import Settings from './ui/screens/Settings';

export default function App() {
  const theme = useThemeStore((s) => s.theme);
  const readOnly = useSession((s) => s.readOnly);
  const storagePersistent = useSession((s) => s.storagePersistent);
  const navigate = useNavigate();
  const [bootstrapped, setBootstrapped] = useState(false);

  useEffect(() => applyThemeClass(theme), [theme]);

  // refresh-resume (§11): a running session survives reloads with its clock intact
  useEffect(() => {
    let cancelled = false;
    void sessionStore
      .getState()
      .resumeIfRunning()
      .then((resumed) => {
        if (cancelled) return;
        setBootstrapped(true);
        if (resumed) {
          const s = sessionStore.getState().session;
          if (s?.state === 'running') navigate('/run', { replace: true });
          else if (s?.state === 'finished') navigate(`/results/${s.id}`, { replace: true });
        }
      });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // two-tab lock (§11): second tab goes read-only
  useEffect(() => initTabLock(() => sessionStore.getState().setReadOnly(true)), []);

  return (
    <div className="flex min-h-screen flex-col">
      <TopBar />
      {readOnly && (
        <div className="bg-warning/15 px-4 py-2 text-center text-sm font-medium text-warning">
          CoreForge is open in another tab — this tab is read-only to protect your running test.
        </div>
      )}
      {!storagePersistent && (
        <div className="bg-zinc-200 px-4 py-2 text-center text-sm text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300">
          History won't persist in this browser mode (storage unavailable). Practice still works fully.
        </div>
      )}
      <main className="mx-auto w-full max-w-[1100px] flex-1 px-4 py-6 sm:px-6">
        {bootstrapped && (
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/run" element={<Runner />} />
            <Route path="/results/:sessionId" element={<Results />} />
            <Route path="/review/:sessionId" element={<Review />} />
            <Route path="/break" element={<Break />} />
            <Route path="/history" element={<History />} />
            <Route path="/analytics" element={<Analytics />} />
            <Route path="/learn" element={<Learn />} />
            <Route path="/settings" element={<Settings />} />
          </Routes>
        )}
      </main>
      <Footer />
      <ToastHost />
    </div>
  );
}
