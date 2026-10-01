import { BadgeCheck, DoorOpen, Fingerprint, History, LogIn, LogOut, MapPin, ShieldAlert, TriangleAlert } from 'lucide-react';
import { useState } from 'react';
import { Link } from 'react-router-dom';
import type { AccessDirection, AccessPoint } from '../../../../shared/contracts';
import { PERSON_ROLE_LABELS } from '../../../../shared/rules';
import { Ambient } from '../../../brand/Ambient';
import BlurText from '../../../components/reactbits/BlurText/BlurText';
import ClickSpark from '../../../components/reactbits/ClickSpark/ClickSpark';
import Counter from '../../../components/reactbits/Counter/Counter';
import { RecordBadges } from '../../../components/RecordBadges';
import { useAsync } from '../../../hooks/useAsync';
import { useNow } from '../../../hooks/useNow';
import { capitalize, formatDate, formatDateTime, formatDuration, formatTime, minutesSince } from '../../../lib/format';
import { firstName } from '../../../lib/text';
import { Button } from '../../../ui/Button';
import { Badge, ErrorState, PageLoader, PulseDot, SectionCard } from '../../../ui/Display';
import { useToast } from '../../../ui/toast';
import { personApi } from '../api';
import { AccessFlow } from '../components/AccessFlow';

export default function PersonHome() {
  const toast = useToast();
  const now = useNow(1000);
  const { data, loading, error, reload } = useAsync(() => personApi.overview(), [], { pollMs: 60_000 });
  const [flow, setFlow] = useState<{ open: boolean; direction: AccessDirection; point: AccessPoint | null }>({
    open: false,
    direction: 'in',
    point: null,
  });
  const [selectedPoint, setSelectedPoint] = useState('');

  if (!data) return loading ? <PageLoader /> : <ErrorState message={error ?? ''} onRetry={reload} />;

  const { profile, openRecord } = data;
  const allowed = data.accessPoints.filter(point => point.allowedRoles.includes(profile.role));
  const currentPoint = allowed.find(point => point.id === selectedPoint) ?? allowed[0] ?? null;
  const elapsed = openRecord?.checkIn ? minutesSince(openRecord.checkIn, now) : 0;

  const start = (direction: AccessDirection) => {
    const point = direction === 'out' && openRecord?.accessPointId ? allowed.find(p => p.id === openRecord.accessPointId) ?? currentPoint : currentPoint;
    if (!point) {
      toast.notify('No hay accesos disponibles para tu rol. Acude a la caseta de vigilancia.', 'warning');
      return;
    }
    setFlow({ open: true, direction, point });
  };

  return (
    <>
      <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="eyebrow text-terracota-600">{capitalize(formatDate(now, 'long'))}</p>
          <BlurText
            text={`Hola, ${firstName(profile.fullName)}`}
            delay={60}
            animationFrom={{ filter: 'blur(6px)', opacity: 0, y: -8 }}
            animationTo={[{ filter: 'blur(0px)', opacity: 1, y: 0 }]}
            className="mt-1 font-display text-3xl font-extrabold tracking-tight text-stone-900"
          />
          <p className="mt-0.5 text-sm text-stone-500">
            {PERSON_ROLE_LABELS[profile.role]} · <span className="font-mono">{profile.code}</span>
            {profile.program && ` · ${profile.program}`}
          </p>
        </div>
        {data.inside ? (
          <Badge tone="verde">
            <PulseDot />
            Dentro del campus
          </Badge>
        ) : (
          <Badge>Fuera del campus</Badge>
        )}
      </div>

      {!data.credentialValid && (
        <div className="mb-5 flex items-start gap-3 rounded-xl border border-red-200 bg-red-50 px-5 py-4 text-sm text-red-700">
          <ShieldAlert className="mt-0.5 size-5 shrink-0" />
          <p>
            <b>Tu credencial no está vigente.</b> No podrás registrar acceso hasta renovarla. Acude a Control Escolar o a la caseta de vigilancia.
          </p>
        </div>
      )}

      {profile.biometricDevices === 0 && (
        <div className="mb-5 flex flex-col gap-3 rounded-xl border border-amber-200 bg-amber-50 px-5 py-4 text-sm text-amber-800 sm:flex-row sm:items-center">
          <TriangleAlert className="size-5 shrink-0" />
          <p className="flex-1">
            <b>Falta vincular tu biometría.</b> Es lo que confirma tu identidad al registrar el acceso.
          </p>
          <Link to="/acceso/perfil">
            <Button size="sm" variant="accent" icon={<Fingerprint className="size-3.5" />}>
              Vincular ahora
            </Button>
          </Link>
        </div>
      )}

      <ClickSpark sparkColor={data.inside ? '#ffffff' : '#1e6b3a'} sparkRadius={24} sparkCount={10}>
        {data.inside && openRecord ? (
          <section className="brand-hero relative isolate overflow-hidden rounded-2xl p-6 text-white shadow-lg shadow-brand-strong/20 sm:p-7">
            <div className="absolute inset-0 -z-10">
              <Ambient />
            </div>
            <p className="eyebrow flex items-center gap-2 text-white/90">
              <PulseDot className="bg-leaf" />
              Dentro del campus
            </p>
            <p className="mt-1 text-sm text-white/80">
              Entrada por <b className="text-white">{openRecord.accessPointName}</b> a las{' '}
              <b className="text-white">{openRecord.checkIn && formatTime(openRecord.checkIn)}</b>
            </p>

            <div className="mt-5 flex items-center font-display">
              <Counter value={Math.floor(elapsed / 60)} places={[10, 1]} fontSize={48} textColor="#ffffff" fontWeight={800} gap={0} horizontalPadding={0} gradientHeight={0} />
              <span className="px-1 text-4xl font-extrabold text-white/60">:</span>
              <Counter value={elapsed % 60} places={[10, 1]} fontSize={48} textColor="#ffffff" fontWeight={800} gap={0} horizontalPadding={0} gradientHeight={0} />
            </div>
            <p className="text-xs text-white/70">Tiempo dentro del campus (horas y minutos)</p>

            <Button variant="accent" size="lg" className="mt-6 h-14 w-full text-base sm:w-auto" icon={<LogOut className="size-5" />} onClick={() => start('out')}>
              Registrar salida
            </Button>
          </section>
        ) : (
          <section className="card relative overflow-hidden p-6 sm:p-7">
            <span className="absolute inset-y-0 left-0 w-1.5 bg-brand" />
            <p className="eyebrow text-verde-700">Registro de acceso</p>
            <h2 className="mt-1 font-display text-2xl font-extrabold text-stone-900">Registrar entrada</h2>
            <p className="mt-2 text-sm text-stone-600">Elige el acceso por el que vas a ingresar y confirma con tu biometría.</p>

            {allowed.length ? (
              <>
                <p id="elige-acceso" className="mt-5 text-sm font-semibold text-stone-700">
                  Acceso
                </p>
                <div role="group" aria-labelledby="elige-acceso" className="mt-2 grid gap-3 sm:grid-cols-2">
                  {allowed.map(point => {
                    const active = currentPoint?.id === point.id;
                    return (
                      <button
                        key={point.id}
                        type="button"
                        onClick={() => setSelectedPoint(point.id)}
                        aria-pressed={active}
                        className={`min-h-16 rounded-xl border p-4 text-left transition ${active ? 'border-brand bg-verde-50/60 ring-2 ring-brand/20' : 'border-stone-200 hover:border-stone-300'}`}
                      >
                        <span className="flex items-center gap-2 font-semibold text-stone-900">
                          <DoorOpen className={`size-4 ${active ? 'text-verde-700' : 'text-stone-400'}`} />
                          {point.name}
                        </span>
                        <span className="mt-1 block text-xs text-stone-500">{point.description || 'Acceso del campus'}</span>
                        {point.lat !== null && (
                          <span className="mt-1.5 inline-flex items-center gap-1 text-xs text-stone-400">
                            <MapPin className="size-3" />
                            Valida ubicación ({point.radiusMeters} m)
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>
                <Button
                  variant="primary"
                  size="lg"
                  className="mt-6 h-14 w-full text-base sm:w-auto"
                  icon={<LogIn className="size-5" />}
                  disabled={!data.credentialValid}
                  onClick={() => start('in')}
                >
                  Registrar entrada
                </Button>
              </>
            ) : (
              <p className="mt-5 rounded-lg bg-stone-50 px-4 py-3 text-sm text-stone-500">
                No hay accesos habilitados para tu rol. Acude a la caseta de vigilancia para que registren tu entrada.
              </p>
            )}
          </section>
        )}
      </ClickSpark>

      <SectionCard
        className="mt-5"
        title="Mis últimos accesos"
        icon={History}
        action={
          <Link to="/acceso/historial" className="text-xs font-semibold text-verde-700 hover:underline">
            Ver historial
          </Link>
        }
      >
        {data.recent.length ? (
          <ul className="divide-y divide-stone-100">
            {data.recent.map(record => (
              <li key={record.id} className="flex flex-wrap items-center gap-x-4 gap-y-2 px-5 py-3">
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold text-stone-800">
                    {record.checkIn ? formatDateTime(record.checkIn) : 'Sin entrada'} → {record.checkOut ? formatTime(record.checkOut) : '…'}
                  </p>
                  <p className="text-xs text-stone-500">{record.accessPointName}</p>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  <RecordBadges record={record} />
                </div>
                <p className="w-20 text-right text-sm font-semibold text-stone-700">{record.checkOut ? formatDuration(record.minutes) : '—'}</p>
              </li>
            ))}
          </ul>
        ) : (
          <p className="px-5 py-10 text-center text-sm text-stone-500">
            <BadgeCheck className="mx-auto mb-2 size-5 text-stone-300" />
            Aún no tienes registros. Tu primera entrada aparecerá aquí.
          </p>
        )}
      </SectionCard>

      <AccessFlow
        open={flow.open}
        direction={flow.direction}
        accessPoint={flow.point}
        hasBiometrics={profile.biometricDevices > 0}
        onClose={() => setFlow(current => ({ ...current, open: false }))}
        onDone={result => {
          toast.notify(result.message, result.incident ? 'warning' : 'success');
          void reload();
        }}
      />
    </>
  );
}
