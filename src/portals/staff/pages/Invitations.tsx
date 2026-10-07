import { CalendarDays, ChevronRight, KeyRound, QrCode as QrIcon } from 'lucide-react';
import { useState, type FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAsync } from '../../../hooks/useAsync';
import { codeFromScan } from '../../../lib/codes';
import { capitalize, dateKey, formatDate, formatTime } from '../../../lib/format';
import { INVITATION_STATUS } from '../../../lib/invitationStatus';
import { Button } from '../../../ui/Button';
import { Badge, EmptyState, ErrorState, PageHeader, PageLoader, SectionCard } from '../../../ui/Display';
import { Field } from '../../../ui/Field';
import { QrScanner, ScanButton } from '../../../ui/QrScanner';
import { staffApi } from '../api';

/** Invitaciones con QR creadas por docentes y personal: vigilancia las valida en la caseta */
export default function Invitations() {
  const navigate = useNavigate();
  const [date, setDate] = useState(dateKey(new Date()));
  const [code, setCode] = useState('');
  const [scanning, setScanning] = useState(false);
  const { data, error, reload } = useAsync(() => staffApi.invitations(date), [date], { pollMs: 30_000 });

  const open = (value: string) => {
    const clean = codeFromScan(value);
    if (clean) navigate(`/control/invitaciones/${clean}`);
  };
  const submit = (event: FormEvent) => {
    event.preventDefault();
    open(code);
  };

  const pending = data?.filter(i => i.status === 'pendiente').length ?? 0;

  return (
    <>
      <PageHeader
        eyebrow="Caseta"
        title="Invitaciones QR"
        description="Los visitantes llegan con un QR que les envió su anfitrión. Escanéalo o escribe el código."
      />

      <div className="grid gap-5 lg:grid-cols-[22rem_1fr]">
        <SectionCard title="Validar invitación" icon={KeyRound} bodyClassName="p-5">
          <form onSubmit={submit} className="space-y-3">
            <Field label="Código de 8 caracteres">
              <input
                className="input font-mono text-lg tracking-[0.25em] uppercase"
                value={code}
                onChange={event => setCode(event.target.value.toUpperCase())}
                maxLength={8}
                placeholder="K7QX2M9P"
                autoComplete="off"
              />
            </Field>
            <div className="flex gap-2">
              <Button type="submit" variant="primary" className="flex-1" disabled={code.trim().length < 8}>
                Revisar
              </Button>
              <ScanButton onClick={() => setScanning(true)} />
            </div>
          </form>
          <p className="mt-4 text-xs text-stone-500">
            También puedes escanear el QR con la cámara normal del celular: abre esta misma pantalla con la invitación.
          </p>
        </SectionCard>

        <SectionCard
          title={date === dateKey(new Date()) ? 'Esperados hoy' : capitalize(formatDate(date, 'long'))}
          description={data ? `${data.length} invitaciones · ${pending} por llegar` : undefined}
          icon={CalendarDays}
          action={<input type="date" className="input h-9 w-40" value={date} onChange={event => setDate(event.target.value)} aria-label="Fecha" />}
        >
          {!data ? (
            error ? (
              <div className="p-5">
                <ErrorState message={error} onRetry={reload} />
              </div>
            ) : (
              <PageLoader />
            )
          ) : data.length ? (
            <ul className="divide-y divide-stone-100">
              {data.map(invitation => (
                <li key={invitation.id}>
                  <Link to={`/control/invitaciones/${invitation.code}`} className="flex items-center gap-3 px-5 py-3.5 transition hover:bg-stone-50">
                    <div className="min-w-0 flex-1">
                      <p className="font-semibold text-stone-900">{invitation.guestName}</p>
                      <p className="truncate text-xs text-stone-500">
                        Invita {invitation.hostName} · {invitation.reason} · {invitation.accessPointName}
                      </p>
                    </div>
                    <span className="hidden font-mono text-xs text-stone-400 sm:block">{invitation.code}</span>
                    <Badge tone={INVITATION_STATUS[invitation.status].tone}>
                      {invitation.status === 'usada' && invitation.usedAt ? `Llegó ${formatTime(invitation.usedAt)}` : INVITATION_STATUS[invitation.status].label}
                    </Badge>
                    <ChevronRight className="size-4 text-stone-400" />
                  </Link>
                </li>
              ))}
            </ul>
          ) : (
            <EmptyState icon={QrIcon} title="Sin invitaciones" description="Nadie registró visitantes para esta fecha." />
          )}
        </SectionCard>
      </div>

      <QrScanner
        open={scanning}
        onClose={() => setScanning(false)}
        title="Escanear invitación"
        onResult={text => {
          setScanning(false);
          open(text);
        }}
      />
    </>
  );
}
