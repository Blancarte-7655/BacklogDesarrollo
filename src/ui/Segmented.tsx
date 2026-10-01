import { motion } from 'motion/react';

interface SegmentedOption<T extends string> {
  value: T;
  label: string;
  count?: number;
}

interface SegmentedProps<T extends string> {
  /** Identificador único para animar el indicador */
  id: string;
  options: SegmentedOption<T>[];
  value: T | null;
  onChange: (value: T) => void;
}

export function Segmented<T extends string>({ id, options, value, onChange }: SegmentedProps<T>) {
  return (
    <div className="inline-flex max-w-full overflow-x-auto rounded-lg bg-stone-100 p-1">
      {options.map(option => {
        const active = option.value === value;
        return (
          <button
            key={option.value}
            type="button"
            onClick={() => onChange(option.value)}
            className={`relative rounded-md px-3 py-1.5 text-xs font-medium whitespace-nowrap transition ${active ? 'text-stone-900' : 'text-stone-500 hover:text-stone-800'}`}
          >
            {active && (
              <motion.span
                layoutId={`segmented-${id}`}
                className="absolute inset-0 rounded-md bg-surface shadow-sm ring-1 ring-stone-200"
                transition={{ type: 'spring', stiffness: 420, damping: 34 }}
              />
            )}
            <span className="relative">
              {option.label}
              {option.count !== undefined && <span className={`ml-1.5 ${active ? 'text-verde-700' : 'text-stone-400'}`}>{option.count}</span>}
            </span>
          </button>
        );
      })}
    </div>
  );
}
