import { DoorOpen, MapPin, MapPinOff, Pencil, Plus, Trash2 } from 'lucide-react';
import { useState, type FormEvent } from 'react';
import type { AccessPoint, AccessPointInput, PersonRole } from '../../../../shared/contracts';
import { DEFAULT_GEOFENCE_METERS, PERSON_ROLE_LABELS, PERSON_ROLES } from '../../../../shared/rules';
import { errorMessage } from '../../../api/http';
import { getCurrentPosition } from '../../../lib/geo';
import { Button } from '../../../ui/Button';
import { ConfirmDialog } from '../../../ui/ConfirmDialog';
import { Badge, EmptyState, PageHeader, SectionCard } from '../../../ui/Display';
import { Field, FormError } from '../../../ui/Field';
import { Modal, ModalBody, ModalFooter } from '../../../ui/Modal';
import { Switch } from '../../../ui/Switch';
import { useToast } from '../../../ui/toast';
import { staffApi } from '../api';
import { useStaffContext } from '../context';

export default function AccessPoints() {
  const toast = useToast();
  const { meta, reloadMeta } = useStaffContext();
  const [form, setForm] = useState<{ open: boolean; point: AccessPoint | null }>({ open: false, point: null });
  const [toDelete, setToDelete] = useState<AccessPoint | null>(null);
  const points = meta?.accessPoints ?? [];

  return (
    <>
      <PageHeader
        eyebrow="Administración"
        title="Accesos del campus"
        description="Puertas y áreas donde se registra el ingreso, con los roles permitidos en cada una."
        actions={
          <Button variant="primary" icon={<Plus className="size-4" />} onClick={() => setForm({ open: true, point: null })}>
            Nuevo acceso
          </Button>
        }
      />

      <SectionCard title="Accesos registrados" icon={DoorOpen} description={`${points.length} en total`}>
        {points.length === 0 ? (
          <EmptyState
            icon={DoorOpen}
            title="Sin accesos configurados"
            description="Registra las puertas del campus e indica qué roles pueden ingresar por cada una."
            action={
              <Button variant="primary" icon={<Plus className="size-4" />} onClick={() => setForm({ open: true, point: null })}>
                Nuevo acceso
              </Button>
            }
          />
        ) : (
          <ul className="divide-y divide-stone-100">
            {points.map(point => (
              <li key={point.id} className="flex flex-col gap-3 px-5 py-4 lg:flex-row lg:items-center">
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="font-semibold text-stone-900">{point.name}</p>
                    {point.active ? <Badge tone="verde">Habilitado</Badge> : <Badge tone="red">Fuera de servicio</Badge>}
                    {point.lat !== null ? (
                      <Badge tone="blue" icon={MapPin}>
                        Geocerca {point.radiusMeters} m
                      </Badge>
                    ) : (
                      <Badge icon={MapPinOff}>Sin geocerca</Badge>
                    )}
                  </div>
                  <p className="mt-0.5 text-sm text-stone-600">{point.description || 'Sin descripción'}</p>
                  <div className="mt-1.5 flex flex-wrap gap-1">
                    {point.allowedRoles.map(role => (
                      <Badge key={role}>{PERSON_ROLE_LABELS[role]}</Badge>
                    ))}
                  </div>
                </div>
                <div className="flex shrink-0 gap-2">
                  <Button size="sm" icon={<Pencil className="size-3.5" />} onClick={() => setForm({ open: true, point })}>
                    Editar
                  </Button>
                  <Button size="sm" variant="danger" icon={<Trash2 className="size-3.5" />} onClick={() => setToDelete(point)} aria-label="Eliminar acceso" />
                </div>
              </li>
            ))}
          </ul>
        )}
      </SectionCard>

      <AccessPointModal
        open={form.open}
        point={form.point}
        onClose={() => setForm(current => ({ ...current, open: false }))}
        onSaved={() => reloadMeta()}
      />

      <ConfirmDialog
        open={toDelete !== null}
        title="Eliminar acceso"
        confirmLabel="Eliminar"
        message={`Se eliminará "${toDelete?.name}". Si ya tiene registros asociados, desactívalo en lugar de eliminarlo.`}
        onCancel={() => setToDelete(null)}
        onConfirm={async () => {
          await staffApi.deleteAccessPoint(toDelete!.id);
          toast.notify('Acceso eliminado.', 'success');
          setToDelete(null);
          reloadMeta();
        }}
      />
    </>
  );
}

interface AccessPointModalProps {
  open: boolean;
  point: AccessPoint | null;
  onClose: () => void;
  onSaved: () => void;
}

function AccessPointModal(props: AccessPointModalProps) {
  return (
    <Modal
      open={props.open}
      onClose={props.onClose}
      size="lg"
      title={props.point ? 'Editar acceso' : 'Nuevo acceso'}
      description="Define qué roles pueden ingresar y, opcionalmente, la geocerca que valida la ubicación."
    >
      <AccessPointForm {...props} />
    </Modal>
  );
}

function AccessPointForm({ point, onClose, onSaved }: AccessPointModalProps) {
  const toast = useToast();
  const [values, setValues] = useState<AccessPointInput>({
    name: point?.name ?? '',
    description: point?.description ?? '',
    allowedRoles: point?.allowedRoles ?? [...PERSON_ROLES],
    lat: point?.lat ?? null,
    lng: point?.lng ?? null,
    radiusMeters: point?.radiusMeters ?? DEFAULT_GEOFENCE_METERS,
    active: point?.active ?? true,
  });
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [locating, setLocating] = useState(false);

  const set = <K extends keyof AccessPointInput>(key: K, value: AccessPointInput[K]) => setValues(current => ({ ...current, [key]: value }));

  const toggleRole = (role: PersonRole) =>
    set('allowedRoles', values.allowedRoles.includes(role) ? values.allowedRoles.filter(item => item !== role) : [...values.allowedRoles, role]);

  const useMyLocation = async () => {
    setLocating(true);
    try {
      const position = await getCurrentPosition();
      setValues(current => ({ ...current, lat: position.lat, lng: position.lng }));
      toast.notify(`Ubicación tomada con precisión de ±${position.accuracy} m.`, 'success');
    } catch {
      toast.notify('No se pudo obtener la ubicación. Permite el acceso en el navegador.', 'error');
    } finally {
      setLocating(false);
    }
  };

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (!values.allowedRoles.length) {
      setError('Selecciona al menos un rol permitido.');
      return;
    }
    setSaving(true);
    setError(null);
    try {
      if (point) await staffApi.updateAccessPoint(point.id, values);
      else await staffApi.createAccessPoint(values);
      toast.notify(point ? 'Acceso actualizado.' : 'Acceso creado.', 'success');
      onSaved();
      onClose();
    } catch (err) {
      setError(errorMessage(err));
      setSaving(false);
    }
  };

  return (
    <form onSubmit={submit}>
      <ModalBody className="grid gap-4 sm:grid-cols-2">
        <Field label="Nombre del acceso" required className="sm:col-span-2">
          <input className="input" value={values.name} onChange={event => set('name', event.target.value)} placeholder="Ej. Acceso principal" required />
        </Field>
        <Field label="Descripción" className="sm:col-span-2">
          <input className="input" value={values.description} onChange={event => set('description', event.target.value)} placeholder="Ej. Entrada peatonal sobre la vialidad principal" />
        </Field>

        <div className="sm:col-span-2">
          <p className="label">Roles permitidos</p>
          <div className="flex flex-wrap gap-2">
            {PERSON_ROLES.map(role => {
              const active = values.allowedRoles.includes(role);
              return (
                <button
                  key={role}
                  type="button"
                  onClick={() => toggleRole(role)}
                  className={`rounded-lg px-3 py-1.5 text-sm font-medium ring-1 transition ${active ? 'bg-brand text-white ring-brand' : 'bg-surface text-stone-600 ring-stone-200 hover:ring-stone-300'}`}
                >
                  {PERSON_ROLE_LABELS[role]}
                </button>
              );
            })}
          </div>
          <p className="mt-1.5 text-xs text-stone-500">Si alguien con otro rol lo intenta, se deniega y se genera una alerta para vigilancia.</p>
        </div>

        <Field label="Latitud" hint="Opcional: si la dejas vacía, no se valida la ubicación.">
          <input
            className="input font-mono"
            type="number"
            step="0.000001"
            value={values.lat ?? ''}
            onChange={event => set('lat', event.target.value === '' ? null : Number(event.target.value))}
            placeholder="20.612345"
          />
        </Field>
        <Field label="Longitud">
          <input
            className="input font-mono"
            type="number"
            step="0.000001"
            value={values.lng ?? ''}
            onChange={event => set('lng', event.target.value === '' ? null : Number(event.target.value))}
            placeholder="-103.312345"
          />
        </Field>
        <Field label="Radio de la geocerca (metros)">
          <input className="input" type="number" min={20} max={5000} value={values.radiusMeters} onChange={event => set('radiusMeters', Number(event.target.value))} />
        </Field>
        <div className="flex items-end">
          <Button className="w-full" icon={<MapPin className="size-4" />} loading={locating} onClick={useMyLocation}>
            Usar mi ubicación actual
          </Button>
        </div>

        <div className="sm:col-span-2">
          <Switch
            checked={values.active}
            onChange={value => set('active', value)}
            label="Acceso habilitado"
            description="Los accesos fuera de servicio no aparecen en el portal de las personas."
          />
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
          {point ? 'Guardar cambios' : 'Crear acceso'}
        </Button>
      </ModalFooter>
    </form>
  );
}
