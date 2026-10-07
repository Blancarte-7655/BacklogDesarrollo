import { ArrowLeft, CheckCircle2, CircleStop, History, Monitor, MonitorOff, Printer, Trash2, TriangleAlert, Tv, Wrench } from 'lucide-react';
import { useState, type FormEvent } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import type { Station } from '../../../../shared/contracts';
import { errorMessage } from '../../../api/http';
import { useAsync } from '../../../hooks/useAsync';
import { useNow } from '../../../hooks/useNow';
import { formatDateTime, formatDuration, formatTime, minutesSince, relativeTime } from '../../../lib/format';
import { Button, buttonStyles } from '../../../ui/Button';
import { ConfirmDialog } from '../../../ui/ConfirmDialog';
import { Badge, ErrorState, PageHeader, PageLoader, SectionCard, StatCard } from '../../../ui/Display';
import { FormError } from '../../../ui/Field';
import { Modal, ModalBody, ModalFooter } from '../../../ui/Modal';
import { useToast } from '../../../ui/toast';
import { staffApi } from '../api';
import { useStaffContext } from '../context';

export default function LabDetail() {
  const { id = '' } = useParams();
  const { staff } = useStaffContext();
  const toast = useToast();
  const navigate = useNavigate();
  const now = useNow(30_000);
  const { data, error, reload } = useAsync(() => staffApi.room(id), [id], { pollMs: 20_000 });
  const [selected, setSelected] = useState<Station | null>(null);
  const [deleting, setDeleting] = useState(false);

  if (!data) return error ? <ErrorState message={error} onRetry={reload} /> : <PageLoader />;
  const { room, stations, recentSessions, incidents } = data;
  const openIncidents = incidents.filter(i => !i.resolvedAt);
  const outOfService = stations.filter(s => !s.inService).length;

  const act = async (action: () => Promise<unknown>, message: string) => {
    try {
      await action();
      toast.notify(message, 'success');
      setSelected(null);
      void reload();
    } catch (err) {
      toast.notify(errorMessage(err), 'error');
    }
  };

  return (
    <>
      <Link to="/control/laboratorios" className={buttonStyles('ghost', 'sm', 'mb-2 -ml-2')}>
        <ArrowLeft className="size-4" />
        Laboratorios
      </Link>
      <PageHeader
        eyebrow={room.building}
        title={room.name}
        description={room.hasDisplay ? 'Con pantalla protegida por PIN' : undefined}
        actions={
          <>
            {!!stations.length && (
              <Link to={`/control/laboratorios/${room.id}/etiquetas`} className={buttonStyles('secondary', 'md')}>
                <Printer className="size-4" />
                Etiquetas QR
              </Link>
            )}
            {staff.role === 'admin' && (
              <Button variant="danger" icon={<Trash2 className="size-4" />} onClick={() => setDeleting(true)}>
                Eliminar
              </Button>
            )}
          </>
        }
      />

      {!!stations.length && (
        <>
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            <StatCard icon={Monitor} label="En uso" value={room.occupied} suffix={`de ${room.stations}`} />
            <StatCard icon={CheckCircle2} label="Disponibles" value={stations.filter(s => s.inService && !s.occupant).length} tone="cafe" />
            <StatCard icon={TriangleAlert} label="Fallas abiertas" value={openIncidents.length} tone="amber" />
            <StatCard icon={MonitorOff} label="Fuera de servicio" value={outOfService} tone="terracota" />
          </div>

          <SectionCard className="mt-5" title="Mapa de equipos" description="Toca un equipo para ver quién lo usa" icon={Monitor} bodyClassName="p-5">
            <div className="grid grid-cols-3 gap-2.5 sm:grid-cols-5 lg:grid-cols-6 xl:grid-cols-8">
              {stations.map(station => {
                const tone = !station.inService
                  ? 'border-stone-200 bg-stone-100 text-stone-400'
                  : station.occupant
                    ? 'border-verde-300 bg-verde-50 text-verde-800'
                    : 'border-stone-200 bg-surface text-stone-600';
                return (
                  <button
                    key={station.id}
                    type="button"
                    onClick={() => setSelected(station)}
                    className={`relative rounded-xl border p-2.5 text-left transition hover:-translate-y-0.5 hover:shadow-sm ${tone}`}
                  >
                    {!!station.openIncidents && <TriangleAlert className="absolute top-2 right-2 size-3.5 text-amber-600" aria-label="Con falla reportada" />}
                    {station.inService ? <Monitor className="size-5" /> : <MonitorOff className="size-5" />}
                    <p className="mt-1 text-sm font-bold">{station.label}</p>
                    <p className="truncate text-[0.6875rem]">
                      {!station.inService ? 'Fuera de servicio' : station.occupant ? station.occupant.name.split(' ').slice(0, 2).join(' ') : 'Libre'}
                    </p>
                    {station.occupant && <p className="text-[0.6875rem] opacity-70">{formatDuration(minutesSince(station.occupant.since, now))}</p>}
                  </button>
                );
              })}
            </div>
            <div className="mt-4 flex flex-wrap gap-4 text-xs text-stone-500">
              <span className="flex items-center gap-1.5">
                <span className="size-3 rounded border border-verde-300 bg-verde-50" /> En uso
              </span>
              <span className="flex items-center gap-1.5">
                <span className="size-3 rounded border border-stone-200 bg-surface" /> Libre
              </span>
              <span className="flex items-center gap-1.5">
                <span className="size-3 rounded border border-stone-200 bg-stone-100" /> Fuera de servicio
              </span>
              <span className="flex items-center gap-1.5">
                <TriangleAlert className="size-3 text-amber-600" /> Falla reportada
              </span>
            </div>
          </SectionCard>
        </>
      )}

      {room.hasDisplay && !stations.length && (
        <p className="card flex items-center gap-3 p-5 text-sm text-stone-600">
          <Tv className="size-5 text-verde-700" />
          Este salón no tiene equipos registrados; su pantalla se protege con PIN (ver <Link to="/control/pantallas" className="font-semibold text-verde-700 hover:underline">Pantallas</Link>).
        </p>
      )}

      <div className="mt-5 grid gap-5 lg:grid-cols-2">
        <SectionCard title="Fallas e incidencias" icon={Wrench}>
          {incidents.length ? (
            <ul className="divide-y divide-stone-100">
              {incidents.map(incident => (
                <li key={incident.id} className={`px-5 py-3.5 ${incident.resolvedAt ? 'opacity-60' : ''}`}>
                  <div className="flex items-start justify-between gap-3">
                    <p className="text-sm font-semibold text-stone-800">
                      {incident.stationLabel} · {incident.description}
                    </p>
                    {incident.resolvedAt ? (
                      <Badge tone="verde">Resuelta</Badge>
                    ) : (
                      <Button size="sm" onClick={() => void act(() => staffApi.resolveStationIncident(incident.id), 'Incidencia resuelta.')}>
                        Resolver
                      </Button>
                    )}
                  </div>
                  <p className="mt-0.5 text-xs text-stone-500">
                    {relativeTime(incident.createdAt)} · reportó {incident.reportedBy}
                    {incident.personName && (
                      <>
                        {' '}
                        · <b className="text-stone-700">último uso: {incident.personName}</b> ({incident.personCode})
                      </>
                    )}
                  </p>
                </li>
              ))}
            </ul>
          ) : (
            <p className="px-5 py-8 text-center text-sm text-stone-500">Sin incidencias registradas.</p>
          )}
        </SectionCard>

        <SectionCard title="Usos recientes" icon={History}>
          {recentSessions.length ? (
            <ul className="divide-y divide-stone-100">
              {recentSessions.map(session => (
                <li key={session.id} className="flex items-center justify-between gap-3 px-5 py-3 text-sm">
                  <span className="min-w-0">
                    <b className="text-stone-800">{session.stationLabel}</b> · <span className="text-stone-600">{session.personName}</span>
                    <span className="block text-xs text-stone-500">{formatDateTime(session.startedAt)}</span>
                  </span>
                  <span className="shrink-0 text-xs text-stone-500">{session.endedAt ? formatDuration(session.minutes) : <Badge tone="verde">En uso</Badge>}</span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="px-5 py-8 text-center text-sm text-stone-500">Sin usos registrados.</p>
          )}
        </SectionCard>
      </div>

      <StationModal
        station={selected}
        onClose={() => setSelected(null)}
        onEnd={sessionId => void act(() => staffApi.endStationSession(sessionId), 'Se liberó el equipo y se avisó a la persona.')}
        onService={(station, inService) =>
          void act(() => staffApi.setStationService(station.id, inService), inService ? `${station.label} vuelve a estar disponible.` : `${station.label} quedó fuera de servicio.`)
        }
        onIncident={(station, text) => act(() => staffApi.reportStationIncident(station.id, text), 'Incidencia registrada.')}
      />

      <ConfirmDialog
        open={deleting}
        title={`Eliminar ${room.name}`}
        message="Se eliminan también sus equipos, usos e incidencias. Esta acción no se puede deshacer."
        confirmLabel="Eliminar"
        onCancel={() => setDeleting(false)}
        onConfirm={async () => {
          try {
            await staffApi.deleteRoom(room.id);
            navigate('/control/laboratorios', { replace: true });
          } catch (err) {
            toast.notify(errorMessage(err), 'error');
            setDeleting(false);
          }
        }}
      />
    </>
  );
}

interface StationModalProps {
  station: Station | null;
  onClose: () => void;
  onEnd: (sessionId: string) => void;
  onService: (station: Station, inService: boolean) => void;
  onIncident: (station: Station, text: string) => Promise<void>;
}

function StationModal({ station, onClose, onEnd, onService, onIncident }: StationModalProps) {
  const [text, setText] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (!station) return;
    if (text.trim().length < 5) return setError('Describe lo que pasó.');
    setSaving(true);
    await onIncident(station, text);
    setText('');
    setError(null);
    setSaving(false);
  };

  return (
    <Modal open={!!station} onClose={onClose} title={station ? `${station.label} · ${station.roomName}` : ''} description={station && `Código ${station.code}`} size="sm">
      {station && (
        <>
          <ModalBody className="space-y-4">
            {station.occupant ? (
              <div className="rounded-xl bg-verde-50 p-4 text-sm text-verde-800">
                <p className="font-bold">{station.occupant.name}</p>
                <p>
                  Código {station.occupant.code} · desde las {formatTime(station.occupant.since)}
                </p>
              </div>
            ) : (
              <p className="rounded-xl bg-stone-100 p-4 text-sm text-stone-600">{station.inService ? 'Libre.' : 'Fuera de servicio.'}</p>
            )}

            <form onSubmit={submit} className="space-y-2">
              <p className="label">Registrar incidencia</p>
              <div className="flex flex-wrap gap-1.5">
                {['Contraseña pegada en el monitor', 'Juegos instalados', 'Daño físico', 'Cambiaron la configuración'].map(option => (
                  <button key={option} type="button" onClick={() => setText(option)} className="rounded-full bg-stone-100 px-3 py-1 text-xs font-medium text-stone-600 hover:bg-verde-50 hover:text-verde-700">
                    {option}
                  </button>
                ))}
              </div>
              <textarea className="input min-h-20" value={text} onChange={event => setText(event.target.value)} maxLength={500} aria-label="Descripción de la incidencia" />
              <FormError message={error} />
              <Button type="submit" size="sm" loading={saving} icon={<Wrench className="size-3.5" />}>
                Registrar
              </Button>
              <p className="text-xs text-stone-500">Se liga automáticamente a quien usa o usó el equipo en la última hora.</p>
            </form>
          </ModalBody>
          <ModalFooter>
            {station.inService ? (
              <Button variant="danger" icon={<MonitorOff className="size-4" />} onClick={() => onService(station, false)}>
                Fuera de servicio
              </Button>
            ) : (
              <Button icon={<Monitor className="size-4" />} onClick={() => onService(station, true)}>
                Volver a servicio
              </Button>
            )}
            {station.occupant && (
              <Button variant="primary" icon={<CircleStop className="size-4" />} onClick={() => onEnd(station.occupant!.sessionId)}>
                Liberar equipo
              </Button>
            )}
          </ModalFooter>
        </>
      )}
    </Modal>
  );
}
