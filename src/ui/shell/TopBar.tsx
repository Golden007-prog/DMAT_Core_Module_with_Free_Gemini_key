import { NavLink, useLocation } from 'react-router-dom';
import { useThemeStore, resolvedTheme } from '../../state/themeStore';
import { useSession } from '../../state/sessionStore';
import { useAuth, authBypassed } from '../../cloud/authStore';
import { cloudEnabled } from '../../cloud/supabaseClient';
import OfflineIndicator from './OfflineIndicator';

const navItems = [
  { to: '/', label: 'Core Module', short: 'Core' },
  { to: '/gam', label: 'GAM', short: 'GAM' },
  { to: '/rankings', label: 'Rankings', short: 'Ranks' },
  { to: '/history', label: 'History', short: 'History' },
  { to: '/analytics', label: 'Analytics', short: 'Stats' },
  { to: '/learn', label: 'Learn', short: 'Learn' },
  { to: '/settings', label: 'Settings', short: 'Settings' },
  { to: '/dmat-info', label: 'dMAT info', short: 'Info' },
];

export default function TopBar() {
  const themeChoice = useThemeStore((s) => s.theme);
  const toggle = useThemeStore((s) => s.toggle);
  const theme = resolvedTheme(themeChoice);
  const location = useLocation();
  const user = useAuth((s) => s.user);
  const examRunning = useSession(
    (s) => s.session?.mode === 'exam' && s.session.state === 'running',
  );
  // Distraction-free exam: nav is hidden while an exam is being taken (§8).
  // Signed-out visitors only see the landing page — no nav to show.
  const inRunner = location.pathname === '/run' && examRunning;
  const signedOut = cloudEnabled && !user && !authBypassed();

  return (
    <header className="border-b border-zinc-200 bg-surface dark:border-zinc-800 dark:bg-surface-dark-alt">
      <div className="mx-auto flex h-14 w-full max-w-[1100px] items-center gap-4 px-4 sm:px-6">
        <NavLink
          to="/"
          className="flex items-center gap-2 font-semibold tracking-tight"
          aria-label="CoreForge home"
        >
          <svg viewBox="0 0 32 32" className="h-7 w-7" aria-hidden="true">
            <rect width="32" height="32" rx="7" fill="#A3195B" />
            <rect x="6" y="6" width="8" height="8" rx="1.5" fill="#fff" />
            <circle cx="22" cy="10" r="4" fill="#F2C230" />
            <path d="M10 18 L14 26 L6 26 Z" fill="#fff" />
            <rect x="18" y="18" width="8" height="8" rx="1.5" fill="none" stroke="#fff" strokeWidth="2" />
          </svg>
          <span className="hidden sm:inline">
            CoreForge
            <span className="ml-2 hidden text-sm font-normal text-zinc-500 md:inline dark:text-zinc-400">
              dMAT Practice
            </span>
          </span>
        </NavLink>

        {!inRunner && !signedOut && (
          <nav aria-label="Main" className="ml-auto hidden items-center gap-0.5 overflow-x-auto sm:flex sm:gap-1">
            {navItems.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                className={({ isActive }) =>
                  `rounded-lg px-1 py-1.5 text-xs font-medium transition-colors sm:px-3 sm:text-sm ${
                    isActive
                      ? 'bg-accent-tint text-accent dark:bg-accent/20 dark:text-accent-bright'
                      : 'text-zinc-600 hover:bg-zinc-100 dark:text-zinc-300 dark:hover:bg-zinc-800'
                  }`
                }
              >
                <span className="sm:hidden">{item.short}</span>
                <span className="hidden sm:inline">{item.label}</span>
              </NavLink>
            ))}
          </nav>
        )}

        {/* pushes the right cluster over whenever the desktop nav is absent
            (always on mobile — the nav lives in the bottom bar there) */}
        <span className={`ml-auto ${!inRunner && !signedOut ? 'sm:ml-0' : ''}`} aria-hidden="true" />
        <OfflineIndicator />
        {!inRunner && user && (
          <NavLink
            to="/settings"
            className="ml-1 flex items-center"
            title={`${user.displayName ?? user.email ?? 'Account'} — account & sync`}
            aria-label="Account settings"
          >
            {user.avatarUrl ? (
              <img src={user.avatarUrl} alt="" className="h-7 w-7 rounded-full" referrerPolicy="no-referrer" />
            ) : (
              <span className="flex h-7 w-7 items-center justify-center rounded-full bg-accent text-xs font-bold text-white">
                {(user.displayName ?? user.email ?? '?')[0]?.toUpperCase()}
              </span>
            )}
          </NavLink>
        )}
        <button
          type="button"
          onClick={toggle}
          className="rounded-lg p-2 text-zinc-500 hover:bg-zinc-100 dark:text-zinc-400 dark:hover:bg-zinc-800"
          aria-label={theme === 'dark' ? 'Switch to light theme' : 'Switch to dark theme'}
          title={theme === 'dark' ? 'Light theme' : 'Dark theme'}
        >
          {theme === 'dark' ? (
            <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
              <circle cx="12" cy="12" r="4" />
              <path d="M12 2v2m0 16v2M4.9 4.9l1.4 1.4m11.4 11.4 1.4 1.4M2 12h2m16 0h2M4.9 19.1l1.4-1.4m11.4-11.4 1.4-1.4" />
            </svg>
          ) : (
            <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
              <path d="M21 12.8A9 9 0 1 1 11.2 3 7 7 0 0 0 21 12.8Z" />
            </svg>
          )}
        </button>
      </div>
    </header>
  );
}
