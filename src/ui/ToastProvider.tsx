import { CircleAlert, CircleCheck, CircleX, Info } from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';
import { useCallback, useMemo, useRef, useState, type ReactNode } from 'react';
import { ToastContext, type ToastKind } from './toast';

interface ToastItem {
  id: number;
  message: string;
  kind: ToastKind;
}

const STYLES: Record<ToastKind, { icon: ReactNode; bar: string }> = {
  success: { icon: <CircleCheck className="size-5 shrink-0 text-verde-600" />, bar: 'bg-brand' },
  error: { icon: <CircleX className="size-5 shrink-0 text-red-600" />, bar: 'bg-danger' },
  warning: { icon: <CircleAlert className="size-5 shrink-0 text-amber-600" />, bar: 'bg-warn' },
  info: { icon: <Info className="size-5 shrink-0 text-sky-600" />, bar: 'bg-info' },
};

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const nextId = useRef(0);

  const notify = useCallback((message: string, kind: ToastKind = 'info') => {
    const id = ++nextId.current;
    setToasts(list => [...list.slice(-3), { id, message, kind }]);
    window.setTimeout(() => setToasts(list => list.filter(t => t.id !== id)), kind === 'error' ? 6500 : 4500);
  }, []);

  const value = useMemo(() => ({ notify }), [notify]);

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div className="pointer-events-none fixed inset-x-0 bottom-0 z-[70] flex flex-col items-center gap-2 p-4 sm:items-end print:hidden">
        <AnimatePresence initial={false}>
          {toasts.map(toast => (
            <motion.div
              key={toast.id}
              layout
              initial={{ opacity: 0, y: 16, scale: 0.97 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, scale: 0.97, transition: { duration: 0.15 } }}
              role="status"
              className="pointer-events-auto relative flex w-full max-w-sm items-start gap-3 overflow-hidden rounded-lg border border-stone-200 bg-surface py-3 pr-4 pl-5 text-sm text-stone-700 shadow-lg"
            >
              <span className={`absolute inset-y-0 left-0 w-1 ${STYLES[toast.kind].bar}`} />
              {STYLES[toast.kind].icon}
              <span className="pt-0.5">{toast.message}</span>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </ToastContext.Provider>
  );
}
