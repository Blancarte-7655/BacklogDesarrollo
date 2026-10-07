import { CalendarDays, DoorOpen, UserRound } from 'lucide-react';
import { useParams } from 'react-router-dom';
import type { PublicInvitation } from '../../shared/contracts';
import { api } from '../api/http';
import { PublicShell } from '../brand/PublicShell';
import { useAsync } from '../hooks/useAsync';
import { capitalize, formatDate } from '../lib/format';
import { INVITATION_STATUS } from '../lib/invitationStatus';
import { Badge, ErrorState, PageLoader } from '../ui/Display';
import { QrCode } from '../ui/QrCode';


/** Página que abre el invitado desde su correo: muestra el QR que escanea vigilancia */
export default function GuestInvitation() {
  const { token = '' } = useParams();
  const { data, error, reload } = useAsync(() => api<PublicInvitation>(`/public/invitations/${token}`), [token]);

  return (
    <PublicShell eyebrow="Invitación al CUTlaquepaque" title={data ? `Hola, ${data.guestName.split(' ')[0]}` : 'Tu invitación'} width="narrow">
      {!data ? (
        error ? (
          <ErrorState message={error} onRetry={reload} />
        ) : (
          <div className="card">
            <PageLoader />
          </div>
        )
      ) : (
        <div className="card overflow-hidden text-center">
          <div className="px-6 pt-6">
            <Badge tone={INVITATION_STATUS[data.status].tone}>{INVITATION_STATUS[data.status].label}</Badge>
            <p className="mt-3 text-sm text-stone-600">Muestra este código en la caseta de vigilancia junto con una identificación oficial.</p>
          </div>
          <div className={`mx-auto mt-5 w-fit rounded-2xl border border-stone-200 p-3 ${data.status === 'pendiente' ? '' : 'opacity-30 grayscale'}`}>
            <QrCode value={data.checkUrl} size={240} label={`Código QR de la invitación ${data.code}`} />
          </div>
          <p className="mt-3 font-mono text-2xl font-semibold tracking-[0.3em] text-stone-900">{data.code}</p>
          <p className="text-xs text-stone-500">Si el QR no se puede leer, da este código.</p>

          <dl className="mt-6 grid gap-px border-t border-stone-100 bg-stone-100 text-left sm:grid-cols-3">
            {[
              { icon: CalendarDays, label: 'Fecha', value: capitalize(formatDate(data.visitDate, 'long')) },
              { icon: DoorOpen, label: 'Acceso', value: data.accessPointName },
              { icon: UserRound, label: 'Te invita', value: data.hostName },
            ].map(item => (
              <div key={item.label} className="bg-surface px-5 py-4">
                <dt className="flex items-center gap-1.5 text-xs text-stone-500">
                  <item.icon className="size-3.5" />
                  {item.label}
                </dt>
                <dd className="mt-0.5 text-sm font-semibold text-stone-800">{item.value}</dd>
              </div>
            ))}
          </dl>
        </div>
      )}
    </PublicShell>
  );
}
