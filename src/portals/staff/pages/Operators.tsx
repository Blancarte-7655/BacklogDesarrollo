import { Ban, CircleCheck, KeyRound, Pencil, ShieldCheck, UserRoundPlus } from 'lucide-react';
import { useState, type FormEvent } from 'react';
import type { StaffInput, StaffListItem, StaffRole } from '../../../../shared/contracts';
import { INSTITUTIONAL_EMAIL_RE, STAFF_ROLE_LABELS, STAFF_ROLES } from '../../../../shared/rules';
import { errorMessage } from '../../../api/http';
import { useAsync } from '../../../hooks/useAsync';
import { relativeTime } from '../../../lib/format';
import { Button } from '../../../ui/Button';
import { ConfirmDialog } from '../../../ui/ConfirmDialog';
import { Avatar, Badge, ErrorState, PageHeader, PageLoader, SectionCard } from '../../../ui/Display';
import { Field, FormError } from '../../../ui/Field';
import { Modal, ModalBody, ModalFooter } from '../../../ui/Modal';
import { useToast } from '../../../ui/toast';
import { staffApi } from '../api';
import { CredentialsDialog, type CredentialsRecipient } from '../components/CredentialsDialog';
import { useStaffContext } from '../context';

export default function Operators() {
  const toast = useToast();
  const { staff: me } = useStaffContext();
  const list = useAsync(() => staffApi.operators(), []);
  const [form, setForm] = useState<{ open: boolean; operator: StaffListItem | null }>({ open: false, operator: null });
  const [credentials, setCredentials] = useState<{ recipient: CredentialsRecipient; password: string; mode: 'welcome' | 'reset' } | null>(null);
  const [statusTarget, setStatusTarget] = useState<StaffListItem | null>(null);
  const [resetTarget, setResetTarget] = useState<StaffListItem | null>(null);

  if (!list.data) return list.loading ? <PageLoader /> : <ErrorState message={list.error ?? ''} onRetry={list.reload} />;

  return (
    <>
      <PageHeader
        eyebrow="Administración"
        title="Operadores del sistema"
        description="Cuentas de vigilancia y administración. Solo estos correos pueden entrar al portal institucional."
        actions={
          <Button variant="primary" icon={<UserRoundPlus className="size-4" />} onClick={() => setForm({ open: true, operator: null })}>
            Registrar operador
          </Button>
        }
      />

      <SectionCard title="Cuentas con acceso" icon={ShieldCheck} description={`${list.data.length} registradas`}>
        <div className="overflow-x-auto scrollbar-thin">
          <table className="w-full min-w-[820px] text-left text-sm">
            <thead>
              <tr className="border-b border-stone-200 bg-stone-50 text-[0.8125rem] font-semibold text-stone-600">
                <th className="px-5 py-2.5">Operador</th>
                <th className="px-5 py-2.5">Área</th>
                <th className="px-5 py-2.5">Rol</th>
                <th className="px-5 py-2.5">Pases emitidos</th>
                <th className="px-5 py-2.5">Último acceso</th>
                <th className="px-5 py-2.5">Estado</th>
                <th className="px-5 py-2.5 text-right">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-100">
              {list.data.map(operator => (
                <tr key={operator.id} className="hover:bg-stone-50/80">
                  <td className="px-5 py-3">
                    <div className="flex items-center gap-3">
                      <Avatar name={operator.fullName} />
                      <div className="min-w-0">
                        <p className="font-semibold text-stone-800">
                          {operator.fullName}
                          {operator.id === me.id && <span className="ml-1.5 text-xs font-normal text-stone-400">(tú)</span>}
                        </p>
                        <p className="text-xs text-stone-500">{operator.email}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-5 py-3 text-stone-600">{operator.area || '—'}</td>
                  <td className="px-5 py-3">
                    <Badge tone={operator.role === 'admin' ? 'terracota' : 'neutral'}>{STAFF_ROLE_LABELS[operator.role]}</Badge>
                  </td>
                  <td className="px-5 py-3 font-semibold text-stone-700">{operator.guestPasses}</td>
                  <td className="px-5 py-3 text-stone-600">{operator.lastLoginAt ? relativeTime(operator.lastLoginAt) : 'Nunca'}</td>
                  <td className="px-5 py-3">{operator.active ? <Badge tone="verde">Activo</Badge> : <Badge tone="red">Inactivo</Badge>}</td>
                  <td className="px-5 py-3 text-right whitespace-nowrap">
                    <Button size="sm" variant="ghost" icon={<Pencil className="size-3.5" />} aria-label="Editar" onClick={() => setForm({ open: true, operator })} />
                    <Button size="sm" variant="ghost" icon={<KeyRound className="size-3.5" />} aria-label="Nueva contraseña" onClick={() => setResetTarget(operator)} />
                    {operator.id !== me.id && (
                      <Button
                        size="sm"
                        variant="ghost"
                        icon={operator.active ? <Ban className="size-3.5 text-red-600" /> : <CircleCheck className="size-3.5 text-verde-600" />}
                        aria-label={operator.active ? 'Desactivar' : 'Reactivar'}
                        onClick={() => setStatusTarget(operator)}
                      />
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </SectionCard>

      <OperatorModal
        open={form.open}
        operator={form.operator}
        onClose={() => setForm(current => ({ ...current, open: false }))}
        onCreated={(created, password) => {
          setCredentials({ recipient: { id: created.id, name: created.fullName, email: created.email }, password, mode: 'welcome' });
          void list.reload();
        }}
        onUpdated={() => void list.reload()}
      />

      <CredentialsDialog
        open={credentials !== null}
        kind="staff"
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
        message={
          resetTarget?.id === me.id
            ? 'Se generará una contraseña nueva para tu cuenta y se cerrarán todas tus sesiones. Guárdala antes de continuar.'
            : `La contraseña de ${resetTarget?.fullName} dejará de funcionar y se cerrarán sus sesiones.`
        }
        onCancel={() => setResetTarget(null)}
        onConfirm={async () => {
          const target = resetTarget!;
          const { password } = await staffApi.resetOperatorPassword(target.id);
          setResetTarget(null);
          setCredentials({ recipient: { id: target.id, name: target.fullName, email: target.email }, password, mode: 'reset' });
        }}
      />

      <ConfirmDialog
        open={statusTarget !== null}
        title={statusTarget?.active ? 'Desactivar operador' : 'Reactivar operador'}
        variant={statusTarget?.active ? 'danger' : 'primary'}
        confirmLabel={statusTarget?.active ? 'Desactivar' : 'Reactivar'}
        message={
          statusTarget?.active
            ? `${statusTarget?.fullName} ya no podrá ingresar al portal institucional.`
            : `${statusTarget?.fullName} podrá volver a ingresar al portal institucional.`
        }
        onCancel={() => setStatusTarget(null)}
        onConfirm={async () => {
          await staffApi.setOperatorActive(statusTarget!.id, !statusTarget!.active);
          toast.notify(statusTarget!.active ? 'Operador desactivado.' : 'Operador reactivado.', 'success');
          setStatusTarget(null);
          void list.reload();
        }}
      />
    </>
  );
}

interface OperatorModalProps {
  open: boolean;
  operator: StaffListItem | null;
  onClose: () => void;
  onCreated: (operator: { id: string; fullName: string; email: string }, password: string) => void;
  onUpdated: () => void;
}

function OperatorModal(props: OperatorModalProps) {
  return (
    <Modal
      open={props.open}
      onClose={props.onClose}
      title={props.operator ? 'Editar operador' : 'Registrar operador'}
      description="El correo institucional será su usuario. La contraseña se genera automáticamente."
    >
      <OperatorForm {...props} />
    </Modal>
  );
}

function OperatorForm({ operator, onClose, onCreated, onUpdated }: OperatorModalProps) {
  const toast = useToast();
  const [values, setValues] = useState<StaffInput>({
    email: operator?.email ?? '',
    fullName: operator?.fullName ?? '',
    area: operator?.area ?? '',
    role: operator?.role ?? 'vigilancia',
  });
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (!INSTITUTIONAL_EMAIL_RE.test(values.email.trim())) {
      setError('Usa un correo institucional de la UdeG.');
      return;
    }
    setSaving(true);
    setError(null);
    try {
      if (operator) {
        await staffApi.updateOperator(operator.id, values);
        toast.notify('Operador actualizado.', 'success');
        onUpdated();
      } else {
        const { staff: created, password } = await staffApi.createOperator(values);
        onCreated(created, password);
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
        <Field label="Nombre completo" required className="sm:col-span-2">
          <input className="input" value={values.fullName} onChange={event => setValues({ ...values, fullName: event.target.value })} required />
        </Field>
        <Field label="Correo institucional" required className="sm:col-span-2">
          <input className="input" type="email" value={values.email} onChange={event => setValues({ ...values, email: event.target.value })} placeholder="nombre.apellido@udg.mx" required />
        </Field>
        <Field label="Área o caseta">
          <input className="input" value={values.area} onChange={event => setValues({ ...values, area: event.target.value })} placeholder="Ej. Caseta principal" />
        </Field>
        <Field label="Rol" hint={values.role === 'admin' ? 'Acceso total, incluida la gestión de personas.' : 'Tablero, invitados, registros y alertas.'}>
          <select className="input" value={values.role} onChange={event => setValues({ ...values, role: event.target.value as StaffRole })}>
            {STAFF_ROLES.map(role => (
              <option key={role} value={role}>
                {STAFF_ROLE_LABELS[role]}
              </option>
            ))}
          </select>
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
          {operator ? 'Guardar cambios' : 'Registrar y generar contraseña'}
        </Button>
      </ModalFooter>
    </form>
  );
}
