import { Building2, ChevronRight, FlaskConical, Info, Monitor, Plus, School, TriangleAlert } from 'lucide-react';
import { useState, type FormEvent } from 'react';
import { Link } from 'react-router-dom';
import type { RoomInput } from '../../../../shared/contracts';
import { errorMessage } from '../../../api/http';
import { useAsync } from '../../../hooks/useAsync';
import { Button } from '../../../ui/Button';
import { Badge, EmptyState, ErrorState, PageHeader, PageLoader, ProgressBar } from '../../../ui/Display';
import { Field, FormError } from '../../../ui/Field';
import { Modal, ModalBody, ModalFooter } from '../../../ui/Modal';
import { Switch } from '../../../ui/Switch';
import { useToast } from '../../../ui/toast';
import { staffApi } from '../api';
import { useStaffContext } from '../context';

export default function Labs() {
  const { staff } = useStaffContext();
  const { data, error, reload } = useAsync(() => staffApi.rooms(), [], { pollMs: 30_000 });
  const [creating, setCreating] = useState(false);

  if (!data) return error ? <ErrorState message={error} onRetry={reload} /> : <PageLoader />;
  const labs = data.filter(r => r.kind === 'laboratorio');
  const rooms = data.filter(r => r.kind === 'salon');

  return (
    <>
      <PageHeader
        eyebrow="Campus"
        title="Laboratorios y salones"
        description="Quién usa cada equipo, fallas reportadas y equipos fuera de servicio."
        actions={
          staff.role === 'admin' && (
            <Button variant="primary" icon={<Plus className="size-4" />} onClick={() => setCreating(true)}>
              Agregar
            </Button>
          )
        }
      />

      <div className="mb-6 flex gap-3 rounded-xl border border-sky-200 bg-sky-50 px-5 py-4 text-sm text-sky-700">
        <Info className="mt-0.5 size-5 shrink-0" />
        <p>
          Cada computadora lleva una etiqueta QR. Para usarla, la persona la escanea y confirma con su biometría: el equipo queda a su nombre. Si alguien
          deja una contraseña pegada, instala juegos o daña el equipo, la incidencia se liga a quien lo estaba usando.
        </p>
      </div>

      {!data.length ? (
        <div className="card">
          <EmptyState icon={FlaskConical} title="Sin laboratorios" description="Agrega los laboratorios del centro o carga la demostración." />
        </div>
      ) : (
        <>
          <h2 className="mb-3 font-display text-lg font-bold text-stone-900">Laboratorios</h2>
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {labs.map(room => (
              <Link key={room.id} to={`/control/laboratorios/${room.id}`} className="card group p-5 transition hover:-translate-y-0.5 hover:shadow-md">
                <div className="flex items-start justify-between gap-3">
                  <span className="grid size-10 place-items-center rounded-lg bg-verde-50 text-verde-700">
                    <Monitor className="size-5" />
                  </span>
                  {!!room.openIncidents && (
                    <Badge tone="amber" icon={TriangleAlert}>
                      {room.openIncidents} {room.openIncidents === 1 ? 'falla' : 'fallas'}
                    </Badge>
                  )}
                </div>
                <h3 className="mt-3 font-display font-bold text-stone-900">{room.name}</h3>
                <p className="text-xs text-stone-500">{room.building}</p>
                <div className="mt-4 flex items-baseline justify-between text-sm">
                  <span className="font-semibold text-stone-800">
                    {room.occupied} de {room.stations} en uso
                  </span>
                  <ChevronRight className="size-4 text-stone-400 transition group-hover:translate-x-0.5" />
                </div>
                <ProgressBar className="mt-2" value={room.stations ? room.occupied / room.stations : 0} />
              </Link>
            ))}
          </div>

          {!!rooms.length && (
            <>
              <h2 className="mt-8 mb-3 font-display text-lg font-bold text-stone-900">Salones con pantalla</h2>
              <div className="card divide-y divide-stone-100">
                {rooms.map(room => (
                  <Link key={room.id} to={`/control/laboratorios/${room.id}`} className="flex items-center gap-3 px-5 py-3 hover:bg-stone-50">
                    <School className="size-4 text-stone-400" />
                    <span className="flex-1 font-semibold text-stone-800">{room.name}</span>
                    <span className="flex items-center gap-1 text-xs text-stone-500">
                      <Building2 className="size-3.5" />
                      {room.building}
                    </span>
                    <ChevronRight className="size-4 text-stone-400" />
                  </Link>
                ))}
              </div>
            </>
          )}
        </>
      )}

      <CreateRoomModal open={creating} onClose={() => setCreating(false)} onCreated={() => void reload()} />
    </>
  );
}

const EMPTY: RoomInput = { name: '', building: '', kind: 'laboratorio', hasDisplay: true, stations: 20 };

function CreateRoomModal({ open, onClose, onCreated }: { open: boolean; onClose: () => void; onCreated: () => void }) {
  const toast = useToast();
  const [values, setValues] = useState<RoomInput>(EMPTY);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const set = <K extends keyof RoomInput>(key: K, value: RoomInput[K]) => setValues(current => ({ ...current, [key]: value }));

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setSaving(true);
    setError(null);
    try {
      const room = await staffApi.createRoom({ ...values, stations: values.kind === 'salon' ? 0 : values.stations });
      toast.notify(`${room.name} agregado${room.stations ? ` con ${room.stations} equipos` : ''}.`, 'success');
      setValues(EMPTY);
      onCreated();
      onClose();
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal open={open} onClose={onClose} title="Agregar laboratorio o salón">
      <form onSubmit={submit}>
        <ModalBody className="grid gap-4 sm:grid-cols-2">
          <Field label="Nombre" required className="sm:col-span-2">
            <input className="input" value={values.name} onChange={e => set('name', e.target.value)} placeholder="Laboratorio de Cómputo 3" required />
          </Field>
          <Field label="Edificio">
            <input className="input" value={values.building} onChange={e => set('building', e.target.value)} placeholder="Edificio C" />
          </Field>
          <Field label="Tipo">
            <select className="input" value={values.kind} onChange={e => set('kind', e.target.value as RoomInput['kind'])}>
              <option value="laboratorio">Laboratorio</option>
              <option value="salon">Salón</option>
            </select>
          </Field>
          {values.kind === 'laboratorio' && (
            <Field label="Número de equipos" hint="Se crean PC-01, PC-02… cada uno con su código.">
              <input className="input" type="number" min={1} max={80} value={values.stations} onChange={e => set('stations', Number(e.target.value))} />
            </Field>
          )}
          <div className="sm:col-span-2">
            <Switch checked={values.hasDisplay} onChange={value => set('hasDisplay', value)} label="Tiene pantalla o proyector" description="Se le asigna un PIN que cambia en cada clase." />
          </div>
          <div className="sm:col-span-2">
            <FormError message={error} />
          </div>
        </ModalBody>
        <ModalFooter>
          <Button variant="ghost" onClick={onClose}>
            Cancelar
          </Button>
          <Button type="submit" variant="primary" loading={saving}>
            Agregar
          </Button>
        </ModalFooter>
      </form>
    </Modal>
  );
}
