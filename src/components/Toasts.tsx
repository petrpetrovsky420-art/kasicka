import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';

type ToastAction = { label: string; onAction: () => void };
type ToastTone = 'default' | 'error';
type Toast = { id: number; message: string; action?: ToastAction; tone: ToastTone };
export type ShowToast = (message: string, options?: { action?: ToastAction; tone?: ToastTone }) => void;

type ToastState = {
  toasts: Toast[];
  dismiss: (id: number) => void;
  topViewport: number | null;
  register: (id: number) => () => void;
};

const ShowContext = createContext<ShowToast>(() => undefined);
const StateContext = createContext<ToastState | null>(null);

let viewportSeq = 0;

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [stack, setStack] = useState<number[]>([]);
  const nextId = useRef(1);
  const timers = useRef(new Map<number, number>());

  const dismiss = useCallback((id: number) => {
    setToasts((list) => list.filter((t) => t.id !== id));
    const timer = timers.current.get(id);
    if (timer !== undefined) {
      window.clearTimeout(timer);
      timers.current.delete(id);
    }
  }, []);

  const show = useCallback<ShowToast>(
    (message, options = {}) => {
      const id = nextId.current++;
      setToasts((list) => [...list.slice(-2), { id, message, action: options.action, tone: options.tone ?? 'default' }]);
      timers.current.set(
        id,
        window.setTimeout(() => dismiss(id), options.action ? 7000 : options.tone === 'error' ? 8000 : 3500),
      );
    },
    [dismiss],
  );

  useEffect(() => {
    const pending = timers.current;
    return () => pending.forEach((timer) => window.clearTimeout(timer));
  }, []);

  const register = useCallback((id: number) => {
    setStack((s) => [...s, id]);
    return () => setStack((s) => s.filter((x) => x !== id));
  }, []);

  const state = useMemo<ToastState>(
    () => ({ toasts, dismiss, register, topViewport: stack.length ? stack[stack.length - 1] : null }),
    [toasts, dismiss, register, stack],
  );

  return (
    <ShowContext.Provider value={show}>
      <StateContext.Provider value={state}>{children}</StateContext.Provider>
    </ShowContext.Provider>
  );
}

export function useToast(): ShowToast {
  return useContext(ShowContext);
}

/**
 * Místo, kde se hlášky vykreslí. Modální <dialog> leží nad celou stránkou a zbytek stránky
 * je pod ním neaktivní, proto má každé modální okno vlastní viewport a hlášky se ukážou
 * v tom nejvyšším (tlačítko „Vrátit“ tak jde stisknout i v otevřeném okně).
 */
export function ToastViewport() {
  const state = useContext(StateContext);
  const [id] = useState(() => ++viewportSeq);
  const register = state?.register;

  useLayoutEffect(() => (register ? register(id) : undefined), [register, id]);

  const visible = state && state.topViewport === id ? state.toasts : [];
  return (
    <div className="toasts" role="status" aria-live="polite">
      {visible.map((toast) => (
        <div key={toast.id} className={`toast${toast.tone === 'error' ? ' toast-error' : ''}`}>
          <span className="toast-message">{toast.message}</span>
          {toast.action && (
            <button
              type="button"
              className="toast-action"
              onClick={() => {
                toast.action?.onAction();
                state?.dismiss(toast.id);
              }}
            >
              {toast.action.label}
            </button>
          )}
          <button type="button" className="toast-close" aria-label="Zavřít hlášku" onClick={() => state?.dismiss(toast.id)}>
            ×
          </button>
        </div>
      ))}
    </div>
  );
}
