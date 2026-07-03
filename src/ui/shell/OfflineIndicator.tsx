import { useEffect, useState } from 'react';
import { toast } from '../components/Toast';

/** Small connectivity dot; the app itself keeps working offline (PWA). */
export default function OfflineIndicator() {
  const [online, setOnline] = useState(() => navigator.onLine !== false);
  useEffect(() => {
    const up = () => {
      setOnline(true);
      toast('Back online — sync resumes automatically.', 'success');
    };
    const down = () => {
      setOnline(false);
      toast('You are offline. Practice keeps working; sync waits.', 'info');
    };
    window.addEventListener('online', up);
    window.addEventListener('offline', down);
    return () => {
      window.removeEventListener('online', up);
      window.removeEventListener('offline', down);
    };
  }, []);
  if (online) return null;
  return (
    <span
      className="flex items-center gap-1.5 rounded-full bg-zinc-100 px-2 py-0.5 text-xs font-medium text-zinc-500 dark:bg-zinc-800 dark:text-zinc-400"
      title="Offline — practice works, cloud sync resumes when you reconnect"
    >
      <span className="h-2 w-2 rounded-full bg-warning" aria-hidden="true" />
      Offline
    </span>
  );
}
