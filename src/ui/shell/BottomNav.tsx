import { NavLink, useLocation } from 'react-router-dom';
import { useSession } from '../../state/sessionStore';
import { useAuth, authBypassed } from '../../cloud/authStore';
import { cloudEnabled } from '../../cloud/supabaseClient';

const tabs = [
  {
    to: '/',
    label: 'Practice',
    icon: (
      <path d="M4 5h16v12H4zM8 21h8" strokeLinecap="round" />
    ),
  },
  {
    to: '/learn',
    label: 'Learn',
    icon: <path d="M12 4L3 8l9 4 9-4-9-4zM7 10v6c0 1 2.5 3 5 3s5-2 5-3v-6" strokeLinejoin="round" />,
  },
  {
    to: '/analytics',
    label: 'Stats',
    icon: <path d="M4 19l5-6 4 3 7-9M4 21h16" strokeLinecap="round" strokeLinejoin="round" />,
  },
  {
    to: '/rankings',
    label: 'Ranks',
    icon: <path d="M5 21V10M12 21V4M19 21v-7" strokeLinecap="round" />,
  },
  {
    to: '/settings',
    label: 'Settings',
    icon: (
      <>
        <circle cx="12" cy="12" r="3" />
        <path d="M12 2v3m0 14v3M2 12h3m14 0h3M5 5l2 2m10 10 2 2M19 5l-2 2M7 17l-2 2" strokeLinecap="round" />
      </>
    ),
  },
];

/** Mobile-first bottom tab bar (hidden on ≥sm, during exams, and signed out). */
export default function BottomNav() {
  const location = useLocation();
  const user = useAuth((s) => s.user);
  const testRunning = useSession((s) => s.session?.state === 'running');
  const signedOut = cloudEnabled && !user && !authBypassed();
  // never compete with the runner's sticky answer footer
  if (signedOut || (testRunning && location.pathname === '/run')) return null;

  return (
    <nav
      aria-label="Primary"
      className="fixed inset-x-0 bottom-0 z-30 flex border-t border-zinc-200 bg-surface/95 backdrop-blur pb-[env(safe-area-inset-bottom)] sm:hidden dark:border-zinc-800 dark:bg-surface-dark-alt/95"
    >
      {tabs.map((t) => (
        <NavLink
          key={t.to}
          to={t.to}
          className={({ isActive }) =>
            `flex min-h-14 flex-1 touch-manipulation flex-col items-center justify-center gap-0.5 text-[11px] font-medium transition-transform duration-150 active:scale-95 motion-reduce:transition-none motion-reduce:active:scale-100 ${
              isActive ? 'text-accent dark:text-accent-bright' : 'text-zinc-500 dark:text-zinc-400'
            }`
          }
        >
          {({ isActive }) => (
            <>
              <svg
                viewBox="0 0 24 24"
                className={`h-5 w-5 transition-transform duration-150 motion-reduce:transition-none ${isActive ? '-translate-y-px scale-110' : ''}`}
                fill="none"
                stroke="currentColor"
                strokeWidth="1.8"
                aria-hidden="true"
              >
                {t.icon}
              </svg>
              {t.label}
            </>
          )}
        </NavLink>
      ))}
    </nav>
  );
}
