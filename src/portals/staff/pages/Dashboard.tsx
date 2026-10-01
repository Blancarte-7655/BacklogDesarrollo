import { Activity, BadgeAlert, Bell, DoorOpen, LogIn, LogOut, Radio, Search, TriangleAlert, Users, UsersRound } from 'lucide-react';
import { useState } from 'react';
import { Link } from 'react-router-dom';
import type { PersonRole } from '../../../../shared/contracts';
import { PERSON_ROLE_LABELS } from '../../../../shared/rules';
import { useAsync } from '../../../hooks/useAsync';
import { useNow } from '../../../hooks/useNow';
import { capitalize, formatDate, formatDuration, formatTime } from '../../../lib/format';
import { normalize } from '../../../lib/text';
import { buttonStyles } from '../../../ui/Button';
import { Avatar, Badge, ErrorState, PageHeader, PageLoader, PulseDot, SectionCard, StatCard } from '../../../ui/Display';
import { Segmented } from '../../../ui/Segmented';
import { staffApi } from '../api';
import { FlowAnalytics } from '../components/FlowAnalytics';
import { useStaffContext } from '../context';

type RoleFilter = PersonRole | 'invitado' | 'all';

export default function Dashboard() {
  const { staff } = useStaffContext();
  const now = useNow(30_000);
  const [query, setQuery] = useState('');
  const [role, setRole] = useState<RoleFilter>('all');
  const dashboard = useAsync(() => staffApi.dashboard(), [], { pollMs: 15_000 });
  const stats = useAsync(() => (staff.role === 'admin' ? staffApi.stats() : Promise.resolve(null)), [staff.role]);

  if (!dashboard.data) return dashboard.loading ? <PageLoader /> : <ErrorState message={dashboard.error ?? ''} onRetry={dashboard.reload} />;
  const data = dashboard.data;

  const q = normalize(query);
  const inside = data.inside
    .filter(item => role === 'all' || item.role === role)
    .filter(item => !q || normalize(`${item.name} ${item.code} ${item.program} ${item.accessPointName}`).includes(q));

  const roleOptions: Array<{ value: RoleFilter; label: string; count: number }> = [
    { value: 'all', label: 'Todos', count: data.inside.length },
    ...(['alumno', 'docente', 'personal'] as PersonRole[]).map(value => ({
      value,
      label: PERSON_ROLE_LABELS[value],
      count: data.inside.filter(item => item.role === value).length,
    })),
    { value: 'invitado' as const, label: 'Invitados', count: data.inside.filter(item => item.role === 'invitado').length },
  ];

  return (
    <>
      <PageHeader
        eyebrow={capitalize(formatDate(now, 'long'))}
        title="Tablero de acceso"
        description="Quién está dentro del campus en este momento. Se actualiza solo cada 15 segundos."
        actions={
          <>
            <Link to="/control/invitados" className={buttonStyles('secondary')}>
              <UsersRound className="size-4" />
              Pase de invitado
            </Link>
            <Link to="/control/registros" className={buttonStyles('primary')}>
              <Activity className="size-4" />
              Ver registros
            </Link>
          </>
        }
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard icon={Radio} label="Dentro del campus" value={data.inside.length} hint={`${data.activeGuestPasses} pases de invitado activos`} />
        <StatCard icon={LogIn} tone="verde" label="Entradas de hoy" value={data.todayEntries} hint="Registros de entrada" />
        <StatCard icon={LogOut} tone="cafe" label="Salidas de hoy" value={data.todayExits} hint="Ciclos cerrados" />
        <StatCard icon={Bell} tone="terracota" label="Alertas sin revisar" value={data.unreadAlerts} hint={`${data.openIncidents} incidencias abiertas`} />
      </div>

      {staff.role === 'admin' && stats.data && (
        <div className="mt-4 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <StatCard icon={Users} label="Personas activas" value={stats.data.activePeople} hint={`${stats.data.people} registradas en total`} />
          <StatCard icon={BadgeAlert} tone="amber" label="Credenciales por vencer" value={stats.data.expiringCredentials} hint="En los próximos 30 días" />
          <StatCard icon={DoorOpen} label="Accesos habilitados" value={stats.data.accessPoints} hint="Puertas y áreas activas" />
          <StatCard icon={TriangleAlert} tone="terracota" label="Incidencias de hoy" value={stats.data.todayIncidents} hint="Requieren revisión" />
        </div>
      )}

      <div className="mt-5 grid gap-5 xl:grid-cols-5">
        <SectionCard
          className="xl:col-span-3"
          title="Dentro del campus"
          description={`${inside.length} de ${data.inside.length} personas`}
          icon={Radio}
        >
          <div className="flex flex-col gap-3 border-b border-stone-100 p-4 lg:flex-row lg:items-center lg:justify-between">
            <label className="relative block lg:w-64">
              <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-stone-400" />
              <input className="input pl-9" placeholder="Buscar por nombre o código…" value={query} onChange={event => setQuery(event.target.value)} />
            </label>
            <Segmented id="presence-role" value={role} onChange={setRole} options={roleOptions} />
          </div>

          {inside.length ? (
            <ul className="max-h-[32rem] divide-y divide-stone-100 overflow-y-auto scrollbar-thin">
              {inside.map(item => (
                <li key={item.recordId} className="flex items-center gap-3 px-5 py-3">
                  <Avatar name={item.name} />
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-semibold text-stone-800">{item.name}</p>
                    <p className="truncate text-xs text-stone-500">
                      <span className="font-mono">{item.code}</span> · {item.accessPointName}
                      {item.program && ` · ${item.program}`}
                    </p>
                  </div>
                  <div className="text-right">
                    <Badge tone={item.role === 'invitado' ? 'blue' : 'verde'}>
                      {item.role === 'invitado' ? 'Invitado' : PERSON_ROLE_LABELS[item.role]}
                    </Badge>
                    <p className="mt-1 font-mono text-xs text-stone-500">
                      desde {formatTime(item.checkIn)} · {formatDuration(item.minutesInside)}
                    </p>
                  </div>
                </li>
              ))}
            </ul>
          ) : (
            <p className="px-5 py-14 text-center text-sm text-stone-500">
              {data.inside.length ? 'Ninguna persona coincide con el filtro.' : 'No hay nadie registrado dentro del campus.'}
            </p>
          )}
        </SectionCard>

        <SectionCard className="xl:col-span-2" title="Actividad de hoy" description="Entradas y salidas registradas" icon={Activity}>
          {data.recent.length ? (
            <ol className="max-h-[32rem] overflow-y-auto px-5 py-3 scrollbar-thin">
              {data.recent.map(event => (
                <li key={event.id} className="flex items-center gap-3 border-l-2 border-stone-100 py-2 pl-4">
                  <span
                    className={`-ml-[27px] grid size-6 shrink-0 place-items-center rounded-full text-white ring-4 ring-surface ${event.type === 'in' ? 'bg-brand' : 'bg-accent'}`}
                  >
                    {event.type === 'in' ? <LogIn className="size-3" /> : <LogOut className="size-3" />}
                  </span>
                  <p className="min-w-0 flex-1 truncate text-sm">
                    <span className="font-semibold text-stone-800">{event.name}</span>{' '}
                    <span className="text-stone-500">{event.type === 'in' ? 'entró por' : 'salió por'} {event.accessPointName}</span>
                  </p>
                  {event.status === 'incidencia' && <TriangleAlert className="size-4 shrink-0 text-amber-600" />}
                  <span className="font-mono text-xs text-stone-500">{formatTime(event.at)}</span>
                </li>
              ))}
            </ol>
          ) : (
            <p className="px-5 py-14 text-center text-sm text-stone-500">Sin movimientos registrados hoy.</p>
          )}
        </SectionCard>
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-2 text-xs text-stone-500">
        <PulseDot className="bg-brand-bright" />
        Tablero en vivo · última actualización {formatTime(now.toISOString())}
      </div>

      <FlowAnalytics />
    </>
  );
}
