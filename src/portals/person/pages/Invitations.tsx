import { CalendarDays, Copy, MailCheck, Plus, QrCode as QrIcon, Share2, UserRoundPlus, XCircle } from 'lucide-react';
import { useState, type FormEvent } from 'react';
import { Navigate } from 'react-router-dom';
import type { Invitation, InvitationInput } from '../../../../shared/contracts';
import { errorMessage } from '../../../api/http';
import { useAsync } from '../../../hooks/useAsync';
import { copyText } from '../../../lib/clipboard';
import { capitalize, dateKey, formatDate } from '../../../lib/format';
import { INVITATION_STATUS } from '../../../lib/invitationStatus';
import { Button } from '../../../ui/Button';
import { ConfirmDialog } from '../../../ui/ConfirmDialog';
import { Badge, EmptyState, ErrorState, PageHeader, PageLoader, SectionCard } from '../../../ui/Display';
import { Field, FormError } from '../../../ui/Field';
import { Modal, ModalBody, ModalFooter } from '../../../ui/Modal';
import { QrCode } from '../../../ui/QrCode';
import { useToast } from '../../../ui/toast';
import { personApi } from '../api';
import { useSession } from '../session';

export const guestLink = (invitation: Invitation) => `${window.location.origin}/invitacion/${invitation.token}`;
const checkLink = (invitation: Invitation) => `${window.location.origin}/control/invitaciones/${invitation.code}`;

export default function Invitations() {
  const { user } = useSession();
  const toast = useToast();
  const list = useAsync(() => personApi.invitations(), []);
  const overview = useAsync(() => personApi.overview(), []);
  const [creating, setCreating] = useState(false);
  const [shown, setShown] = useState<Invitation | null>(null);
  const [cancelling, setCancelling] = useState<Invitation | null>(null);

  if (user?.role === 'alumno') return <Navigate to="/acceso" replace />;
  if (!list.data) return list.error ? <ErrorState message={list.error} onRetry={list.reload} /> : <PageLoader />;

  const upcoming = list.data.filter(i => i.status === 'pendiente');
  const past = list.data.filter(i => i.status !== 'pendiente');

  const cancel = async () => {
    if (!cancelling) return;
    try {
      await personApi.cancelInvitation(cancelling.id);
      toast.notify('Invitación cancelada. El QR ya no sirve.', 'success');
      void list.reload();
    } catch (error) {
      toast.notify(errorMessage(error), 'error');
    }
    setCancelling(null);
  };

  return (
    <>
      <PageHeader
        eyebrow="Visitantes"
        title="Mis invitados"
        description="Registra a tus visitantes antes de que lleguen: entran mostrando un QR, sin filas."
        actions={
          <Button variant="primary" icon={<Plus className="size-4" />} onClick={() => setCreating(true)}>
            Nueva invitación
          </Button>
        }
      />

      <SectionCard title="Próximas visitas" icon={CalendarDays}>
        {upcoming.length ? (
          <InvitationList items={upcoming} onShow={setShown} onCancel={setCancelling} />
        ) : (
          <EmptyState
            icon={UserRoundPlus}
            title="Sin visitas programadas"
            description="Crea una invitación y comparte el QR con tu invitado."
            action={
              <Button variant="primary" icon={<Plus className="size-4" />} onClick={() => setCreating(true)}>
                Nueva invitación
              </Button>
            }
          />
        )}
      </SectionCard>

      {!!past.length && (
        <SectionCard className="mt-5" title="Historial" icon={MailCheck}>
          <InvitationList items={past} onShow={setShown} />
        </SectionCard>
      )}

      <CreateInvitationModal
        open={creating}
        accessPoints={(overview.data?.accessPoints ?? []).map(p => ({ id: p.id, name: p.name }))}
        onClose={() => setCreating(false)}
        onCreated={invitation => {
          setCreating(false);
          setShown(invitation);
          void list.reload();
        }}
      />

      <Modal open={!!shown} onClose={() => setShown(null)} title="Invitación" description={shown?.guestName} size="sm">
        {shown && <InvitationQr invitation={shown} />}
      </Modal>

      <ConfirmDialog
        open={!!cancelling}
        title="Cancelar invitación"
        message={`${cancelling?.guestName} ya no podrá entrar con este QR.`}
        confirmLabel="Cancelar invitación"
        onCancel={() => setCancelling(null)}
        onConfirm={cancel}
      />
    </>
  );
}

function InvitationList({ items, onShow, onCancel }: { items: Invitation[]; onShow: (i: Invitation) => void; onCancel?: (i: Invitation) => void }) {
  return (
    <ul className="divide-y divide-stone-100">
      {items.map(invitation => (
        <li key={invitation.id} className="flex flex-wrap items-center gap-3 px-5 py-3.5">
          <div className="min-w-0 flex-1">
            <p className="font-semibold text-stone-900">{invitation.guestName}</p>
            <p className="text-xs text-stone-500">
              {capitalize(formatDate(invitation.visitDate, 'weekday'))} · {invitation.accessPointName} · {invitation.reason}
            </p>
          </div>
          <Badge tone={INVITATION_STATUS[invitation.status].tone}>{INVITATION_STATUS[invitation.status].label}</Badge>
          <div className="flex gap-1.5">
            {invitation.status === 'pendiente' && (
              <Button size="sm" icon={<QrIcon className="size-3.5" />} onClick={() => onShow(invitation)}>
                QR
              </Button>
            )}
            {onCancel && (
              <Button size="sm" variant="ghost" icon={<XCircle className="size-3.5" />} onClick={() => onCancel(invitation)} aria-label={`Cancelar invitación de ${invitation.guestName}`} />
            )}
          </div>
        </li>
      ))}
    </ul>
  );
}

function InvitationQr({ invitation }: { invitation: Invitation }) {
  const toast = useToast();
  const link = guestLink(invitation);
  const share = async () => {
    const text = `Te espero en el CUTlaquepaque el ${formatDate(invitation.visitDate, 'long')}. Muestra este QR en la caseta: ${link}`;
    if (navigator.share) {
      await navigator.share({ title: 'Invitación al CUTlaquepaque', text }).catch(() => undefined);
    } else if (await copyText(text)) toast.notify('Mensaje copiado. Pégalo en WhatsApp o correo.', 'success');
  };
  return (
    <>
      <ModalBody className="text-center">
        <div className="mx-auto w-fit rounded-2xl border border-stone-200 p-3">
          <QrCode value={checkLink(invitation)} size={220} label={`Código QR de la invitación de ${invitation.guestName}`} />
        </div>
        <p className="mt-3 font-mono text-xl font-semibold tracking-[0.3em] text-stone-900">{invitation.code}</p>
        <p className="mt-1 text-sm text-stone-500">
          {capitalize(formatDate(invitation.visitDate, 'long'))} · {invitation.accessPointName}
        </p>
        {invitation.guestEmail && <p className="mt-2 text-xs text-verde-700">Se envió la invitación a {invitation.guestEmail}</p>}
      </ModalBody>
      <ModalFooter>
        <Button
          icon={<Copy className="size-4" />}
          onClick={async () => {
            if (await copyText(link)) toast.notify('Liga copiada.', 'success');
          }}
        >
          Copiar liga
        </Button>
        <Button variant="primary" icon={<Share2 className="size-4" />} onClick={() => void share()}>
          Compartir
        </Button>
      </ModalFooter>
    </>
  );
}

const EMPTY: InvitationInput = { guestName: '', guestEmail: '', reason: '', visitDate: dateKey(new Date()), accessPointId: '' };

function CreateInvitationModal({
  open,
  accessPoints,
  onClose,
  onCreated,
}: {
  open: boolean;
  accessPoints: Array<{ id: string; name: string }>;
  onClose: () => void;
  onCreated: (invitation: Invitation) => void;
}) {
  const [values, setValues] = useState<InvitationInput>(EMPTY);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const set = <K extends keyof InvitationInput>(key: K, value: InvitationInput[K]) => setValues(current => ({ ...current, [key]: value }));
  const pointId = values.accessPointId || accessPoints[0]?.id || '';

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setSaving(true);
    setError(null);
    try {
      const invitation = await personApi.createInvitation({ ...values, accessPointId: pointId });
      setValues({ ...EMPTY, visitDate: dateKey(new Date()) });
      onCreated(invitation);
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal open={open} onClose={onClose} title="Nueva invitación" description="Tu invitado recibirá un QR para entrar.">
      <form onSubmit={submit}>
        <ModalBody className="grid gap-4 sm:grid-cols-2">
          <Field label="Nombre completo del invitado" required className="sm:col-span-2">
            <input className="input" value={values.guestName} onChange={e => set('guestName', e.target.value)} autoComplete="off" required minLength={5} />
          </Field>
          <Field label="Correo del invitado" hint="Opcional: le enviamos la liga con su QR." className="sm:col-span-2">
            <input className="input" type="email" value={values.guestEmail} onChange={e => set('guestEmail', e.target.value)} autoComplete="off" />
          </Field>
          <Field label="Motivo de la visita" required className="sm:col-span-2">
            <input className="input" value={values.reason} onChange={e => set('reason', e.target.value)} placeholder="Plática, reunión, entrega…" required minLength={3} />
          </Field>
          <Field label="Fecha" required>
            <input className="input" type="date" min={dateKey(new Date())} value={values.visitDate} onChange={e => set('visitDate', e.target.value)} required />
          </Field>
          <Field label="Acceso" required>
            <select className="input" value={pointId} onChange={e => set('accessPointId', e.target.value)} required>
              {accessPoints.map(point => (
                <option key={point.id} value={point.id}>
                  {point.name}
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
          <Button type="submit" variant="primary" loading={saving} icon={<QrIcon className="size-4" />}>
            Crear invitación
          </Button>
        </ModalFooter>
      </form>
    </Modal>
  );
}
