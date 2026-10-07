import { Info, Tv } from 'lucide-react';
import { useAsync } from '../../../hooks/useAsync';
import { EmptyState, ErrorState, PageHeader, PageLoader } from '../../../ui/Display';
import { PinCard } from '../../../ui/PinCard';
import { staffApi } from '../api';

/** PIN vigente de cada pantalla, para apoyar a docentes que no traen celular */
export default function Displays() {
  const { data, error, reload } = useAsync(() => staffApi.displays(), [], { pollMs: 60_000 });
  if (!data) return error ? <ErrorState message={error} onRetry={reload} /> : <PageLoader />;

  return (
    <>
      <PageHeader eyebrow="Campus" title="Pantallas con PIN" description="El PIN cambia en cada clase. Muéstralo solo al docente que imparte en ese salón." />
      <div className="mb-5 flex gap-3 rounded-xl border border-sky-200 bg-sky-50 px-5 py-4 text-sm text-sky-700">
        <Info className="mt-0.5 size-5 shrink-0" />
        <p>
          Evita que alumnos de otros salones se conecten a una pantalla para proyectar contenido. Cada docente ve en su UniAccess el PIN del salón donde da
          clase. Con "Simulador" puedes ver cómo lo pide la pantalla.
        </p>
      </div>
      {data.length ? (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {data.map(pin => (
            <PinCard key={pin.roomId} pin={pin} hideByDefault onExpire={() => void reload()} />
          ))}
        </div>
      ) : (
        <div className="card">
          <EmptyState icon={Tv} title="Sin pantallas registradas" description="Agrega salones con pantalla en Laboratorios o carga la demostración." />
        </div>
      )}
    </>
  );
}
