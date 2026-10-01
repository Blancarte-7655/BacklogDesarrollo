import { LoaderCircle, TriangleAlert, type LucideIcon } from 'lucide-react';
import { motion } from 'motion/react';
import { useId, type ReactNode } from 'react';
import { Wordmark } from '../brand/Logo';
import BlurText from '../components/reactbits/BlurText/BlurText';
import CountUp from '../components/reactbits/CountUp/CountUp';
import SpotlightCard from '../components/reactbits/SpotlightCard/SpotlightCard';
import { initialsOf } from '../lib/text';
import { Button } from './Button';

/* ---------- Badge ---------- */

const BADGE_TONES = {
  neutral: 'bg-stone-100 text-stone-700 ring-stone-200',
  verde: 'bg-verde-50 text-verde-700 ring-verde-200',
  terracota: 'bg-terracota-50 text-terracota-700 ring-terracota-200',
  amber: 'bg-amber-50 text-amber-800 ring-amber-200',
  red: 'bg-red-50 text-red-700 ring-red-200',
  blue: 'bg-sky-50 text-sky-700 ring-sky-200',
} as const;

export type BadgeTone = keyof typeof BADGE_TONES;

export function Badge({ tone = 'neutral', icon: Icon, children }: { tone?: BadgeTone; icon?: LucideIcon; children: ReactNode }) {
  return (
    <span className={`inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-xs font-medium whitespace-nowrap ring-1 ring-inset ${BADGE_TONES[tone]}`}>
      {Icon && <Icon className="size-3" />}
      {children}
    </span>
  );
}

export const PulseDot = ({ className = 'bg-brand-bright' }: { className?: string }) => (
  <span className="relative flex size-2">
    <span className={`absolute inline-flex size-full animate-ping rounded-full opacity-60 ${className}`} />
    <span className={`relative inline-flex size-2 rounded-full ${className}`} />
  </span>
);

/* ---------- Avatar ---------- */

const AVATAR_TONES = [
  'bg-verde-100 text-verde-800',
  'bg-terracota-100 text-terracota-800',
  'bg-cafe-100 text-cafe-800',
  'bg-lime-100 text-oliva-700',
  'bg-stone-200 text-stone-700',
];

export function Avatar({ name, size = 'md' }: { name: string; size?: 'sm' | 'md' | 'lg' | 'xl' }) {
  let hash = 0;
  for (const char of name) hash = (hash * 31 + char.charCodeAt(0)) >>> 0;
  const sizes = { sm: 'size-7 text-xs', md: 'size-9 text-xs', lg: 'size-12 text-sm', xl: 'size-16 text-lg' };
  return (
    <span className={`grid shrink-0 place-items-center rounded-full font-display font-bold ${AVATAR_TONES[hash % AVATAR_TONES.length]} ${sizes[size]}`}>
      {initialsOf(name)}
    </span>
  );
}

/* ---------- Progreso ---------- */

export function ProgressBar({ value, size = 'sm', className = '' }: { value: number; size?: 'sm' | 'md' | 'lg'; className?: string }) {
  const percent = Math.min(100, Math.max(0, value * 100));
  const heights = { sm: 'h-1.5', md: 'h-2.5', lg: 'h-3.5' };
  return (
    <div
      className={`overflow-hidden rounded-full bg-stone-200/80 ${heights[size]} ${className}`}
      role="progressbar"
      aria-valuenow={Math.round(percent)}
      aria-valuemin={0}
      aria-valuemax={100}
    >
      <motion.div
        className={`h-full rounded-full ${value >= 1 ? 'bg-leaf' : 'bg-linear-to-r from-brand to-brand-bright'}`}
        initial={{ width: 0 }}
        animate={{ width: `${percent}%` }}
        transition={{ duration: 1, ease: [0.22, 1, 0.36, 1] }}
      />
    </div>
  );
}

export function ProgressRing({ value, size = 190, stroke = 14, children }: { value: number; size?: number; stroke?: number; children?: ReactNode }) {
  const gradientId = useId();
  const radius = (size - stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  const ratio = Math.min(1, Math.max(0, value));
  return (
    <div className="relative shrink-0" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <defs>
          <linearGradient id={gradientId} x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#8cc63f" />
            <stop offset="100%" stopColor="#1e6b3a" />
          </linearGradient>
        </defs>
        <circle cx={size / 2} cy={size / 2} r={radius} fill="none" stroke="#e7e5e4" strokeWidth={stroke} />
        <motion.circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={`url(#${gradientId})`}
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={circumference}
          initial={{ strokeDashoffset: circumference }}
          animate={{ strokeDashoffset: circumference * (1 - ratio) }}
          transition={{ duration: 1.3, ease: [0.22, 1, 0.36, 1] }}
        />
      </svg>
      <div className="absolute inset-0 grid place-items-center text-center">{children}</div>
    </div>
  );
}

/* ---------- Tarjetas ---------- */

const STAT_TONES = {
  verde: 'bg-verde-50 text-verde-700',
  terracota: 'bg-terracota-50 text-terracota-600',
  cafe: 'bg-cafe-50 text-cafe-600',
  amber: 'bg-amber-50 text-amber-700',
} as const;

interface StatCardProps {
  icon: LucideIcon;
  label: string;
  value: number;
  suffix?: string;
  hint?: ReactNode;
  tone?: keyof typeof STAT_TONES;
}

export function StatCard({ icon: Icon, label, value, suffix, hint, tone = 'verde' }: StatCardProps) {
  return (
    <SpotlightCard className="p-5" spotlightColor="rgba(30, 107, 58, 0.07)">
      <div className="flex items-start justify-between gap-3">
        <p className="text-[0.8125rem] font-medium text-stone-500">{label}</p>
        <span className={`grid size-9 place-items-center rounded-lg ${STAT_TONES[tone]}`}>
          <Icon className="size-[18px]" />
        </span>
      </div>
      <p className="mt-2 font-display text-[1.75rem] leading-tight font-bold text-stone-900">
        <CountUp to={value} duration={1.1} separator="," />
        {suffix && <span className="ml-1 text-base font-semibold text-stone-400">{suffix}</span>}
      </p>
      {hint && <div className="mt-1 text-xs text-stone-500">{hint}</div>}
    </SpotlightCard>
  );
}

interface SectionCardProps {
  title?: string;
  description?: ReactNode;
  icon?: LucideIcon;
  action?: ReactNode;
  className?: string;
  bodyClassName?: string;
  children: ReactNode;
}

export function SectionCard({ title, description, icon: Icon, action, className = '', bodyClassName = '', children }: SectionCardProps) {
  return (
    <section className={`card overflow-hidden ${className}`}>
      {title && (
        <header className="flex items-center justify-between gap-3 border-b border-stone-100 px-5 py-3.5">
          <div className="flex min-w-0 items-center gap-2.5">
            {Icon && (
              <span className="grid size-8 shrink-0 place-items-center rounded-lg bg-verde-50 text-verde-700">
                <Icon className="size-4" />
              </span>
            )}
            <div className="min-w-0">
              <h2 className="truncate font-display text-[0.9375rem] font-bold text-stone-900">{title}</h2>
              {description && <p className="truncate text-xs text-stone-500">{description}</p>}
            </div>
          </div>
          {action}
        </header>
      )}
      <div className={bodyClassName}>{children}</div>
    </section>
  );
}

/* ---------- Encabezado de página ---------- */

export function PageHeader({ eyebrow, title, description, actions }: { eyebrow?: string; title: string; description?: ReactNode; actions?: ReactNode }) {
  return (
    <div className="mb-6 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
      <div className="min-w-0">
        {eyebrow && <p className="eyebrow text-terracota-600">{eyebrow}</p>}
        <BlurText
          key={title}
          text={title}
          delay={45}
          animateBy="words"
          animationFrom={{ filter: 'blur(6px)', opacity: 0, y: -8 }}
          animationTo={[{ filter: 'blur(0px)', opacity: 1, y: 0 }]}
          className="mt-1 font-display text-2xl font-extrabold tracking-tight text-stone-900 sm:text-[1.75rem]"
        />
        {description && <div className="mt-1 text-sm text-stone-500">{description}</div>}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
    </div>
  );
}

/* ---------- Estados ---------- */

export function FullPageLoader({ label = 'Cargando…' }: { label?: string }) {
  return (
    <div className="grid min-h-dvh place-items-center bg-page">
      <div className="flex flex-col items-center gap-5">
        <Wordmark size="md" subtitle />
        <div className="h-1 w-44 overflow-hidden rounded-full bg-stone-200">
          <div className="h-full w-1/3 animate-loader rounded-full bg-brand" />
        </div>
        <p className="text-xs text-stone-500">{label}</p>
      </div>
    </div>
  );
}

export function PageLoader() {
  return (
    <div className="grid min-h-[40vh] place-items-center">
      <LoaderCircle className="size-6 animate-spin text-verde-600" />
    </div>
  );
}

export function ErrorState({ message, onRetry }: { message: string; onRetry?: () => unknown }) {
  return (
    <div className="card mx-auto max-w-md p-8 text-center">
      <TriangleAlert className="mx-auto size-8 text-terracota-500" />
      <p className="mt-3 text-sm text-stone-600">{message}</p>
      {onRetry && (
        <Button className="mt-5" onClick={() => void onRetry()}>
          Reintentar
        </Button>
      )}
    </div>
  );
}

export function EmptyState({ icon: Icon, title, description, action }: { icon: LucideIcon; title: string; description: string; action?: ReactNode }) {
  return (
    <div className="flex flex-col items-center px-6 py-14 text-center">
      <span className="grid size-14 place-items-center rounded-2xl bg-verde-50 text-verde-700 ring-8 ring-verde-50/50">
        <Icon className="size-6" />
      </span>
      <h3 className="mt-5 font-display text-lg font-bold text-stone-900">{title}</h3>
      <p className="mt-1.5 max-w-md text-sm text-stone-500">{description}</p>
      {action && <div className="mt-6">{action}</div>}
    </div>
  );
}
