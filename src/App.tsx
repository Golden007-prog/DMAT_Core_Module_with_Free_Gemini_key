import { useEffect, useState } from 'react';
import { Routes, Route, Navigate, useLocation, useNavigate } from 'react-router-dom';
import { fullCoreStore } from './state/fullCoreStore';
import ConfirmDialog from './ui/components/ConfirmDialog';
import { useThemeStore, applyThemeClass, watchSystemTheme } from './state/themeStore';
import { sessionStore, useSession } from './state/sessionStore';
import { initTabLock } from './state/tabLock';
import { useAuth, authBypassed } from './cloud/authStore';
import { cloudEnabled } from './cloud/supabaseClient';
import { initCloudSync } from './cloud/sync';
import Landing from './ui/screens/Landing';
import TopBar from './ui/shell/TopBar';
import BottomNav from './ui/shell/BottomNav';
import RouteReset from './ui/shell/RouteReset';
import Footer from './ui/shell/Footer';
import ToastHost from './ui/components/Toast';
import Home from './ui/screens/Home';
import Runner from './ui/screens/Runner';
import Results from './ui/screens/Results';
import Review from './ui/screens/Review';
import Break from './ui/screens/Break';
import History from './ui/screens/History';
import Mistakes from './ui/screens/Mistakes';
import Analytics from './ui/screens/Analytics';
import Rankings from './ui/screens/Rankings';
import Learn from './ui/screens/Learn';
import Settings from './ui/screens/Settings';

/** Everything except /welcome requires an account: direct URL entry included.
 *  Builds without a cloud config stay open (nothing to sign in to). */
function AuthGate({ children }: { children: React.ReactNode }) {
  const user = useAuth((s) => s.user);
  const initializing = useAuth((s) => s.initializing);

  if (!cloudEnabled || authBypassed()) return <>{children}</>;
  if (initializing) {
    return (
      <div className="flex justify-center py-20 text-zinc-400" aria-live="polite">
        Loading…
      </div>
    );
  }
  if (!user) return <Navigate to="/welcome" replace />;
  return <>{children}</>;
}

/** Exam integrity: leaving the runner while an exam is RUNNING (back button,
 *  typed URL, any in-app navigation) raises a blocking choice — return to the
 *  exam, or delete the attempt. There is no third option: an abandoned exam
 *  is never scored, saved, or resumable. */
function ExamLeaveGuard() {
  const location = useLocation();
  const navigate = useNavigate();
  const examRunning = useSession(
    (s) => s.session?.mode === 'exam' && s.session.state === 'running',
  );
  const away = examRunning && location.pathname !== '/run';

  return (
    <ConfirmDialog
      open={away}
      title="Leave the running exam?"
      body="Your exam is still in progress. If you leave now, this attempt is deleted — it will not be scored, saved, or count toward your rankings."
      confirmLabel="Delete my exam"
      cancelLabel="Return to exam"
      danger
      onConfirm={() => {
        void sessionStore.getState().abandon();
        fullCoreStore.getState().reset();
      }}
      onCancel={() => navigate('/run')}
    />
  );
}

export default function App() {
  const theme = useThemeStore((s) => s.theme);
  const readOnly = useSession((s) => s.readOnly);
  const storagePersistent = useSession((s) => s.storagePersistent);
  const navigate = useNavigate();
  const [bootstrapped, setBootstrapped] = useState(false);

  useEffect(() => {
    applyThemeClass(theme);
    return watchSystemTheme(() => applyThemeClass(useThemeStore.getState().theme));
  }, [theme]);

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

  // optional cloud account (Supabase): auth session + background sync
  useEffect(() => {
    useAuth.getState().init();
    initCloudSync();
  }, []);

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
      <RouteReset mainId="main-content" />
      <main
        id="main-content"
        className="mx-auto w-full max-w-[1100px] flex-1 px-4 py-6 pb-24 outline-none sm:px-6 sm:pb-6"
      >
        {bootstrapped && (
          <Routes>
            <Route path="/welcome" element={<Landing />} />
            <Route path="/" element={<AuthGate><Home /></AuthGate>} />
            <Route path="/run" element={<AuthGate><Runner /></AuthGate>} />
            <Route path="/results/:sessionId" element={<AuthGate><Results /></AuthGate>} />
            <Route path="/review/:sessionId" element={<AuthGate><Review /></AuthGate>} />
            <Route path="/break" element={<AuthGate><Break /></AuthGate>} />
            <Route path="/history" element={<AuthGate><History /></AuthGate>} />
            <Route path="/mistakes" element={<AuthGate><Mistakes /></AuthGate>} />
            <Route path="/analytics" element={<AuthGate><Analytics /></AuthGate>} />
            <Route path="/rankings" element={<AuthGate><Rankings /></AuthGate>} />
            <Route path="/learn" element={<AuthGate><Learn /></AuthGate>} />
            <Route path="/settings" element={<AuthGate><Settings /></AuthGate>} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        )}
      </main>
      <Footer />
      <BottomNav />
      <ExamLeaveGuard />
      <ToastHost />
    </div>
  );
}
