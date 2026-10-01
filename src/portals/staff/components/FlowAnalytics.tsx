import { CalendarRange, ChartColumnBig, Clock3, DoorOpen, ShieldX, UsersRound } from 'lucide-react';
import { useState } from 'react';
import type { AccessAnalytics } from '../../../../shared/contracts';
import { ALERT_LABELS } from '../../../../shared/rules';
import { useAsync } from '../../../hooks/useAsync';
import { capitalize, formatDate, formatDuration } from '../../../lib/format';
import { BarList, ColumnChart } from '../../../ui/charts';
import { ErrorState, SectionCard } from '../../../ui/Display';
import { Segmented } from '../../../ui/Segmented';
import { staffApi } from '../api';

const RANGES = [
  { value: '7', label: '7 días' },
  { value: '14', label: '14 días' },
  { value: '30', label: '30 días' },
] as const;

type Range = (typeof RANGES)[number]['value'];

const ENTRY_EXIT = [
  { key: 'entries', label: 'Entradas' },
  { key: 'exits', label: 'Salidas' },
];

const hourLabel = (hour: number) => `${String(hour).padStart(2, '0')}:00`;
const ROLE_PLURAL = { alumno: 'Alumnos', docente: 'Docentes', personal: 'Personal', invitado: 'Invitados' } as const;
const roleLabel = (role: AccessAnalytics['byRole'][number]['role']) => ROLE_PLURAL[role];

/** Gráficas de afluencia: hoy por hora, por día, por rol, por acceso y accesos denegados */
export function FlowAnalytics() {
  const [range, setRange] = useState<Range>('14');
  const days = Number(range);
  const analytics = useAsync(() => staffApi.analytics(days), [days], { pollMs: 60_000 });
  const data = analytics.data;
  const nowHour = new Date().getHours();

  return (
    <section aria-labelledby="afluencia" className="mt-8">
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h2 id="afluencia" className="font-display text-xl font-bold text-stone-900">
            Afluencia
          </h2>
          <p className="text-sm text-stone-500">Cómo se mueve la gente en el campus. Pasa el cursor o enfoca una columna para ver el detalle.</p>
        </div>
        <Segmented id="analytics-range" value={range} onChange={setRange} options={RANGES.map(r => ({ ...r }))} />
      </div>

      {!data ? (
        analytics.loading ? (
          <div className="card h-72 animate-pulse" aria-label="Cargando gráficas" />
        ) : (
          <ErrorState message={analytics.error ?? ''} onRetry={analytics.reload} />
        )
      ) : (
        <div className={`grid gap-5 transition-opacity xl:grid-cols-5 ${analytics.loading ? 'opacity-60' : ''}`}>
          <SectionCard className="xl:col-span-3" title="Hoy, hora por hora" description="Entradas y salidas de 6:00 a 22:00" icon={Clock3} bodyClassName="p-5 pt-10">
            <ColumnChart
              data={data.hourly.slice(6, 23)}
              series={ENTRY_EXIT}
              label={item => String(item.hour)}
              title={item => `De ${hourLabel(item.hour)} a ${hourLabel(item.hour + 1)}`}
              value={(item, key) => item[key as 'entries' | 'exits']}
              showLabel={item => item.hour % 2 === 0}
              highlight={item => item.hour === nowHour}
              caption="Entradas y salidas de hoy por hora"
            />
          </SectionCard>

          <SectionCard className="xl:col-span-2" title="Resumen del periodo" description={`Últimos ${days} días`} icon={ChartColumnBig} bodyClassName="p-5">
            <dl className="grid grid-cols-3 gap-3">
              <Figure label="Entradas" value={data.totalEntries.toLocaleString('es-MX')} />
              <Figure label="Hora pico" value={data.peakHour === null ? '—' : hourLabel(data.peakHour)} />
              <Figure label="Estancia media" value={data.averageMinutes ? formatDuration(data.averageMinutes) : '—'} />
            </dl>
            <h3 className="mt-6 mb-3 flex items-center gap-2 text-sm font-semibold text-stone-700">
              <UsersRound className="size-4 text-stone-400" aria-hidden="true" />
              Entradas por tipo de persona
            </h3>
            <BarList data={data.byRole} label={item => roleLabel(item.role)} value={item => item.entries} caption="Entradas por tipo de persona" />
          </SectionCard>

          <SectionCard className="xl:col-span-3" title="Día por día" description={`Entradas y salidas de los últimos ${days} días`} icon={CalendarRange} bodyClassName="p-5 pt-10">
            <ColumnChart
              data={data.daily}
              series={ENTRY_EXIT}
              label={item => formatDate(item.date, 'short').replace('.', '')}
              title={item => capitalize(formatDate(item.date, 'weekday'))}
              value={(item, key) => item[key as 'entries' | 'exits']}
              showLabel={(_, index) => days <= 7 || index % Math.ceil(days / 7) === (days - 1) % Math.ceil(days / 7)}
              highlight={item => item.date === data.daily.at(-1)?.date}
              caption={`Entradas y salidas por día, últimos ${days} días`}
            />
          </SectionCard>

          <div className="grid gap-5 xl:col-span-2">
            <SectionCard title="Por acceso" description="Entradas por puerta o área" icon={DoorOpen} bodyClassName="p-5">
              <BarList data={data.byAccessPoint} label={item => item.name} value={item => item.entries} caption="Entradas por acceso" />
            </SectionCard>
            <SectionCard title="Intentos denegados" description="Motivo del rechazo" icon={ShieldX} bodyClassName="p-5">
              <BarList
                data={data.denied}
                label={item => ALERT_LABELS[item.type]}
                value={item => item.count}
                caption="Intentos de acceso denegados por motivo"
                empty="Ningún intento denegado en este periodo."
              />
            </SectionCard>
          </div>
        </div>
      )}
    </section>
  );
}

function Figure({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl bg-stone-50 px-3 py-3">
      <dt className="text-xs text-stone-500">{label}</dt>
      <dd className="mt-0.5 font-display text-xl font-bold text-stone-900 tabular">{value}</dd>
    </div>
  );
}
