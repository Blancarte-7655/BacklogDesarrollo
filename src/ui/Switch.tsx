import { motion } from 'motion/react';

interface SwitchProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
  label: string;
  description?: string;
  compact?: boolean;
}

export function Switch({ checked, onChange, label, description, compact = false }: SwitchProps) {
  const track = (
    <span className={`flex h-6 w-11 shrink-0 items-center rounded-full p-1 transition-colors ${checked ? 'justify-end bg-brand' : 'justify-start bg-stone-300'}`}>
      <motion.span layout transition={{ type: 'spring', stiffness: 500, damping: 32 }} className="size-4 rounded-full bg-white shadow" />
    </span>
  );

  if (compact) {
    return (
      <button type="button" role="switch" aria-checked={checked} aria-label={label} onClick={() => onChange(!checked)}>
        {track}
      </button>
    );
  }

  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      className="flex w-full items-center justify-between gap-4 rounded-lg border border-stone-200 bg-surface px-4 py-3 text-left transition hover:bg-stone-50"
    >
      <span>
        <span className="block text-sm font-medium text-stone-900">{label}</span>
        {description && <span className="block text-xs text-stone-500">{description}</span>}
      </span>
      {track}
    </button>
  );
}
