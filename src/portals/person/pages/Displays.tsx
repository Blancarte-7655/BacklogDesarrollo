import { Info, Tv } from 'lucide-react';
import { Navigate } from 'react-router-dom';
import { useAsync } from '../../../hooks/useAsync';
import { formatDuration, shortTime } from '../../../lib/format';
import { WEEKDAY_LABELS } from '../../../../shared/campus';
import { EmptyState, ErrorState, PageHeader, PageLoader } from '../../../ui/Display';
import { PinCard } from '../../../ui/PinCard';
import { personApi } from '../api';
import { useSession } from '../session';

/** PIN de la pantalla del salón donde el docente da clase en este momento */
export default function Displays() {
  const { user } = useSession();
  const pins = useAsync(() => personApi.displays(), [], { pollMs: 60_000 });
  const schedule = useAsync(() => personApi.schedule(), []);

  if (user?.role !== 'docente') return <Navigate to="/acceso" replace />;
  if (!pins.data) return pins.error ? <ErrorState message={pins.error} onRetry={pins.reload} /> : <PageLoader />;
  const next = schedule.data?.next;

  return (
    <>
      <PageHeader eyebrow="Salones" title="Pantallas con PIN" description="Solo tú ves el PIN del salón donde das clase; cambia en cada clase." />

      {pins.data.length ? (
        <div className="grid gap-4 sm:grid-cols-2">
          {pins.data.map(pin => (
            <PinCard key={pin.roomId} pin={pin} onExpire={() => void pins.reload()} />
          ))}
        </div>
      ) : (
        <div className="card">
          <EmptyState
            icon={Tv}
            title="No tienes clase en este momento"
            description={
              next
                ? `Tu siguiente clase es ${next.subject} en ${next.room}, ${WEEKDAY_LABELS[next.weekday].toLowerCase()} a las ${shortTime(next.start)}${next.startsInMinutes < 24 * 60 ? ` (en ${formatDuration(next.startsInMinutes)})` : ''}. El PIN aparece 10 minutos antes.`
                : 'El PIN aparece 10 minutos antes de cada clase.'
            }
          />
        </div>
      )}

      <div className="mt-5 flex gap-3 rounded-xl border border-sky-200 bg-sky-50 px-5 py-4 text-sm text-sky-700">
        <Info className="mt-0.5 size-5 shrink-0" />
        <p>
          Así se evita que alumnos de otros salones se conecten a tu pantalla: sin el PIN vigente, la pantalla no acepta la conexión. Al terminar la clase el
          PIN deja de servir.
        </p>
      </div>
    </>
  );
}
