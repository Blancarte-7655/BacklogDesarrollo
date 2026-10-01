import type { LucideIcon } from 'lucide-react';
import { motion } from 'motion/react';
import type { ReactNode } from 'react';
import BlurText from '../components/reactbits/BlurText/BlurText';
import { BrandBackdrop } from './BrandBackdrop';
import { PapelPicado } from './PapelPicado';
import { SiteFooter, SiteHeader } from './Chrome';

interface AuthShellProps {
  portal: 'person' | 'staff';
  badge: string;
  badgeIcon: LucideIcon;
  title: string;
  description: string;
  highlights: Array<{ icon: LucideIcon; text: string }>;
  children: ReactNode;
}

/** Pantalla de acceso con fondo institucional y tarjeta flotante */
export function AuthShell({ portal, badge, badgeIcon: BadgeIcon, title, description, highlights, children }: AuthShellProps) {
  return (
    <div className="relative isolate flex min-h-dvh flex-col">
      <BrandBackdrop variant={portal} />
      <SiteHeader />

      <main className="relative z-10 mx-auto grid w-full max-w-7xl flex-1 items-center gap-10 px-5 pt-4 pb-12 sm:px-8 lg:grid-cols-[1.15fr_1fr] lg:gap-16">
        <div className="hidden text-white lg:block">
          <span className="inline-flex items-center gap-2 rounded-full bg-white/15 px-3 py-1.5 text-xs font-semibold tracking-wide ring-1 ring-white/25 backdrop-blur">
            <BadgeIcon className="size-3.5" />
            {badge}
          </span>
          <BlurText
            text={title}
            delay={70}
            animateBy="words"
            animationFrom={{ filter: 'blur(10px)', opacity: 0, y: 20 }}
            animationTo={[{ filter: 'blur(0px)', opacity: 1, y: 0 }]}
            className="mt-6 max-w-xl font-display text-5xl leading-[1.05] font-extrabold tracking-tight"
          />
          <p className="mt-5 max-w-lg text-lg leading-relaxed text-white/80">{description}</p>
          <ul className="mt-8 space-y-3">
            {highlights.map(({ icon: Icon, text }, index) => (
              <motion.li
                key={text}
                initial={{ opacity: 0, x: -12 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.5 + index * 0.1 }}
                className="flex items-center gap-3 text-sm text-white/90"
              >
                <span className="grid size-8 place-items-center rounded-lg bg-white/15 ring-1 ring-white/20">
                  <Icon className="size-4" />
                </span>
                {text}
              </motion.li>
            ))}
          </ul>
        </div>

        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.55, ease: [0.22, 1, 0.36, 1] }}
          className="mx-auto w-full max-w-md overflow-hidden rounded-2xl bg-surface shadow-2xl shadow-black/25 lg:justify-self-end"
        >
          <PapelPicado size={26} string={false} className="text-stone-400" />
          {children}
        </motion.div>
      </main>

      <SiteFooter tone="dark" />
    </div>
  );
}
