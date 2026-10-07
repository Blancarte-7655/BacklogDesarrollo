import { CalendarClock, ChevronRight, MapPin, Monitor, Tv, UserRoundPlus, type LucideIcon } from 'lucide-react';
import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import type { PersonRole } from '../../../../shared/contracts';
import { WEEKDAY_LABELS } from '../../../../shared/campus';
import { useAsync } from '../../../hooks/useAsync';
import { formatDuration, shortTime } from '../../../lib/format';
import { PulseDot } from '../../../ui/Display';
import { personApi } from '../api';

/** Tarjetas de inicio: próxima clase y accesos rápidos según el rol */
export function TodayPanel({ role }: { role: PersonRole }) {
  const schedule = useAsync(() => (role === 'personal' ? Promise.resolve(null) : personApi.schedule()), [role], { pollMs: 60_000 });
  const station = useAsync(() => personApi.stationStatus(), []);
  const data = schedule.data;
  const lesson = data?.current ?? data?.next ?? null;
  const session = station.data?.session;

  return (
    <div className="mt-5 grid gap-3 sm:grid-cols-2">
      {role !== 'personal' && (
        <Tile to="/acceso/horario" icon={CalendarClock} className="sm:col-span-2">
          {lesson ? (
            <>
              <p className="flex items-center gap-2 text-xs font-semibold text-stone-500">
                {data?.current ? (
                  <>
                    <PulseDot /> Clase en curso
                  </>
                ) : data?.next && data.next.startsInMinutes < 12 * 60 ? (
                  `Tu siguiente clase · en ${formatDuration(data.next.startsInMinutes)}`
                ) : (
                  `Tu siguiente clase · ${WEEKDAY_LABELS[lesson.weekday]}`
                )}
              </p>
              <p className="font-display font-bold text-stone-900">{lesson.subject}</p>
              <p className="flex items-center gap-1 text-xs text-stone-500">
                <MapPin className="size-3" />
                {lesson.room} · {shortTime(lesson.start)}–{shortTime(lesson.end)}
                {data?.isDemo && <span className="ml-1 rounded bg-amber-50 px-1.5 text-amber-800">demo</span>}
              </p>
            </>
          ) : (
            <p className="text-sm text-stone-500">{data ? 'Sin clases próximas.' : 'Cargando horario…'}</p>
          )}
        </Tile>
      )}

      <Tile to="/acceso/equipo" icon={Monitor}>
        <p className="font-semibold text-stone-900">{session ? `Usando ${session.stationLabel}` : 'Equipo de laboratorio'}</p>
        <p className="text-xs text-stone-500">{session ? session.roomName : 'Escanea el QR de la computadora'}</p>
      </Tile>

      {role !== 'alumno' && (
        <Tile to="/acceso/invitados" icon={UserRoundPlus}>
          <p className="font-semibold text-stone-900">Invitar a alguien</p>
          <p className="text-xs text-stone-500">Tu invitado entra con un QR</p>
        </Tile>
      )}
      {role === 'docente' && (
        <Tile to="/acceso/pantallas" icon={Tv}>
          <p className="font-semibold text-stone-900">PIN de la pantalla</p>
          <p className="text-xs text-stone-500">Del salón donde das clase</p>
        </Tile>
      )}
    </div>
  );
}

function Tile({ to, icon: Icon, className = '', children }: { to: string; icon: LucideIcon; className?: string; children: ReactNode }) {
  return (
    <Link to={to} className={`card flex items-center gap-4 p-4 transition hover:-translate-y-0.5 hover:shadow-md ${className}`}>
      <span className="grid size-11 shrink-0 place-items-center rounded-xl bg-verde-50 text-verde-700">
        <Icon className="size-5" />
      </span>
      <div className="min-w-0 flex-1">{children}</div>
      <ChevronRight className="size-4 shrink-0 text-stone-400" />
    </Link>
  );
}
