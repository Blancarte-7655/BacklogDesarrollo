import { BadgeAlert, Ban, CircleCheck, Download, Fingerprint, KeyRound, Pencil, Search, UserRoundPlus, Users } from 'lucide-react';
import { useState, type FormEvent } from 'react';
import type { Person, PersonInput, PersonRole } from '../../../../shared/contracts';
import { credentialValid, INSTITUTIONAL_EMAIL_RE, PERSON_ROLE_LABELS, PERSON_ROLES } from '../../../../shared/rules';
import { errorMessage } from '../../../api/http';
import { useAsync } from '../../../hooks/useAsync';
import { downloadCsv } from '../../../lib/csv';
import { dateKey, formatDate, relativeTime } from '../../../lib/format';
import { normalize, onlyDigits } from '../../../lib/text';
import { Button } from '../../../ui/Button';
import { ConfirmDialog } from '../../../ui/ConfirmDialog';
import { BarList } from '../../../ui/charts';
import { Avatar, Badge, EmptyState, ErrorState, PageHeader, PageLoader, PulseDot, SectionCard } from '../../../ui/Display';
import { Field, FormError } from '../../../ui/Field';
import { Modal, ModalBody, ModalFooter } from '../../../ui/Modal';
import { Segmented } from '../../../ui/Segmented';
import { useToast } from '../../../ui/toast';
import { staffApi } from '../api';
import { CredentialsDialog, type CredentialsRecipient } from '../components/CredentialsDialog';

type Filter = 'active' | 'inside' | 'expired' | 'inactive' | 'all';

const isExpired = (person: Person) => !credentialValid({ active: person.active, credentialExpiresAt: person.credentialExpiresAt });

const matches = (person: Person, filter: Filter) =>
  filter === 'all' ||
  (filter === 'active' && person.active) ||
  (filter === 'inside' && person.inside) ||
  (filter === 'expired' && person.active && isExpired(person)) ||
  (filter === 'inactive' && !person.active);

export default function People() {
  const toast = useToast();
  const list = useAsync(() => staffApi.people(), [], { pollMs: 60_000 });
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState<Filter>('active');
  const [form, setForm] = useState<{ open: boolean; person: Person | null }>({ open: false, person: null });
  const [credentials, setCredentials] = useState<{ recipient: CredentialsRecipient; password: string; mode: 'welcome' | 'reset' } | null>(null);
  const [statusTarget, setStatusTarget] = useState<Person | null>(null);
  const [resetTarget, setResetTarget] = useState<Person | null>(null);
  const [biometricTarget, setBiometricTarget] = useState<Person | null>(null);

  const header = (
    <PageHeader
      eyebrow="Administración"
      title="Personas con credencial"
      description="Alumnos, docentes y personal autorizados para ingresar al campus."
      actions={
        <>
          <Button icon={<Download className="size-4" />} disabled={!list.data?.length} onClick={() => exportCsv(list.data ?? [])}>
            Exportar
          </Button>
          <Button variant="primary" icon={<UserRoundPlus className="size-4" />} onClick={() => setForm({ open: true, person: null })}>
            Dar de alta
          </Button>
        </>
      }
    />
  );

  if (!list.data)
    return (
      <>
        {header}
        {list.loading ? <PageLoader /> : <ErrorState message={list.error ?? ''} onRetry={list.reload} />}
      </>
    );

  const q = normalize(query);
  const rows = list.data
    .filter(person => matches(person, filter))
    .filter(person => !q || normalize(`${person.fullName} ${person.code} ${person.email} ${person.program}`).includes(q));

  const active = list.data.filter(person => person.active);
  const withBiometrics = active.filter(person => person.biometricDevices > 0).length;
  const expiringSoon = active.filter(person => {
    if (!person.credentialExpiresAt) return false;
    const limit = new Date();
    limit.setDate(limit.getDate() + 30);
    return person.credentialExpiresAt <= dateKey(limit);
  }).length;

  return (
    <>
      {header}

      {list.data.length > 0 && (
        <div className="mb-5 grid gap-5 lg:grid-cols-5">
          <dl className="grid grid-cols-2 gap-3 lg:col-span-3">
            <SummaryTile label="Activas" value={active.length} detail={`de ${list.data.length} registradas`} />
            <SummaryTile label="Dentro ahora" value={active.filter(person => person.inside).length} detail="en el campus" live />
            <SummaryTile
              label="Con biometría"
              value={withBiometrics}
              detail={active.length ? `${Math.round((withBiometrics / active.length) * 100)} % de las activas` : '—'}
              progress={active.length ? withBiometrics / active.length : 0}
            />
            <SummaryTile label="Vencen en 30 días" value={expiringSoon} detail="credenciales por renovar" warn={expiringSoon > 0} />
          </dl>
          <SectionCard className="lg:col-span-2" title="Por tipo de persona" description="Solo personas activas" icon={Users} bodyClassName="p-5">
            <BarList
              data={(['alumno', 'docente', 'personal'] as PersonRole[]).map(role => ({ role, count: active.filter(person => person.role === role).length }))}
              label={item => ({ alumno: 'Alumnos', docente: 'Docentes', personal: 'Personal' })[item.role]}
              value={item => item.count}
              caption="Personas activas por tipo"
            />
          </SectionCard>
        </div>
      )}

      <SectionCard title="Registro de personas" icon={Users} description={`${list.data.length} registradas`}>
        <div className="flex flex-col gap-3 border-b border-stone-100 p-4 lg:flex-row lg:items-center lg:justify-between">
          <label className="relative block lg:w-80">
            <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-stone-400" />
            <input className="input pl-9" placeholder="Buscar por nombre, código o correo…" value={query} onChange={event => setQuery(event.target.value)} />
          </label>
          <Segmented
            id="people-filter"
            value={filter}
            onChange={setFilter}
            options={[
              { value: 'active', label: 'Activas', count: list.data.filter(p => matches(p, 'active')).length },
              { value: 'inside', label: 'Dentro', count: list.data.filter(p => matches(p, 'inside')).length },
              { value: 'expired', label: 'Credencial vencida', count: list.data.filter(p => matches(p, 'expired')).length },
              { value: 'inactive', label: 'Baja', count: list.data.filter(p => matches(p, 'inactive')).length },
              { value: 'all', label: 'Todas', count: list.data.length },
            ]}
          />
        </div>

        {list.data.length === 0 ? (
          <EmptyState
            icon={Users}
            title="Aún no hay personas registradas"
            description="Da de alta a los alumnos, docentes y personal que podrán registrar su acceso."
            action={
              <Button variant="primary" icon={<UserRoundPlus className="size-4" />} onClick={() => setForm({ open: true, person: null })}>
                Dar de alta
              </Button>
            }
          />
        ) : rows.length === 0 ? (
          <p className="px-6 py-14 text-center text-sm text-stone-500">Nadie coincide con los filtros.</p>
        ) : (
          <div className="overflow-x-auto scrollbar-thin">
            <table className="w-full min-w-[960px] text-left text-sm">
              <thead>
                <tr className="border-b border-stone-200 bg-stone-50 text-[0.8125rem] font-semibold text-stone-600">
                  <th className="px-5 py-2.5">Persona</th>
                  <th className="px-5 py-2.5">Rol</th>
                  <th className="px-5 py-2.5">Carrera o adscripción</th>
                  <th className="px-5 py-2.5">Vigencia</th>
                  <th className="px-5 py-2.5">Último acceso</th>
                  <th className="px-5 py-2.5">Estado</th>
                  <th className="px-5 py-2.5 text-right">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-100">
                {rows.map(person => (
                  <tr key={person.id} className="transition hover:bg-stone-50/80">
                    <td className="px-5 py-3">
                      <div className="flex items-center gap-3">
                        <Avatar name={person.fullName} />
                        <div className="min-w-0">
                          <p className="truncate font-semibold text-stone-800">{person.fullName}</p>
                          <p className="truncate text-xs text-stone-500">
                            <span className="font-mono">{person.code}</span> · {person.email}
                          </p>
                        </div>
                      </div>
                    </td>
                    <td className="px-5 py-3 text-stone-700">{PERSON_ROLE_LABELS[person.role]}</td>
                    <td className="px-5 py-3 text-stone-600">{person.program || '—'}</td>
                    <td className="px-5 py-3 whitespace-nowrap">
                      {person.credentialExpiresAt ? (
                        isExpired(person) ? (
                          <Badge tone="red" icon={BadgeAlert}>
                            Venció {formatDate(person.credentialExpiresAt)}
                          </Badge>
                        ) : (
                          <span className="text-stone-600">{formatDate(person.credentialExpiresAt)}</span>
                        )
                      ) : (
                        <span className="text-stone-400">Sin vencimiento</span>
                      )}
                    </td>
                    <td className="px-5 py-3 whitespace-nowrap text-stone-600">
                      {person.lastAccessAt ? relativeTime(person.lastAccessAt) : <span className="text-stone-400">Sin registros</span>}
                    </td>
                    <td className="px-5 py-3">
                      <div className="flex flex-wrap gap-1">
                        {person.inside && (
                          <Badge tone="verde">
                            <PulseDot />
                            Dentro
                          </Badge>
                        )}
                        {person.active ? <Badge>Activa</Badge> : <Badge tone="red">Baja</Badge>}
                        {person.biometricDevices > 0 ? (
                          <Badge tone="blue" icon={Fingerprint}>
                            {person.biometricDevices}
                          </Badge>
                        ) : (
                          <Badge tone="amber">Sin biometría</Badge>
                        )}
                      </div>
                    </td>
                    <td className="px-5 py-3 text-right whitespace-nowrap">
                      <Button size="sm" variant="ghost" icon={<Pencil className="size-3.5" />} aria-label="Editar" onClick={() => setForm({ open: true, person })} />
                      <Button size="sm" variant="ghost" icon={<KeyRound className="size-3.5" />} aria-label="Nueva contraseña" onClick={() => setResetTarget(person)} />
                      {person.biometricDevices > 0 && (
                        <Button
                          size="sm"
                          variant="ghost"
                          icon={<Fingerprint className="size-3.5" />}
                          aria-label="Quitar biometría"
                          onClick={() => setBiometricTarget(person)}
                        />
                      )}
                      <Button
                        size="sm"
                        variant="ghost"
                        icon={person.active ? <Ban className="size-3.5 text-red-600" /> : <CircleCheck className="size-3.5 text-verde-600" />}
                        aria-label={person.active ? 'Dar de baja' : 'Reactivar'}
                        onClick={() => setStatusTarget(person)}
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </SectionCard>

      <PersonFormModal
        open={form.open}
        person={form.person}
        onClose={() => setForm(current => ({ ...current, open: false }))}
        onSaved={(person, password) => {
          void list.reload();
          if (password) {
            setCredentials({ recipient: { id: person.id, name: person.fullName, email: person.email, code: person.code }, password, mode: 'welcome' });
          }
        }}
      />

      <CredentialsDialog
        open={credentials !== null}
        kind="person"
        mode={credentials?.mode ?? 'welcome'}
        recipient={credentials?.recipient ?? null}
        password={credentials?.password ?? null}
        onClose={() => setCredentials(null)}
      />

      <ConfirmDialog
        open={resetTarget !== null}
        title="Generar nueva contraseña"
        variant="primary"
        confirmLabel="Generar contraseña"
        message={`Se generará una contraseña nueva para ${resetTarget?.fullName}. La anterior dejará de funcionar y se cerrarán sus sesiones.`}
        onCancel={() => setResetTarget(null)}
        onConfirm={async () => {
          const person = resetTarget!;
          const { password } = await staffApi.resetPersonPassword(person.id);
          setResetTarget(null);
          setCredentials({ recipient: { id: person.id, name: person.fullName, email: person.email, code: person.code }, password, mode: 'reset' });
        }}
      />

      <ConfirmDialog
        open={statusTarget !== null}
        title={statusTarget?.active ? 'Dar de baja' : 'Reactivar persona'}
        variant={statusTarget?.active ? 'danger' : 'primary'}
        confirmLabel={statusTarget?.active ? 'Dar de baja' : 'Reactivar'}
        message={
          statusTarget?.active
            ? `${statusTarget?.fullName} ya no podrá registrar acceso y se cerrarán sus sesiones. Su historial se conserva.`
            : `${statusTarget?.fullName} podrá volver a registrar su acceso al campus.`
        }
        onCancel={() => setStatusTarget(null)}
        onConfirm={async () => {
          await staffApi.setPersonActive(statusTarget!.id, !statusTarget!.active);
          toast.notify(statusTarget!.active ? 'Persona dada de baja.' : 'Persona reactivada.', 'success');
          setStatusTarget(null);
          void list.reload();
        }}
      />

      <ConfirmDialog
        open={biometricTarget !== null}
        title="Quitar biometría"
        confirmLabel="Quitar dispositivos"
        message={`Úsalo si ${biometricTarget?.fullName} cambió de teléfono. Tendrá que vincularlo de nuevo desde su perfil para registrar acceso.`}
        onCancel={() => setBiometricTarget(null)}
        onConfirm={async () => {
          await staffApi.removePersonBiometrics(biometricTarget!.id);
          toast.notify('Dispositivos biométricos eliminados.', 'success');
          setBiometricTarget(null);
          void list.reload();
        }}
      />
    </>
  );
}

interface PersonFormModalProps {
  open: boolean;
  person: Person | null;
  onClose: () => void;
  onSaved: (person: Person, password?: string) => void;
}

function PersonFormModal(props: PersonFormModalProps) {
  return (
    <Modal
      open={props.open}
      onClose={props.onClose}
      size="lg"
      title={props.person ? 'Editar persona' : 'Dar de alta una persona'}
      description={props.person ? undefined : 'La contraseña de acceso se genera automáticamente al guardar.'}
    >
      <PersonForm {...props} />
    </Modal>
  );
}

function PersonForm({ person, onClose, onSaved }: PersonFormModalProps) {
  const toast = useToast();
  const [values, setValues] = useState<PersonInput>({
    code: person?.code ?? '',
    fullName: person?.fullName ?? '',
    email: person?.email ?? '',
    role: person?.role ?? 'alumno',
    program: person?.program ?? '',
    credentialExpiresAt: person?.credentialExpiresAt ?? null,
  });
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const set = <K extends keyof PersonInput>(key: K, value: PersonInput[K]) => setValues(current => ({ ...current, [key]: value }));

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (!/^\d{6,10}$/.test(values.code)) {
      setError('El código o matrícula debe tener entre 6 y 10 dígitos.');
      return;
    }
    if (!INSTITUTIONAL_EMAIL_RE.test(values.email.trim())) {
      setError('Usa el correo institucional de la UdeG.');
      return;
    }
    setSaving(true);
    setError(null);
    try {
      if (person) {
        const updated = await staffApi.updatePerson(person.id, values);
        toast.notify('Datos actualizados.', 'success');
        onSaved(updated);
      } else {
        const { person: created, password } = await staffApi.createPerson(values);
        onSaved(created, password);
      }
      onClose();
    } catch (err) {
      setError(errorMessage(err));
      setSaving(false);
    }
  };

  return (
    <form onSubmit={submit}>
      <ModalBody className="grid gap-4 sm:grid-cols-2">
        <Field label="Código o matrícula" required>
          <input className="input font-mono" inputMode="numeric" value={values.code} onChange={event => set('code', onlyDigits(event.target.value, 10))} placeholder="220935928" />
        </Field>
        <Field label="Rol" required>
          <select className="input" value={values.role} onChange={event => set('role', event.target.value as PersonRole)}>
            {PERSON_ROLES.map(role => (
              <option key={role} value={role}>
                {PERSON_ROLE_LABELS[role]}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Nombre completo" required className="sm:col-span-2">
          <input className="input" value={values.fullName} onChange={event => set('fullName', event.target.value)} placeholder="Nombre(s) y apellidos" required />
        </Field>
        <Field label="Correo institucional" required className="sm:col-span-2">
          <input className="input" type="email" value={values.email} onChange={event => set('email', event.target.value)} placeholder="nombre.apellido@alumnos.udg.mx" required />
        </Field>
        <Field label="Carrera o adscripción">
          <input className="input" value={values.program} onChange={event => set('program', event.target.value)} placeholder="Ej. Informática" />
        </Field>
        <Field label="Vigencia de la credencial" hint="Déjala vacía si no vence.">
          <input
            className="input"
            type="date"
            min={dateKey(new Date())}
            value={values.credentialExpiresAt ?? ''}
            onChange={event => set('credentialExpiresAt', event.target.value || null)}
          />
        </Field>
        <div className="sm:col-span-2">
          <FormError message={error} />
        </div>
      </ModalBody>
      <ModalFooter>
        <Button variant="ghost" onClick={onClose}>
          Cancelar
        </Button>
        <Button type="submit" variant="primary" loading={saving}>
          {person ? 'Guardar cambios' : 'Dar de alta y generar contraseña'}
        </Button>
      </ModalFooter>
    </form>
  );
}

function exportCsv(people: Person[]) {
  downloadCsv(`personas-uniaccess-${dateKey(new Date())}.csv`, [
    ['Código', 'Nombre', 'Correo', 'Rol', 'Carrera o adscripción', 'Vigencia', 'Estado', 'Biometría', 'Accesos registrados', 'Último acceso'],
    ...people.map(person => [
      person.code,
      person.fullName,
      person.email,
      PERSON_ROLE_LABELS[person.role],
      person.program,
      person.credentialExpiresAt ?? 'Sin vencimiento',
      person.active ? 'Activa' : 'Baja',
      person.biometricDevices,
      person.totalRecords,
      person.lastAccessAt ? formatDate(person.lastAccessAt) : 'Sin registros',
    ]),
  ]);
}

function SummaryTile({ label, value, detail, live, warn, progress }: { label: string; value: number; detail: string; live?: boolean; warn?: boolean; progress?: number }) {
  return (
    <div className={`card p-4 ${warn ? 'border-amber-200 bg-amber-50' : ''}`}>
      <dt className={`flex items-center gap-2 text-sm font-semibold ${warn ? 'text-amber-800' : 'text-stone-600'}`}>
        {live && <PulseDot />}
        {warn && <BadgeAlert className="size-4" aria-hidden="true" />}
        {label}
      </dt>
      <dd className="mt-1 font-display text-3xl font-bold text-stone-900 tabular">{value.toLocaleString('es-MX')}</dd>
      <dd className="text-xs text-stone-500">{detail}</dd>
      {progress !== undefined && (
        <dd className="mt-2 h-2 rounded-full bg-stone-100" aria-hidden="true">
          <span className="block h-full rounded-full" style={{ width: `${Math.round(progress * 100)}%`, background: 'var(--chart-1)' }} />
        </dd>
      )}
    </div>
  );
}
