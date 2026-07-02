import { create } from 'zustand';

interface ToastItem {
  id: number;
  message: string;
  kind: 'info' | 'success' | 'error';
}

interface ToastState {
  toasts: ToastItem[];
  push(message: string, kind?: ToastItem['kind']): void;
  dismiss(id: number): void;
}

let nextToastId = 1;

export const useToasts = create<ToastState>()((set, get) => ({
  toasts: [],
  push(message, kind = 'info') {
    const id = nextToastId++;
    set({ toasts: [...get().toasts, { id, message, kind }] });
    setTimeout(() => get().dismiss(id), 5000);
  },
  dismiss(id) {
    set({ toasts: get().toasts.filter((t) => t.id !== id) });
  },
}));

export function toast(message: string, kind: ToastItem['kind'] = 'info') {
  useToasts.getState().push(message, kind);
}

export default function ToastHost() {
  const { toasts, dismiss } = useToasts();
  if (toasts.length === 0) return null;
  return (
    <div className="pointer-events-none fixed bottom-4 left-1/2 z-50 flex w-full max-w-sm -translate-x-1/2 flex-col gap-2 px-4" role="status" aria-live="polite">
      {toasts.map((t) => (
        <button
          key={t.id}
          type="button"
          onClick={() => dismiss(t.id)}
          className={`pointer-events-auto rounded-lg px-4 py-2.5 text-left text-sm font-medium text-white shadow-card-lift ${
            t.kind === 'error' ? 'bg-error' : t.kind === 'success' ? 'bg-success' : 'bg-ink dark:bg-zinc-700'
          }`}
        >
          {t.message}
        </button>
      ))}
    </div>
  );
}
