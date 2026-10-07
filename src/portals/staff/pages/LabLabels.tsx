import { ArrowLeft, Printer } from 'lucide-react';
import { Link, useParams } from 'react-router-dom';
import { Wordmark } from '../../../brand/Logo';
import { useAsync } from '../../../hooks/useAsync';
import { Button, buttonStyles } from '../../../ui/Button';
import { ErrorState, PageHeader, PageLoader } from '../../../ui/Display';
import { QrCode } from '../../../ui/QrCode';
import { staffApi } from '../api';

/** Hoja imprimible con la etiqueta QR de cada equipo del laboratorio */
export default function LabLabels() {
  const { id = '' } = useParams();
  const { data, error, reload } = useAsync(() => staffApi.room(id), [id]);
  if (!data) return error ? <ErrorState message={error} onRetry={reload} /> : <PageLoader />;

  return (
    <>
      <div className="no-print">
        <Link to={`/control/laboratorios/${id}`} className={buttonStyles('ghost', 'sm', 'mb-2 -ml-2')}>
          <ArrowLeft className="size-4" />
          {data.room.name}
        </Link>
        <PageHeader
          eyebrow="Etiquetas"
          title="Etiquetas QR de los equipos"
          description="Imprime en hoja adhesiva y pega cada etiqueta en su computadora."
          actions={
            <Button variant="primary" icon={<Printer className="size-4" />} onClick={() => window.print()}>
              Imprimir
            </Button>
          }
        />
      </div>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 print:grid-cols-4">
        {data.stations.map(station => (
          <div key={station.id} className="print-break rounded-xl border-2 border-dashed border-stone-300 bg-white p-3 text-center text-black">
            <div className="flex justify-center">
              <Wordmark size="sm" />
            </div>
            <QrCode value={`${window.location.origin}/acceso/equipo/${station.code}`} size={132} label={`QR del equipo ${station.label}`} className="mx-auto mt-2" />
            <p className="mt-1 font-display text-xl font-extrabold">{station.label}</p>
            <p className="font-mono text-sm tracking-[0.2em]">{station.code}</p>
            <p className="mt-1 text-[0.625rem] leading-tight text-stone-600">
              {data.room.name}
              <br />
              Escanea para registrar tu uso
            </p>
          </div>
        ))}
      </div>
    </>
  );
}
