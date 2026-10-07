import { ArrowLeft, BadgeCheck, CalendarDays, DoorOpen, IdCard, MessageSquareText, UserRound, UserRoundCheck } from 'lucide-react';
import { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import type { GuestPass } from '../../../../shared/contracts';
import { errorMessage } from '../../../api/http';
import { useAsync } from '../../../hooks/useAsync';
import { codeFromScan } from '../../../lib/codes';
import { capitalize, dateKey, formatDate, formatDateTime } from '../../../lib/format';
import { INVITATION_STATUS } from '../../../lib/invitationStatus';
import { Button, buttonStyles } from '../../../ui/Button';
import { Badge, ErrorState, PageLoader } from '../../../ui/Display';
import { useToast } from '../../../ui/toast';
import { staffApi } from '../api';

/** Lo que ve vigilancia al escanear el QR de un invitado */
export default function InvitationCheck() {
  const { code: raw = '' } = useParams();
  const code = codeFromScan(raw);
  const toast = useToast();
  const { data, error, reload, setData } = useAsync(() => staffApi.invitation(code), [code]);
  const [admitting, setAdmitting] = useState(false);
  const [pass, setPass] = useState<GuestPass | null>(null);

  const admit = async () => {
    setAdmitting(true);
    try {
      const result = await staffApi.admitInvitation(code);
      setData(result.invitation);
      setPass(result.pass);
      toast.notify(`${result.invitation.guestName} puede pasar. Se avisó a su anfitrión.`, 'success');
    } catch (err) {
      toast.notify(errorMessage(err), 'error');
      void reload();
    } finally {
      setAdmitting(false);
    }
  };

  const back = (
    <Link to="/control/invitaciones" className={buttonStyles('ghost', 'sm', 'mb-4 -ml-2')}>
      <ArrowLeft className="size-4" />
      Invitaciones
    </Link>
  );

  if (!data) return error ? (<>{back}<ErrorState message={error} onRetry={reload} /></>) : <PageLoader />;

  const isToday = data.visitDate === dateKey(new Date());
  const canAdmit = data.status === 'pendiente' && isToday;
  const status = INVITATION_STATUS[data.status];

  return (
    <>
      {back}
      <div className="mx-auto max-w-xl">
        <article className={`card overflow-hidden ${pass ? 'ring-2 ring-brand' : ''}`}>
          <div className={`px-6 py-5 ${canAdmit || pass ? 'brand-hero text-white' : 'bg-stone-100'}`}>
            <p className={`text-xs font-semibold ${canAdmit || pass ? 'text-white/80' : 'text-stone-500'}`}>Invitación {data.code}</p>
            <h1 className={`mt-1 font-display text-2xl font-extrabold ${canAdmit || pass ? '' : 'text-stone-900'}`}>{data.guestName}</h1>
            <div className="mt-2">
              {pass ? <Badge tone="verde" icon={BadgeCheck}>Admitido</Badge> : <Badge tone={status.tone}>{!isToday && data.status === 'pendiente' ? 'No es para hoy' : status.label}</Badge>}
            </div>
          </div>
          <dl className="divide-y divide-stone-100">
            {[
              { icon: UserRound, label: 'Anfitrión', value: data.hostName },
              { icon: MessageSquareText, label: 'Motivo', value: data.reason },
              { icon: CalendarDays, label: 'Fecha', value: capitalize(formatDate(data.visitDate, 'long')) },
              { icon: DoorOpen, label: 'Acceso', value: data.accessPointName },
              ...(data.usedAt ? [{ icon: UserRoundCheck, label: 'Entró', value: formatDateTime(data.usedAt) }] : []),
            ].map(item => (
              <div key={item.label} className="flex items-center gap-3 px-6 py-3">
                <item.icon className="size-4 text-stone-400" />
                <dt className="w-24 text-sm text-stone-500">{item.label}</dt>
                <dd className="flex-1 text-sm font-semibold text-stone-800">{item.value}</dd>
              </div>
            ))}
          </dl>

          {canAdmit && !pass && (
            <div className="border-t border-stone-100 bg-stone-50 px-6 py-5">
              <p className="mb-3 flex items-start gap-2 text-sm text-stone-600">
                <IdCard className="mt-0.5 size-4 shrink-0 text-verde-700" />
                Verifica que el nombre coincida con una identificación oficial antes de admitir.
              </p>
              <Button variant="primary" size="lg" className="w-full" loading={admitting} icon={<UserRoundCheck className="size-5" />} onClick={() => void admit()}>
                Admitir y registrar entrada
              </Button>
            </div>
          )}
          {pass && (
            <p className="border-t border-stone-100 bg-verde-50 px-6 py-4 text-sm text-verde-800">
              Pase del día emitido y entrada registrada por {pass.accessPointName}. Su salida se registra en <b>Invitados</b>.
            </p>
          )}
        </article>
      </div>
    </>
  );
}
