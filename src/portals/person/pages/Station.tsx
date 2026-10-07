import { browserSupportsWebAuthn, startAuthentication } from '@simplewebauthn/browser';
import { CircleStop, Fingerprint, History, KeyRound, Monitor, MonitorCheck, MonitorX, TriangleAlert, Wrench } from 'lucide-react';
import { useState, type FormEvent } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { errorMessage } from '../../../api/http';
import { useAsync } from '../../../hooks/useAsync';
import { useNow } from '../../../hooks/useNow';
import { codeFromScan } from '../../../lib/codes';
import { formatDateTime, formatDuration, formatTime, minutesSince } from '../../../lib/format';
import { Button, buttonStyles } from '../../../ui/Button';
import { Badge, ErrorState, PageHeader, PageLoader, PulseDot, SectionCard } from '../../../ui/Display';
import { Field, FormError } from '../../../ui/Field';
import { Modal, ModalBody, ModalFooter } from '../../../ui/Modal';
import { QrScanner, ScanButton } from '../../../ui/QrScanner';
import { useToast } from '../../../ui/toast';
import { personApi } from '../api';

/**
 * Uso de equipos del laboratorio: cada computadora tiene una etiqueta QR. La persona la escanea,
 * confirma con su biometría y el equipo queda a su nombre hasta que lo libera o sale del campus.
 * Así cualquier daño o mal uso se puede ligar a quien usaba el equipo.
 */
export default function Station() {
  const { code: rawCode } = useParams();
  const code = rawCode ? codeFromScan(rawCode) : '';
  const toast = useToast();
  const navigate = useNavigate();
  const now = useNow(30_000);
  const status = useAsync(() => personApi.stationStatus(), []);
  const overview = useAsync(() => personApi.overview(), []);
  const station = useAsync(() => (code ? personApi.station(code) : Promise.resolve(null)), [code]);
  const [typed, setTyped] = useState('');
  const [scanning, setScanning] = useState(false);
  const [busy, setBusy] = useState(false);
  const [reporting, setReporting] = useState<string | null>(null);

  if (!status.data) return status.error ? <ErrorState message={status.error} onRetry={status.reload} /> : <PageLoader />;
  const { session, history } = status.data;

  const goTo = (value: string) => {
    const clean = codeFromScan(value);
    if (clean) navigate(`/acceso/equipo/${clean}`);
  };

  const start = async () => {
    if (!station.data) return;
    setBusy(true);
    try {
      let biometric: Record<string, unknown> | null = null;
      if ((overview.data?.profile.biometricDevices ?? 0) > 0 && browserSupportsWebAuthn()) {
        const optionsJSON = await personApi.authenticationOptions();
        biometric = (await startAuthentication({ optionsJSON })) as unknown as Record<string, unknown>;
      }
      const started = await personApi.startStation(station.data.code, biometric);
      toast.notify(`Listo: ${started.stationLabel} quedó registrado a tu nombre.`, 'success');
      void status.reload();
      void station.reload();
    } catch (error) {
      toast.notify((error as Error).name === 'NotAllowedError' ? 'Se canceló la verificación biométrica.' : errorMessage(error), 'error');
    } finally {
      setBusy(false);
    }
  };

  const end = async () => {
    setBusy(true);
    try {
      await personApi.endStation();
      toast.notify('Liberaste el equipo. ¡Gracias!', 'success');
      void status.reload();
      void station.reload();
    } catch (error) {
      toast.notify(errorMessage(error), 'error');
    } finally {
      setBusy(false);
    }
  };

  const submitCode = (event: FormEvent) => {
    event.preventDefault();
    goTo(typed);
  };

  return (
    <>
      <PageHeader eyebrow="Laboratorios" title="Uso de equipos" description="Registra la computadora que usas para que nadie más responda por ella." />

      {session ? (
        <section className="brand-hero relative overflow-hidden rounded-2xl p-6 text-white shadow-lg sm:p-7">
          <p className="eyebrow flex items-center gap-2 text-white/90">
            <PulseDot className="bg-leaf" />
            Equipo en uso
          </p>
          <p className="mt-2 font-display text-4xl font-extrabold">{session.stationLabel}</p>
          <p className="text-white/80">
            {session.roomName} · desde las {formatTime(session.startedAt)} ({formatDuration(minutesSince(session.startedAt, now))})
          </p>
          <div className="mt-6 flex flex-wrap gap-2">
            <Button variant="accent" size="lg" loading={busy} icon={<CircleStop className="size-5" />} onClick={() => void end()}>
              Terminar uso
            </Button>
          </div>
          <p className="mt-4 text-xs text-white/70">Si sales del campus, el equipo se libera solo.</p>
        </section>
      ) : code ? (
        <SectionCard title="Equipo" icon={Monitor}>
          {!station.data ? (
            station.error ? (
              <div className="p-5">
                <FormError message={station.error} />
                <Link to="/acceso/equipo" className={buttonStyles('secondary', 'sm', 'mt-3')}>
                  Escribir otro código
                </Link>
              </div>
            ) : (
              <PageLoader />
            )
          ) : (
            <div className="p-5 sm:p-6">
              <div className="flex flex-wrap items-center gap-4">
                <span className="grid size-16 place-items-center rounded-2xl bg-verde-50 text-verde-700">
                  <Monitor className="size-8" />
                </span>
                <div className="flex-1">
                  <p className="font-display text-2xl font-extrabold text-stone-900">{station.data.label}</p>
                  <p className="text-sm text-stone-500">
                    {station.data.roomName} · código <span className="font-mono">{station.data.code}</span>
                  </p>
                </div>
                {!station.data.inService ? (
                  <Badge tone="red" icon={MonitorX}>
                    Fuera de servicio
                  </Badge>
                ) : station.data.occupant ? (
                  <Badge tone="amber">Ocupado</Badge>
                ) : (
                  <Badge tone="verde" icon={MonitorCheck}>
                    Disponible
                  </Badge>
                )}
              </div>

              {!!station.data.openIncidents && (
                <p className="mt-4 flex items-start gap-2 rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-800">
                  <TriangleAlert className="mt-0.5 size-4 shrink-0" />
                  Este equipo tiene {station.data.openIncidents} falla(s) reportada(s) que ya están registradas y no se te atribuyen.
                </p>
              )}

              <div className="mt-6 flex flex-wrap gap-2">
                <Button
                  variant="primary"
                  size="lg"
                  loading={busy}
                  disabled={!station.data.inService || !!station.data.occupant}
                  icon={<Fingerprint className="size-5" />}
                  onClick={() => void start()}
                >
                  Usar este equipo
                </Button>
                <Button size="lg" icon={<Wrench className="size-4" />} onClick={() => setReporting(station.data!.code)}>
                  Reportar una falla
                </Button>
              </div>
              <p className="mt-3 text-xs text-stone-500">
                Antes de empezar revisa el equipo. Si encuentras daños o una contraseña pegada, repórtalo para que no quede a tu nombre.
              </p>
            </div>
          )}
        </SectionCard>
      ) : (
        <SectionCard title="Registrar un equipo" icon={KeyRound}>
          <div className="grid gap-6 p-5 sm:grid-cols-[1fr_auto] sm:p-6">
            <ol className="space-y-3 text-sm text-stone-600">
              {[
                'Registra tu entrada al campus.',
                'Escanea con la cámara la etiqueta QR pegada en la computadora.',
                'Confirma con tu huella o rostro: el equipo queda a tu nombre.',
                'Al terminar toca "Terminar uso".',
              ].map((text, index) => (
                <li key={text} className="flex gap-3">
                  <span className="grid size-6 shrink-0 place-items-center rounded-full bg-verde-50 text-xs font-bold text-verde-700">{index + 1}</span>
                  {text}
                </li>
              ))}
            </ol>
            <form onSubmit={submitCode} className="space-y-3 sm:w-64">
              <Field label="Código del equipo" hint="6 caracteres, en la etiqueta.">
                <input
                  className="input font-mono tracking-[0.2em] uppercase"
                  value={typed}
                  onChange={event => setTyped(event.target.value.toUpperCase())}
                  maxLength={6}
                  autoComplete="off"
                  placeholder="K7QX2M"
                />
              </Field>
              <div className="flex gap-2">
                <Button type="submit" variant="primary" className="flex-1" disabled={typed.trim().length < 4}>
                  Buscar
                </Button>
                <ScanButton onClick={() => setScanning(true)} />
              </div>
            </form>
          </div>
        </SectionCard>
      )}


      <SectionCard className="mt-5" title="Mis últimos usos" icon={History}>
        {history.length ? (
          <ul className="divide-y divide-stone-100">
            {history.map(item => (
              <li key={item.id} className="flex flex-wrap items-center justify-between gap-2 px-5 py-3 text-sm">
                <span>
                  <b className="text-stone-800">{item.stationLabel}</b> <span className="text-stone-500">· {item.roomName}</span>
                </span>
                <span className="text-stone-500">
                  {formatDateTime(item.startedAt)} · {item.endedAt ? formatDuration(item.minutes) : 'en uso'}
                </span>
              </li>
            ))}
          </ul>
        ) : (
          <p className="px-5 py-8 text-center text-sm text-stone-500">Aún no has usado equipos.</p>
        )}
      </SectionCard>

      <QrScanner
        open={scanning}
        onClose={() => setScanning(false)}
        title="Escanear etiqueta del equipo"
        onResult={text => {
          setScanning(false);
          goTo(text);
        }}
      />
      <ReportModal
        code={reporting}
        onClose={() => setReporting(null)}
        onDone={() => {
          setReporting(null);
          toast.notify('Gracias. La falla quedó registrada para el encargado del laboratorio.', 'success');
          void station.reload();
        }}
      />
    </>
  );
}

function ReportModal({ code, onClose, onDone }: { code: string | null; onClose: () => void; onDone: () => void }) {
  const [text, setText] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (!code) return;
    setSaving(true);
    setError(null);
    try {
      await personApi.reportStation(code, text);
      setText('');
      onDone();
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setSaving(false);
    }
  };
  return (
    <Modal open={!!code} onClose={onClose} title="Reportar una falla" description="Describe lo que encontraste en el equipo." size="sm">
      <form onSubmit={submit}>
        <ModalBody className="space-y-3">
          <div className="flex flex-wrap gap-1.5">
            {['No enciende', 'Teclado o mouse dañado', 'Contraseña pegada en el monitor', 'Programas no autorizados', 'Sin internet'].map(option => (
              <button key={option} type="button" onClick={() => setText(option)} className="rounded-full bg-stone-100 px-3 py-1 text-xs font-medium text-stone-600 hover:bg-verde-50 hover:text-verde-700">
                {option}
              </button>
            ))}
          </div>
          <textarea className="input min-h-24" value={text} onChange={event => setText(event.target.value)} required minLength={5} maxLength={500} aria-label="Descripción de la falla" />
          <FormError message={error} />
        </ModalBody>
        <ModalFooter>
          <Button variant="ghost" onClick={onClose}>
            Cancelar
          </Button>
          <Button type="submit" variant="primary" loading={saving}>
            Enviar reporte
          </Button>
        </ModalFooter>
      </form>
    </Modal>
  );
}
