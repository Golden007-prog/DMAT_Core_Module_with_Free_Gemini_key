import { NavLink, useLocation } from 'react-router-dom';
import { useThemeStore } from '../../state/themeStore';

const navItems = [
  { to: '/', label: 'Practice' },
  { to: '/history', label: 'History' },
  { to: '/analytics', label: 'Analytics' },
  { to: '/learn', label: 'Learn' },
  { to: '/settings', label: 'Settings' },
];

export default function TopBar() {
  const { theme, toggle } = useThemeStore();
  const location = useLocation();
  // Distraction-free runner: hide nav while a test is being taken (exam & practice).
  const inRunner = location.pathname === '/run';

  return (
    <header className="border-b border-zinc-200 bg-surface dark:border-zinc-800 dark:bg-surface-dark-alt">
      <div className="mx-auto flex h-14 w-full max-w-[1100px] items-center gap-4 px-4 sm:px-6">
        <NavLink to="/" className="flex items-center gap-2 font-semibold tracking-tight">
          <svg viewBox="0 0 32 32" className="h-7 w-7" aria-hidden="true">
            <rect width="32" height="32" rx="7" fill="#A3195B" />
            <rect x="6" y="6" width="8" height="8" rx="1.5" fill="#fff" />
            <circle cx="22" cy="10" r="4" fill="#F2C230" />
            <path d="M10 18 L14 26 L6 26 Z" fill="#fff" />
            <rect x="18" y="18" width="8" height="8" rx="1.5" fill="none" stroke="#fff" strokeWidth="2" />
          </svg>
          <span>
            CoreForge
            <span className="ml-2 hidden text-sm font-normal text-zinc-500 sm:inline dark:text-zinc-400">
              dMAT Core Practice
            </span>
          </span>
        </NavLink>

        {!inRunner && (
          <nav aria-label="Main" className="ml-auto flex items-center gap-1 overflow-x-auto">
            {navItems.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                className={({ isActive }) =>
                  `rounded-lg px-3 py-1.5 text-sm font-medium transition-colors ${
                    isActive
                      ? 'bg-accent-tint text-accent dark:bg-accent/20 dark:text-accent-dark'
                      : 'text-zinc-600 hover:bg-zinc-100 dark:text-zinc-300 dark:hover:bg-zinc-800'
                  }`
                }
              >
                {item.label}
              </NavLink>
            ))}
          </nav>
        )}

        <button
          type="button"
          onClick={toggle}
          className={`${inRunner ? 'ml-auto' : ''} rounded-lg p-2 text-zinc-500 hover:bg-zinc-100 dark:text-zinc-400 dark:hover:bg-zinc-800`}
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
