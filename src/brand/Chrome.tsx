import { Link } from 'react-router-dom';
import { ReadingPreferences } from '../ui/ReadingPreferences';
import { UdgSeal, Wordmark } from './Logo';

/** Encabezado institucional sobre el fondo de marca (estilo portal universitario) */
export function SiteHeader({ right }: { right?: React.ReactNode }) {
  return (
    <header className="relative z-10 mx-auto flex w-full max-w-7xl items-center justify-between gap-4 px-5 py-5 sm:px-8">
      <Link to="/" className="rounded-md focus-visible:ring-4 focus-visible:ring-white/40 focus-visible:outline-none">
        <Wordmark size="md" tone="white" subtitle />
      </Link>
      <div className="flex items-center gap-4">
        {right}
        <ReadingPreferences tone="light" />
        <span className="hidden text-right leading-tight text-white sm:block">
          <span className="block font-display text-sm font-bold tracking-wide">UNIVERSIDAD DE</span>
          <span className="block font-display text-lg font-extrabold tracking-wide">GUADALAJARA</span>
        </span>
        <UdgSeal className="h-11 brightness-0 invert" />
      </div>
    </header>
  );
}

export function SiteFooter({ tone = 'light' }: { tone?: 'light' | 'dark' }) {
  const dark = tone === 'dark';
  return (
    <footer className={`relative z-10 border-t ${dark ? 'border-white/15 text-white/70' : 'border-stone-200 bg-surface text-stone-500'}`}>
      <div className="mx-auto flex max-w-7xl flex-col gap-1 px-5 py-5 text-xs sm:flex-row sm:items-center sm:justify-between sm:px-8">
        <span>© {new Date().getFullYear()} Universidad de Guadalajara · Centro Universitario de Tlaquepaque</span>
        <span>UniAccess · Control de acceso universitario</span>
      </div>
    </footer>
  );
}
