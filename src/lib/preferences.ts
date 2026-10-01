import { useSyncExternalStore } from 'react';

/**
 * Preferencias de lectura de cada persona: tema, tamaño de texto y movimiento.
 * Se guardan en este navegador y se aplican como atributos en <html>
 * (data-theme, data-text, data-motion), que es lo que lee index.css.
 * index.html aplica la versión guardada antes de pintar para evitar parpadeos.
 */

export type ThemePreference = 'system' | 'light' | 'dark';
export type TextSize = 'md' | 'lg' | 'xl';
/** system: lo que diga el sistema operativo · reduce: sin animaciones · full: con animaciones aunque el sistema las reduzca */
export type MotionPreference = 'system' | 'reduce' | 'full';

export interface Preferences {
  theme: ThemePreference;
  text: TextSize;
  motion: MotionPreference;
}

const STORAGE_KEY = 'uniaccess:preferencias';
const DEFAULTS: Preferences = { theme: 'system', text: 'md', motion: 'system' };

function read(): Preferences {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? { ...DEFAULTS, ...(JSON.parse(raw) as Partial<Preferences>) } : DEFAULTS;
  } catch {
    return DEFAULTS;
  }
}

let current = read();
const listeners = new Set<() => void>();
const darkQuery = typeof window !== 'undefined' ? window.matchMedia('(prefers-color-scheme: dark)') : null;

function apply(prefs: Preferences) {
  const root = document.documentElement;
  const dark = prefs.theme === 'dark' || (prefs.theme === 'system' && !!darkQuery?.matches);
  root.dataset.theme = dark ? 'dark' : 'light';
  root.dataset.text = prefs.text;
  root.dataset.motion = prefs.motion;
  document.querySelector('meta[name="theme-color"]')?.setAttribute('content', dark ? '#1b211d' : '#1e6b3a');
}

darkQuery?.addEventListener('change', () => apply(current));

export function setPreferences(patch: Partial<Preferences>) {
  current = { ...current, ...patch };
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(current));
  } catch {
    // Navegación privada: las preferencias duran solo esta visita
  }
  apply(current);
  for (const listener of listeners) listener();
}

const subscribe = (listener: () => void) => {
  listeners.add(listener);
  return () => listeners.delete(listener);
};

export const usePreferences = () => useSyncExternalStore(subscribe, () => current);

/** Aplica las preferencias guardadas al iniciar la aplicación */
export const initPreferences = () => apply(current);
