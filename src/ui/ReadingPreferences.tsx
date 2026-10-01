import { Accessibility, Monitor, Moon, Pause, Sparkles, Sun, X, type LucideIcon } from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';
import { useEffect, useId, useRef, useState } from 'react';
import { setPreferences, usePreferences, type Preferences } from '../lib/preferences';

interface Choice<T extends string> {
  value: T;
  label: string;
  icon?: LucideIcon;
  sample?: string;
}

const THEMES: Choice<Preferences['theme']>[] = [
  { value: 'system', label: 'Sistema', icon: Monitor },
  { value: 'light', label: 'Claro', icon: Sun },
  { value: 'dark', label: 'Oscuro', icon: Moon },
];

const MOTION: Choice<Preferences['motion']>[] = [
  { value: 'system', label: 'Sistema', icon: Monitor },
  { value: 'reduce', label: 'Reducidas', icon: Pause },
  { value: 'full', label: 'Completas', icon: Sparkles },
];

const TEXT_SIZES: Choice<Preferences['text']>[] = [
  { value: 'md', label: 'Normal', sample: 'text-sm' },
  { value: 'lg', label: 'Grande', sample: 'text-base' },
  { value: 'xl', label: 'Muy grande', sample: 'text-lg' },
];

/** Grupo de opciones con radios reales: se recorre con flechas y lo anuncia el lector de pantalla */
function ChoiceGroup<T extends string>({ legend, name, choices, value, onChange }: { legend: string; name: string; choices: Choice<T>[]; value: T; onChange: (value: T) => void }) {
  return (
    <fieldset>
      <legend className="mb-2 text-sm font-semibold text-stone-800">{legend}</legend>
      <div className="grid grid-cols-3 gap-1.5">
        {choices.map(choice => {
          const checked = choice.value === value;
          return (
            <label
              key={choice.value}
              className={`flex cursor-pointer flex-col items-center gap-1 rounded-xl border px-2 py-2.5 text-center text-xs font-semibold transition has-[:focus-visible]:outline-3 has-[:focus-visible]:outline-verde-500 ${
                checked ? 'border-brand bg-verde-50 text-verde-800' : 'border-stone-200 text-stone-600 hover:border-stone-300 hover:bg-stone-50'
              }`}
            >
              <input type="radio" name={name} value={choice.value} checked={checked} onChange={() => onChange(choice.value)} className="sr-only" />
              {choice.icon && <choice.icon className="size-5" aria-hidden="true" />}
              {choice.sample && (
                <span className={`font-display font-bold ${choice.sample}`} aria-hidden="true">
                  Aa
                </span>
              )}
              {choice.label}
            </label>
          );
        })}
      </div>
    </fieldset>
  );
}

/**
 * Botón de "Preferencias de lectura": tema claro u oscuro, tamaño de texto y animaciones.
 * tone="light" va sobre fondos de color de marca.
 */
export function ReadingPreferences({ tone = 'default' }: { tone?: 'default' | 'light' }) {
  const prefs = usePreferences();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const panelId = useId();

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

  const light = tone === 'light';

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen(value => !value)}
        aria-expanded={open}
        aria-controls={panelId}
        className={`flex h-10 items-center gap-2 rounded-xl px-2.5 text-sm font-semibold transition ${
          light ? 'text-white ring-1 ring-white/30 hover:bg-white/15' : 'text-stone-600 ring-1 ring-stone-200 hover:bg-stone-100 hover:text-stone-900'
        }`}
      >
        <Accessibility className="size-5" aria-hidden="true" />
        <span className="sr-only sm:not-sr-only">Lectura</span>
        <span className="sr-only">: preferencias de tema, tamaño de texto y animaciones</span>
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            id={panelId}
            role="dialog"
            aria-label="Preferencias de lectura"
            initial={{ opacity: 0, y: -6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            transition={{ duration: 0.15 }}
            className="absolute right-0 z-50 mt-2 w-[min(20rem,calc(100vw-2rem))] space-y-5 rounded-2xl border border-stone-200 bg-raised p-4 text-left shadow-2xl shadow-black/20"
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="font-display text-base font-bold text-stone-900">Preferencias de lectura</p>
                <p className="text-xs text-stone-500">Se guardan en este dispositivo.</p>
              </div>
              <button type="button" onClick={() => setOpen(false)} className="rounded-lg p-1 text-stone-500 hover:bg-stone-100" aria-label="Cerrar preferencias">
                <X className="size-4" />
              </button>
            </div>

            <ChoiceGroup legend="Tema" name={`${panelId}-tema`} choices={THEMES} value={prefs.theme} onChange={theme => setPreferences({ theme })} />
            <ChoiceGroup legend="Tamaño de texto" name={`${panelId}-texto`} choices={TEXT_SIZES} value={prefs.text} onChange={text => setPreferences({ text })} />
            <ChoiceGroup legend="Animaciones" name={`${panelId}-movimiento`} choices={MOTION} value={prefs.motion} onChange={motion => setPreferences({ motion })} />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
