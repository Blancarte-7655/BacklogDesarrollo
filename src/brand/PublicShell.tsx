import type { ReactNode } from 'react';
import { BrandBackdrop } from './BrandBackdrop';
import { SiteFooter, SiteHeader } from './Chrome';

interface PublicShellProps {
  eyebrow: string;
  title: string;
  description?: ReactNode;
  children: ReactNode;
  width?: 'narrow' | 'wide';
}

/** Páginas públicas (aviso de privacidad, manual, invitación): banda institucional y contenido en tarjeta */
export function PublicShell({ eyebrow, title, description, children, width = 'wide' }: PublicShellProps) {
  return (
    <div className="flex min-h-dvh flex-col bg-page">
      <section className="no-print relative isolate overflow-hidden">
        <BrandBackdrop />
        <SiteHeader />
        <div className={`mx-auto px-5 pt-4 pb-24 text-white sm:px-8 ${width === 'narrow' ? 'max-w-2xl' : 'max-w-5xl'}`}>
          <p className="eyebrow text-white/80">{eyebrow}</p>
          <h1 className="mt-2 font-display text-3xl font-extrabold tracking-tight sm:text-4xl">{title}</h1>
          {description && <div className="mt-2 max-w-2xl text-sm text-white/80 sm:text-base">{description}</div>}
        </div>
      </section>
      <main id="contenido" className={`relative z-10 mx-auto -mt-16 w-full flex-1 px-4 pb-16 sm:px-8 ${width === 'narrow' ? 'max-w-2xl' : 'max-w-5xl'}`}>
        {children}
      </main>
      <SiteFooter />
    </div>
  );
}
