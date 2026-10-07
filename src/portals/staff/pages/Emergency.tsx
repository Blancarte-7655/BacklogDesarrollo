import { CheckCircle2, Circle, Printer, Search, ShieldAlert, Siren, Square } from 'lucide-react';
import { useMemo, useState } from 'react';
import type { EmergencyKind } from '../../../../shared/contracts';
import { PERSON_ROLE_LABELS } from '../../../../shared/rules';
import { errorMessage } from '../../../api/http';
import { useAsync } from '../../../hooks/useAsync';
import { useNow } from '../../../hooks/useNow';
import { formatDateTime, formatDuration, formatTime, minutesSince } from '../../../lib/format';
import { normalize } from '../../../lib/text';
import { Button } from '../../../ui/Button';
import { ConfirmDialog } from '../../../ui/ConfirmDialog';
import { Badge, ErrorState, PageHeader, PageLoader, ProgressBar } from '../../../ui/Display';
import { IconInput } from '../../../ui/Inputs';
import { Segmented } from '../../../ui/Segmented';
import { useToast } from '../../../ui/toast';
import { staffApi } from '../api';

const roleLabel = (role: string) => (role === 'invitado' ? 'Invitado' : PERSON_ROLE_LABELS[role as keyof typeof PERSON_ROLE_LABELS] ?? role);

/** Lista de evacuación: quién está dentro del campus y quién ya llegó al punto de reunión */
export default function Emergency() {
  const toast = useToast();
  const now = useNow(1000);
  const { data, error, reload, setData } = useAsync(() => staffApi.emergency(), [], { pollMs: 10_000 });
  const [starting, setStarting] = useState<EmergencyKind | null>(null);
  const [ending, setEnding] = useState(false);
  const [filter, setFilter] = useState<'pendientes' | 'todos' | 'a_salvo'>('pendientes');
  const [search, setSearch] = useState('');

  const people = useMemo(() => {
    const term = normalize(search.trim());
    return (data?.people ?? [])
      .filter(p => (filter === 'todos' ? true : filter === 'a_salvo' ? p.safe : !p.safe))
      .filter(p => !term || normalize(`${p.name} ${p.code}`).includes(term));
  }, [data, filter, search]);

  if (!data) return error ? <ErrorState message={error} onRetry={reload} /> : <PageLoader />;
  const event = data.event;

  const toggle = async (recordId: string) => {
    try {
      setData(await staffApi.toggleSafe(recordId));
    } catch (err) {
      toast.notify(errorMessage(err), 'error');
    }
  };

  return (
    <>
      <PageHeader
        eyebrow="Protección civil"
        title="Lista de emergencia"
        description="Quién está dentro del campus según sus registros, para pasar lista en el punto de reunión."
        actions={
          event ? (
            <>
              <Button icon={<Printer className="size-4" />} onClick={() => window.print()}>
                Imprimir
              </Button>
              <Button variant="danger" icon={<Square className="size-4" />} onClick={() => setEnding(true)}>
                Terminar {event.kind}
              </Button>
            </>
          ) : (
            <>
              <Button icon={<ShieldAlert className="size-4" />} onClick={() => setStarting('simulacro')}>
                Iniciar simulacro
              </Button>
              <Button variant="accent" icon={<Siren className="size-4" />} onClick={() => setStarting('emergencia')}>
                Emergencia
              </Button>
            </>
          )
        }
      />

      {event ? (
        <section className={`mb-5 overflow-hidden rounded-2xl p-6 text-white shadow-lg ${event.kind === 'emergencia' ? 'bg-[#b42318]' : 'bg-[#b45309]'}`}>
          <p className="flex items-center gap-2 text-sm font-semibold text-white/90">
            <Siren className="size-4 animate-pulse" />
            {event.kind === 'emergencia' ? 'Emergencia en curso' : 'Simulacro en curso'} · inició {event.startedBy} a las {formatTime(event.startedAt)} (
            {formatDuration(minutesSince(event.startedAt, now))})
          </p>
          <div className="mt-3 flex flex-wrap items-end gap-x-6 gap-y-2">
            <p className="font-display text-5xl font-extrabold">
              {data.safe}
              <span className="text-2xl text-white/70"> / {data.total}</span>
            </p>
            <p className="pb-2 text-white/90">
              personas a salvo · <b>faltan {data.total - data.safe}</b>
            </p>
          </div>
          <ProgressBar className="mt-4 bg-white/25" size="md" value={data.total ? data.safe / data.total : 1} />
        </section>
      ) : (
        <div className="mb-5 rounded-xl border border-stone-200 bg-surface px-5 py-4 text-sm text-stone-600">
          <b className="text-stone-900">{data.total} personas dentro del campus ahora.</b> Al iniciar un simulacro o emergencia se les envía un aviso al celular y
          aquí puedes marcar a cada una conforme llega al punto de reunión.
        </div>
      )}

      <div className="no-print mb-3 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        {event ? (
          <Segmented
            id="emergency-filter"
            value={filter}
            onChange={setFilter}
            options={[
              { value: 'pendientes', label: 'Faltan', count: data.total - data.safe },
              { value: 'a_salvo', label: 'A salvo', count: data.safe },
              { value: 'todos', label: 'Todos', count: data.total },
            ]}
          />
        ) : (
          <span />
        )}
        <div className="sm:w-72">
          <IconInput icon={Search} value={search} onChange={e => setSearch(e.target.value)} placeholder="Buscar por nombre o código" aria-label="Buscar persona" />
        </div>
      </div>

      <div className="card divide-y divide-stone-100">
        {(event ? people : (data.people ?? []).filter(p => !search || normalize(`${p.name} ${p.code}`).includes(normalize(search)))).map(person => (
          <button
            key={person.recordId}
            type="button"
            disabled={!event}
            onClick={() => void toggle(person.recordId)}
            className={`flex w-full items-center gap-3 px-5 py-3 text-left transition enabled:hover:bg-stone-50 ${person.safe ? 'bg-verde-50/50' : ''}`}
          >
            {event && (person.safe ? <CheckCircle2 className="size-6 shrink-0 text-verde-600" /> : <Circle className="size-6 shrink-0 text-stone-300" />)}
            <span className="min-w-0 flex-1">
              <span className="block font-semibold text-stone-900">{person.name}</span>
              <span className="block text-xs text-stone-500">
                {person.code && `${person.code} · `}
                {person.accessPointName} · entró {formatTime(person.checkIn)}
              </span>
            </span>
            <Badge tone={person.role === 'invitado' ? 'terracota' : 'neutral'}>{roleLabel(person.role)}</Badge>
            {person.safe && person.markedAt && <span className="hidden text-xs text-verde-700 sm:block">{formatTime(person.markedAt)}</span>}
          </button>
        ))}
        {!data.people.length && <p className="px-5 py-10 text-center text-sm text-stone-500">Nadie está registrado dentro del campus.</p>}
      </div>
      <p className="mt-3 text-xs text-stone-500">Actualizado {formatDateTime(now.toISOString())}. La lista se basa en los registros de entrada sin salida.</p>

      <ConfirmDialog
        open={!!starting}
        title={starting === 'emergencia' ? 'Declarar emergencia' : 'Iniciar simulacro'}
        message={`Se enviará un aviso a las ${data.total} personas dentro del campus y se abrirá la lista para pasar asistencia.`}
        confirmLabel={starting === 'emergencia' ? 'Declarar emergencia' : 'Iniciar simulacro'}
        variant={starting === 'emergencia' ? 'accent' : 'primary'}
        onCancel={() => setStarting(null)}
        onConfirm={async () => {
          try {
            setData(await staffApi.startEmergency(starting!));
            setFilter('pendientes');
          } catch (err) {
            toast.notify(errorMessage(err), 'error');
          }
          setStarting(null);
        }}
      />
      <ConfirmDialog
        open={ending}
        title="Terminar"
        message={`Quedarán ${data.total - data.safe} personas sin marcar. El evento se guarda en la bitácora.`}
        confirmLabel="Terminar"
        onCancel={() => setEnding(false)}
        onConfirm={async () => {
          try {
            setData(await staffApi.endEmergency());
          } catch (err) {
            toast.notify(errorMessage(err), 'error');
          }
          setEnding(false);
        }}
      />
    </>
  );
}
