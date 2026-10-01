import { useId, useState, type ReactNode } from 'react';

/**
 * Gráficas ligeras en HTML (sin librerías): columnas agrupadas y barras horizontales.
 * - Colores: --chart-1 (entradas) y --chart-2 (salidas), validados para daltonismo
 *   en modo claro y oscuro. La segunda serie lleva además un rayado, para no depender del color.
 * - Cada columna se enfoca con teclado y muestra el mismo detalle que al pasar el mouse.
 * - Toda gráfica ofrece sus datos en una tabla.
 */

export interface Series {
  key: string;
  label: string;
}

const SERIES_STYLE = [
  { background: 'var(--chart-1)' },
  {
    background: 'repeating-linear-gradient(135deg, var(--chart-2) 0 4px, color-mix(in oklab, var(--chart-2) 72%, var(--color-surface)) 4px 6px)',
  },
];

const compact = new Intl.NumberFormat('es-MX', { notation: 'compact', maximumFractionDigits: 1 });
const number = new Intl.NumberFormat('es-MX');

/** Marcas redondas del eje: 0, 5, 10… o 0, 50, 100… */
function niceMax(value: number) {
  if (value <= 4) return 4;
  const magnitude = 10 ** Math.floor(Math.log10(value));
  for (const step of [1, 2, 2.5, 5, 10]) {
    const top = Math.ceil(value / (step * magnitude)) * step * magnitude;
    if (top / (step * magnitude) <= 5) return top;
  }
  return value;
}

export function Legend({ series }: { series: Series[] }) {
  if (series.length < 2) return null;
  return (
    <ul className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-stone-600">
      {series.map((item, index) => (
        <li key={item.key} className="flex items-center gap-1.5">
          <span className="size-3 rounded-[3px]" style={SERIES_STYLE[index]} aria-hidden="true" />
          {item.label}
        </li>
      ))}
    </ul>
  );
}

interface ColumnChartProps<T> {
  data: T[];
  series: Series[];
  /** Etiqueta corta bajo cada columna */
  label: (item: T) => string;
  /** Texto completo para el detalle y la tabla */
  title: (item: T) => string;
  value: (item: T, key: string) => number;
  /** Mostrar solo algunas etiquetas del eje X (por ejemplo, cada 3 horas) */
  showLabel?: (item: T, index: number) => boolean;
  /** Resalta una columna (por ejemplo, la hora actual) */
  highlight?: (item: T) => boolean;
  height?: number;
  caption: string;
}

export function ColumnChart<T>({ data, series, label, title, value, showLabel = () => true, highlight, height = 180, caption }: ColumnChartProps<T>) {
  const [active, setActive] = useState<number | null>(null);
  const max = niceMax(Math.max(1, ...data.flatMap(item => series.map(s => value(item, s.key)))));
  const ticks = [0, max / 2, max];

  return (
    <figure className="space-y-3">
      <Legend series={series} />
      <div className="relative mt-6" style={{ height }}>
        {/* Cuadrícula y eje Y */}
        {ticks.map(tick => (
          <div key={tick} className="absolute inset-x-0 flex items-center gap-2" style={{ bottom: `${(tick / max) * 100}%` }} aria-hidden="true">
            <span className="w-7 -translate-y-1/2 text-right text-[0.6875rem] text-stone-500 tabular">{compact.format(tick)}</span>
            <span className="h-px flex-1 -translate-y-1/2 bg-stone-200" />
          </div>
        ))}

        <div className="absolute inset-y-0 right-0 left-9 flex items-end">
          {data.map((item, index) => {
            const isActive = active === index;
            const values = series.map(s => value(item, s.key));
            const summary = `${title(item)}: ${series.map((s, i) => `${number.format(values[i])} ${s.label.toLowerCase()}`).join(', ')}`;
            return (
              <div
                key={index}
                tabIndex={0}
                role="img"
                aria-label={summary}
                onPointerEnter={() => setActive(index)}
                onPointerLeave={() => setActive(current => (current === index ? null : current))}
                onFocus={() => setActive(index)}
                onBlur={() => setActive(null)}
                className={`relative flex h-full min-w-0 flex-1 items-end justify-center gap-[2px] rounded-md px-0.5 outline-offset-0 sm:px-1 ${isActive ? 'bg-stone-100' : ''} ${
                  highlight?.(item) ? 'bg-verde-50/70' : ''
                }`}
              >
                {values.map((v, i) => (
                  <span
                    key={series[i].key}
                    className="block max-w-6 min-w-[3px] flex-1 rounded-t-[4px] transition-[height] duration-500"
                    style={{ height: `${(v / max) * 100}%`, minHeight: v > 0 ? 2 : 0, ...SERIES_STYLE[i] }}
                  />
                ))}

                {isActive && (
                  <div
                    role="presentation"
                    className="pointer-events-none absolute bottom-full left-1/2 z-10 mb-2 w-max max-w-48 -translate-x-1/2 rounded-xl border border-stone-200 bg-raised px-3 py-2 text-left shadow-xl shadow-black/15"
                  >
                    <p className="text-xs font-semibold text-stone-500">{title(item)}</p>
                    {series.map((s, i) => (
                      <p key={s.key} className="flex items-center gap-2 text-sm">
                        <span className="h-0.5 w-3 rounded-full" style={SERIES_STYLE[i]} />
                        <b className="text-stone-900 tabular">{number.format(values[i])}</b>
                        <span className="text-stone-500">{s.label.toLowerCase()}</span>
                      </p>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
      {/* Eje X */}
      <div className="flex pl-9" aria-hidden="true">
        {data.map((item, index) => (
          <span key={index} className="min-w-0 flex-1 truncate text-center text-[0.6875rem] text-stone-500">
            {showLabel(item, index) ? label(item) : ''}
          </span>
        ))}
      </div>
      <DataTable caption={caption} head={['', ...series.map(s => s.label)]} rows={data.map(item => [title(item), ...series.map(s => number.format(value(item, s.key)))])} />
    </figure>
  );
}

interface BarListProps<T> {
  data: T[];
  label: (item: T) => ReactNode;
  value: (item: T) => number;
  caption: string;
  /** Texto del valor; por defecto, el número */
  format?: (item: T) => string;
  empty?: string;
}

/** Barras horizontales con la etiqueta encima y el valor al final */
export function BarList<T>({ data, label, value, caption, format, empty = 'Sin datos en este periodo.' }: BarListProps<T>) {
  const max = Math.max(1, ...data.map(value));
  const total = data.reduce((sum, item) => sum + value(item), 0);
  if (!data.length || total === 0) return <p className="py-6 text-center text-sm text-stone-500">{empty}</p>;
  return (
    <figure>
      <ul className="space-y-3">
        {data.map((item, index) => {
          const v = value(item);
          return (
            <li key={index}>
              <div className="flex items-baseline justify-between gap-3 text-sm">
                <span className="min-w-0 truncate font-medium text-stone-800">{label(item)}</span>
                <span className="shrink-0 text-stone-600 tabular">
                  <b className="text-stone-900">{format ? format(item) : number.format(v)}</b>
                  <span className="ml-1.5 text-xs text-stone-500">{Math.round((v / total) * 100)} %</span>
                </span>
              </div>
              <div className="mt-1.5 h-2.5 rounded-full bg-stone-100" aria-hidden="true">
                <div className="h-full rounded-full transition-[width] duration-500" style={{ width: `${(v / max) * 100}%`, background: 'var(--chart-1)' }} />
              </div>
            </li>
          );
        })}
      </ul>
      <DataTable caption={caption} head={['', 'Total']} rows={data.map(item => [String(label(item)), format ? format(item) : number.format(value(item))])} />
    </figure>
  );
}

/** Tabla con los datos de la gráfica: para lectores de pantalla y para quien prefiera leer números */
function DataTable({ caption, head, rows }: { caption: string; head: string[]; rows: string[][] }) {
  const id = useId();
  return (
    <details className="group mt-3 text-sm">
      <summary className="inline-flex cursor-pointer list-none items-center gap-1 rounded-md text-xs font-semibold text-verde-700 hover:underline">
        <span className="group-open:hidden">Ver datos en tabla</span>
        <span className="hidden group-open:inline">Ocultar tabla</span>
      </summary>
      <div className="mt-2 max-h-64 overflow-auto rounded-xl border border-stone-200 scrollbar-thin">
        <table className="w-full text-left text-xs" aria-describedby={id}>
          <caption id={id} className="sr-only">
            {caption}
          </caption>
          <thead className="sticky top-0 bg-stone-50 text-stone-600">
            <tr>
              {head.map((cell, index) => (
                <th key={index} scope="col" className={`px-3 py-2 font-semibold ${index ? 'text-right' : ''}`}>
                  {cell || 'Periodo'}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-stone-100">
            {rows.map((row, r) => (
              <tr key={r}>
                {row.map((cell, c) =>
                  c === 0 ? (
                    <th key={c} scope="row" className="px-3 py-1.5 font-medium text-stone-700">
                      {cell}
                    </th>
                  ) : (
                    <td key={c} className="px-3 py-1.5 text-right text-stone-800 tabular">
                      {cell}
                    </td>
                  ),
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </details>
  );
}
