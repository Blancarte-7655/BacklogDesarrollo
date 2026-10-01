import { LoaderCircle } from 'lucide-react';
import type { ButtonHTMLAttributes, ReactNode } from 'react';

export type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger' | 'accent';
type Size = 'sm' | 'md' | 'lg';

const VARIANTS: Record<ButtonVariant, string> = {
  primary: 'bg-brand text-white shadow-sm shadow-brand-strong/15 hover:bg-brand-strong focus-visible:ring-brand/30',
  secondary: 'border border-stone-300 bg-surface text-stone-700 shadow-sm hover:border-stone-400 hover:bg-stone-50 focus-visible:ring-stone-400/30',
  ghost: 'text-stone-600 hover:bg-stone-100 hover:text-stone-900 focus-visible:ring-stone-400/30',
  danger: 'border border-red-200 bg-surface text-red-700 hover:bg-red-50 focus-visible:ring-danger/25',
  accent: 'bg-accent text-white shadow-sm shadow-accent-strong/15 hover:bg-accent-strong focus-visible:ring-accent/30',
};

const SIZES: Record<Size, string> = {
  sm: 'h-8 gap-1.5 rounded-md px-3 text-xs',
  md: 'h-10 gap-2 rounded-lg px-4 text-sm',
  lg: 'h-12 gap-2 rounded-lg px-6 text-[0.9375rem]',
};

/** Clases de botón reutilizables también en <Link> */
export const buttonStyles = (variant: ButtonVariant = 'secondary', size: Size = 'md', className = '') =>
  `inline-flex shrink-0 items-center justify-center font-medium whitespace-nowrap transition outline-none focus-visible:ring-4 active:scale-[.98] disabled:pointer-events-none disabled:opacity-50 ${VARIANTS[variant]} ${SIZES[size]} ${className}`;

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: Size;
  loading?: boolean;
  icon?: ReactNode;
}

export function Button({ variant = 'secondary', size = 'md', loading = false, icon, className = '', disabled, type = 'button', children, ...rest }: ButtonProps) {
  return (
    <button type={type} disabled={disabled || loading} className={buttonStyles(variant, size, className)} {...rest}>
      {loading ? <LoaderCircle className="size-4 animate-spin" /> : icon}
      {children}
    </button>
  );
}
