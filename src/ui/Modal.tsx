import { X } from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';
import { useEffect, type ReactNode } from 'react';
import { createPortal } from 'react-dom';

const SIZES = { sm: 'max-w-md', md: 'max-w-lg', lg: 'max-w-2xl', xl: 'max-w-4xl' };

interface ModalProps {
  open: boolean;
  onClose: () => void;
  title: string;
  description?: ReactNode;
  size?: keyof typeof SIZES;
  /** Evita cerrar con clic fuera o Escape (p. ej. mientras se muestra una contraseña) */
  locked?: boolean;
  children: ReactNode;
}

export function Modal({ open, onClose, title, description, size = 'md', locked = false, children }: ModalProps) {
  useEffect(() => {
    if (!open || locked) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, locked, onClose]);

  useEffect(() => {
    if (!open) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = previous;
    };
  }, [open]);

  return createPortal(
    <AnimatePresence>
      {open && (
        <motion.div
          key="modal"
          className="fixed inset-0 z-50 flex items-end justify-center overflow-y-auto sm:items-center sm:p-6"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          <div className="fixed inset-0 bg-black/55 backdrop-blur-[2px]" onClick={locked ? undefined : onClose} />
          <motion.div
            role="dialog"
            aria-modal="true"
            aria-label={title}
            initial={{ opacity: 0, y: 24, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 16, scale: 0.98 }}
            transition={{ type: 'spring', stiffness: 400, damping: 34 }}
            className={`relative w-full ${SIZES[size]} max-h-[92dvh] overflow-y-auto rounded-t-2xl border border-stone-200 bg-surface shadow-2xl sm:rounded-xl`}
          >
            <div className="brand-stripe h-1 w-full" />
            <div className="flex items-start justify-between gap-4 border-b border-stone-100 px-6 py-4">
              <div className="min-w-0">
                <h2 className="font-display text-lg font-bold text-stone-900">{title}</h2>
                {description && <div className="mt-0.5 text-sm text-stone-500">{description}</div>}
              </div>
              {!locked && (
                <button
                  type="button"
                  onClick={onClose}
                  aria-label="Cerrar"
                  className="-mr-1 rounded-md p-1.5 text-stone-400 transition hover:bg-stone-100 hover:text-stone-700"
                >
                  <X className="size-5" />
                </button>
              )}
            </div>
            {children}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body,
  );
}

export const ModalBody = ({ children, className = '' }: { children: ReactNode; className?: string }) => (
  <div className={`px-6 py-5 ${className}`}>{children}</div>
);

export const ModalFooter = ({ children }: { children: ReactNode }) => (
  <div className="sticky bottom-0 flex flex-wrap justify-end gap-2 border-t border-stone-100 bg-stone-50/90 px-6 py-3 backdrop-blur">{children}</div>
);
