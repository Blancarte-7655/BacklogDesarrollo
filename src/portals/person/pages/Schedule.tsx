import { CalendarClock, Clock, MapPin, UserRound } from 'lucide-react';
import { useState } from 'react';
import type { ClassSession } from '../../../../shared/contracts';
import { isoWeekday, timeToMinutes, WEEKDAY_LABELS } from '../../../../shared/campus';
import { useAsync } from '../../../hooks/useAsync';
import { formatDuration, shortTime } from '../../../lib/format';
import { Badge, EmptyState, ErrorState, PageHeader, PageLoader, PulseDot, SectionCard } from '../../../ui/Display';
import { personApi } from '../api';
import { classTone } from '../components/classTone';

const DAYS = [1, 2, 3, 4, 5, 6];
const sameClass = (a: ClassSession | null, b: ClassSession) => !!a && a.weekday === b.weekday && a.start === b.start && a.subject === b.subject;

export default function Schedule() {
  const { data, error, reload } = useAsync(() => personApi.schedule(), [], { pollMs: 60_000 });
  const today = isoWeekday(new Date());
  const [day, setDay] = useState(today > 5 ? 1 : today);

  if (!data) return error ? <ErrorState message={error} onRetry={reload} /> : <PageLoader />;

  const days = DAYS.filter(d => d <= 5 || data.classes.some(c => c.weekday === d));
  const first = Math.min(7 * 60, ...data.classes.map(c => timeToMinutes(c.start)));
  const last = Math.max(15 * 60, ...data.classes.map(c => timeToMinutes(c.end)));
  const startHour = Math.floor(first / 60);
  const hours = Array.from({ length: Math.ceil(last / 60) - startHour }, (_, i) => startHour + i);
  const ROW = 56; // px por hora

  return (
    <>
      <PageHeader
        eyebrow="Ciclo 2026-B"
        title="Mi horario"
        description={data.classes[0] ? `Grupo ${data.classes[0].group}` : undefined}
        actions={data.isDemo && <Badge tone="amber">Horario de demostración</Badge>}
      />

      {data.isDemo && (
        <p className="mb-5 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          Este horario es ficticio. Cuando UniAccess se conecte con Control Escolar se mostrará tu carga académica real.
        </p>
      )}

      {!data.classes.length ? (
        <div className="card">
          <EmptyState icon={CalendarClock} title="Sin horario" description="Tu tipo de cuenta no tiene clases asignadas." />
        </div>
      ) : (
        <>
          <div className="mb-5 grid gap-3 sm:grid-cols-2">
            <NowCard label="Ahora" lesson={data.current} empty="No tienes clase en este momento." highlight />
            <NowCard
              label={data.next ? `Siguiente · ${data.next.weekday === today ? `en ${formatDuration(data.next.startsInMinutes)}` : WEEKDAY_LABELS[data.next.weekday]}` : 'Siguiente'}
              lesson={data.next}
              empty="No hay más clases esta semana."
            />
          </div>

          {/* Celular: un día a la vez */}
          <div className="md:hidden">
            <div className="mb-3 grid grid-cols-5 gap-1.5" role="tablist" aria-label="Día">
              {days.map(d => (
                <button
                  key={d}
                  type="button"
                  role="tab"
                  aria-selected={d === day}
                  onClick={() => setDay(d)}
                  className={`rounded-lg py-2 text-sm font-semibold transition ${d === day ? 'bg-brand text-white' : 'bg-surface text-stone-600 ring-1 ring-stone-200'}`}
                >
                  {WEEKDAY_LABELS[d].slice(0, 3)}
                  {d === today && <span className="mx-auto mt-0.5 block size-1 rounded-full bg-current" />}
                </button>
              ))}
            </div>
            <div className="space-y-2.5">
              {data.classes.filter(c => c.weekday === day).map(lesson => (
                <ClassCard key={`${lesson.weekday}-${lesson.start}`} lesson={lesson} current={sameClass(data.current, lesson)} />
              ))}
              {!data.classes.some(c => c.weekday === day) && <p className="card px-5 py-8 text-center text-sm text-stone-500">Sin clases este día.</p>}
            </div>
          </div>

          {/* Escritorio: semana completa */}
          <SectionCard className="hidden md:block" title="Semana" icon={CalendarClock} bodyClassName="overflow-x-auto p-4">
            <div className="grid min-w-[720px]" style={{ gridTemplateColumns: `3.5rem repeat(${days.length}, minmax(0, 1fr))` }}>
              <div />
              {days.map(d => (
                <p key={d} className={`pb-2 text-center text-sm font-semibold ${d === today ? 'text-verde-700' : 'text-stone-600'}`}>
                  {WEEKDAY_LABELS[d]}
                </p>
              ))}
              <div className="relative" style={{ height: hours.length * ROW }}>
                {hours.map((h, i) => (
                  <span key={h} className="absolute right-2 -translate-y-1/2 text-xs text-stone-400" style={{ top: i * ROW }}>
                    {h}:00
                  </span>
                ))}
              </div>
              {days.map(d => (
                <div key={d} className={`relative border-l border-stone-100 ${d === today ? 'bg-verde-50/40' : ''}`} style={{ height: hours.length * ROW }}>
                  {hours.map((h, i) => (
                    <span key={h} className="absolute inset-x-0 border-t border-dashed border-stone-100" style={{ top: i * ROW }} />
                  ))}
                  {data.classes.filter(c => c.weekday === d).map(lesson => {
                    const top = ((timeToMinutes(lesson.start) - startHour * 60) / 60) * ROW;
                    const height = ((timeToMinutes(lesson.end) - timeToMinutes(lesson.start)) / 60) * ROW;
                    const current = sameClass(data.current, lesson);
                    return (
                      <div
                        key={lesson.start}
                        className={`absolute inset-x-1 overflow-hidden rounded-lg p-2 text-xs ring-1 ring-inset ${classTone(lesson.subject)} ${current ? 'ring-2 ring-brand' : ''}`}
                        style={{ top: top + 2, height: height - 4 }}
                        title={`${lesson.subject} · ${lesson.room} · ${lesson.teacher}`}
                      >
                        <p className="leading-tight font-bold">{lesson.subject}</p>
                        <p className="mt-0.5 opacity-80">
                          {shortTime(lesson.start)}–{shortTime(lesson.end)} · {lesson.room}
                        </p>
                      </div>
                    );
                  })}
                </div>
              ))}
            </div>
          </SectionCard>
        </>
      )}
    </>
  );
}

function NowCard({ label, lesson, empty, highlight = false }: { label: string; lesson: ClassSession | null; empty: string; highlight?: boolean }) {
  return (
    <div className={`card p-5 ${highlight && lesson ? 'ring-2 ring-brand/30' : ''}`}>
      <p className="flex items-center gap-2 text-xs font-semibold text-stone-500">
        {highlight && lesson && <PulseDot />}
        {label}
      </p>
      {lesson ? (
        <>
          <p className="mt-1 font-display text-lg font-bold text-stone-900">{lesson.subject}</p>
          <p className="mt-1 flex flex-wrap gap-x-3 gap-y-1 text-sm text-stone-500">
            <span className="flex items-center gap-1">
              <Clock className="size-3.5" />
              {shortTime(lesson.start)}–{shortTime(lesson.end)}
            </span>
            <span className="flex items-center gap-1">
              <MapPin className="size-3.5" />
              {lesson.room}
            </span>
          </p>
        </>
      ) : (
        <p className="mt-1 text-sm text-stone-500">{empty}</p>
      )}
    </div>
  );
}

function ClassCard({ lesson, current }: { lesson: ClassSession; current: boolean }) {
  return (
    <div className={`flex gap-3 rounded-xl p-4 ring-1 ring-inset ${classTone(lesson.subject)} ${current ? 'ring-2 ring-brand' : ''}`}>
      <div className="w-14 shrink-0 text-sm font-bold">
        {shortTime(lesson.start)}
        <span className="block text-xs font-medium opacity-70">{shortTime(lesson.end)}</span>
      </div>
      <div className="min-w-0">
        <p className="font-bold">
          {lesson.subject} {current && <span className="ml-1 rounded bg-brand px-1.5 py-0.5 text-[0.6875rem] text-white">Ahora</span>}
        </p>
        <p className="mt-0.5 flex flex-wrap gap-x-3 text-xs opacity-80">
          <span className="flex items-center gap-1">
            <MapPin className="size-3" />
            {lesson.room}
          </span>
          <span className="flex items-center gap-1">
            <UserRound className="size-3" />
            {lesson.teacher}
          </span>
        </p>
      </div>
    </div>
  );
}
