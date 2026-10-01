import { useState } from 'react';

const SIZES = {
  sm: 'text-xl',
  md: 'text-[1.75rem]',
  lg: 'text-4xl',
  xl: 'text-5xl sm:text-6xl',
};

interface WordmarkProps {
  size?: keyof typeof SIZES;
  tone?: 'color' | 'white';
  subtitle?: boolean;
}

/**
 * Logotipo tipográfico CUTLAQUE. Si la coordinación proporciona el archivo
 * oficial, puede sustituirse por una imagen sin cambiar el resto de la interfaz.
 */
export function Wordmark({ size = 'md', tone = 'color', subtitle = false }: WordmarkProps) {
  const white = tone === 'white';
  return (
    <span className={`inline-flex flex-col leading-none select-none ${SIZES[size]}`} aria-label="CUTLAQUE, Centro Universitario de Tlaquepaque">
      <span className="font-display font-black tracking-[-0.03em]" aria-hidden="true">
        <span className={white ? 'text-white' : 'text-oliva-600'}>CU</span>
        <span className={white ? 'text-white/90' : 'text-terracota-500'}>TLAQUE</span>
      </span>
      {subtitle && (
        <span
          aria-hidden="true"
          className={`mt-[0.28em] font-display text-[0.215em] font-semibold tracking-[0.2em] whitespace-nowrap uppercase ${white ? 'text-white/80' : 'text-cafe-600'}`}
        >
          Centro Universitario de Tlaquepaque
        </span>
      )}
    </span>
  );
}

/**
 * Escudo de la UdeG. Coloca el archivo oficial en public/brand/escudo-udg.png;
 * mientras no exista, no se muestra nada.
 */
export function UdgSeal({ className = 'h-10' }: { className?: string }) {
  const [missing, setMissing] = useState(false);
  if (missing) return null;
  return <img src="/brand/escudo-udg.png" alt="Escudo de la Universidad de Guadalajara" className={`w-auto ${className}`} onError={() => setMissing(true)} />;
}

/** Marca compacta para barras de navegación */
export function ProductMark({ tone = 'color', label = 'UniAccess' }: { tone?: 'color' | 'white'; label?: string }) {
  const white = tone === 'white';
  return (
    <span className="flex items-center gap-3">
      <Wordmark size="sm" tone={tone} />
      <span className={`hidden h-7 w-px min-[420px]:block ${white ? 'bg-white/30' : 'bg-stone-300'}`} />
      <span className="hidden leading-tight min-[420px]:block">
        <span className={`block font-display text-[0.8125rem] font-bold ${white ? 'text-white' : 'text-stone-900'}`}>{label}</span>
        <span className={`block text-xs font-medium tracking-wide uppercase ${white ? 'text-white/70' : 'text-stone-500'}`}>
          Universidad de Guadalajara
        </span>
      </span>
    </span>
  );
}
