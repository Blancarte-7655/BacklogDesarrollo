import { ChevronDown, LogOut, type LucideIcon } from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';
import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { Avatar } from './Display';

interface UserMenuProps {
  name: string;
  detail: string;
  role?: string;
  links?: Array<{ to: string; label: string; icon: LucideIcon }>;
  onSignOut: () => void;
}

export function UserMenu({ name, detail, role, links = [], onSignOut }: UserMenuProps) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onPointer = (event: MouseEvent) => {
      if (!ref.current?.contains(event.target as Node)) setOpen(false);
    };
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpen(false);
    };
    document.addEventListener('mousedown', onPointer);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onPointer);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen(value => !value)}
        aria-expanded={open}
        className="flex items-center gap-2 rounded-lg p-1 pr-2 transition hover:bg-stone-100"
      >
        <Avatar name={name} size="sm" />
        <span className="hidden max-w-44 text-left leading-tight sm:block">
          <span className="block truncate text-sm font-semibold text-stone-800">{name}</span>
          {role && <span className="block truncate text-xs text-stone-500">{role}</span>}
        </span>
        <ChevronDown className={`size-4 text-stone-400 transition ${open ? 'rotate-180' : ''}`} />
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -6, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -6, scale: 0.98 }}
            transition={{ duration: 0.15 }}
            className="absolute right-0 z-40 mt-2 w-72 origin-top-right overflow-hidden rounded-xl border border-stone-200 bg-surface shadow-xl"
          >
            <div className="flex items-center gap-3 border-b border-stone-100 px-4 py-3">
              <Avatar name={name} size="md" />
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold text-stone-900">{name}</p>
                <p className="truncate text-xs text-stone-500">{detail}</p>
              </div>
            </div>
            <div className="p-1.5">
              {links.map(link => (
                <Link
                  key={link.to}
                  to={link.to}
                  onClick={() => setOpen(false)}
                  className="flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm text-stone-700 transition hover:bg-stone-100"
                >
                  <link.icon className="size-4 text-stone-400" />
                  {link.label}
                </Link>
              ))}
              <button
                type="button"
                onClick={onSignOut}
                className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-sm text-red-700 transition hover:bg-red-50"
              >
                <LogOut className="size-4" />
                Cerrar sesión
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
