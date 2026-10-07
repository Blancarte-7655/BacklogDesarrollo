import { Download, FileSpreadsheet, Sheet } from 'lucide-react';
import { useState } from 'react';
import { errorMessage } from '../../../api/http';
import { downloadFile } from '../../../lib/download';
import { dateKey } from '../../../lib/format';
import { Button } from '../../../ui/Button';
import { PageHeader, SectionCard } from '../../../ui/Display';
import { Field, FormError } from '../../../ui/Field';
import { Segmented } from '../../../ui/Segmented';
import { useToast } from '../../../ui/toast';

const addDays = (date: Date, days: number) => new Date(date.getFullYear(), date.getMonth(), date.getDate() + days);

type Preset = 'hoy' | '7' | '30' | 'mes' | 'otro';

const SHEETS = [
  ['Resumen', 'Totales del periodo: accesos, personas distintas, horas, alertas.'],
  ['Registros', 'Cada entrada y salida con persona, acceso, duración e incidencias.'],
  ['Por día', 'Entradas y personas por día para ver la tendencia.'],
  ['Por tipo de persona', 'Alumnos, docentes, personal e invitados.'],
  ['Por acceso', 'Qué casetas se usan más.'],
  ['Por hora', 'Horas pico para planear la vigilancia.'],
  ['Alertas', 'Alertas generadas y si se revisaron.'],
  ['Invitados', 'Pases e invitaciones con anfitrión y hora de llegada.'],
  ['Uso de equipos', 'Quién usó cada computadora y cuánto tiempo.'],
  ['Incidencias de equipos', 'Fallas y mal uso con la persona ligada.'],
] as const;

function rangeFor(preset: Preset): { from: string; to: string } {
  const today = new Date();
  if (preset === 'hoy') return { from: dateKey(today), to: dateKey(today) };
  if (preset === '7') return { from: dateKey(addDays(today, -6)), to: dateKey(today) };
  if (preset === '30') return { from: dateKey(addDays(today, -29)), to: dateKey(today) };
  return { from: dateKey(new Date(today.getFullYear(), today.getMonth(), 1)), to: dateKey(today) };
}

export default function Reports() {
  const toast = useToast();
  const [preset, setPreset] = useState<Preset>('7');
  const [range, setRange] = useState(rangeFor('7'));
  const [downloading, setDownloading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const choose = (value: Preset) => {
    setPreset(value);
    if (value !== 'otro') setRange(rangeFor(value));
  };

  const download = async () => {
    setDownloading(true);
    setError(null);
    try {
      await downloadFile(`/staff/reports/excel?from=${range.from}&to=${range.to}`, `uniaccess-reporte-${range.from}_a_${range.to}.xlsx`);
      toast.notify('Reporte descargado.', 'success');
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setDownloading(false);
    }
  };

  return (
    <>
      <PageHeader eyebrow="Análisis" title="Reportes en Excel" description="Descarga la información del periodo en un libro de Excel listo para filtrar y graficar." />
      <div className="grid gap-5 lg:grid-cols-[1fr_1.2fr]">
        <SectionCard title="Periodo" icon={FileSpreadsheet} bodyClassName="space-y-4 p-5">
          <Segmented
            id="report-preset"
            value={preset}
            onChange={choose}
            options={[
              { value: 'hoy', label: 'Hoy' },
              { value: '7', label: '7 días' },
              { value: '30', label: '30 días' },
              { value: 'mes', label: 'Este mes' },
              { value: 'otro', label: 'Otro' },
            ]}
          />
          <div className="grid grid-cols-2 gap-3">
            <Field label="Desde">
              <input
                className="input"
                type="date"
                value={range.from}
                max={range.to}
                onChange={event => {
                  setPreset('otro');
                  setRange(r => ({ ...r, from: event.target.value }));
                }}
              />
            </Field>
            <Field label="Hasta">
              <input
                className="input"
                type="date"
                value={range.to}
                min={range.from}
                onChange={event => {
                  setPreset('otro');
                  setRange(r => ({ ...r, to: event.target.value }));
                }}
              />
            </Field>
          </div>
          <FormError message={error} />
          <Button variant="primary" size="lg" className="w-full" loading={downloading} icon={<Download className="size-5" />} onClick={() => void download()}>
            Descargar Excel
          </Button>
          <p className="text-xs text-stone-500">La descarga queda registrada en la bitácora de auditoría.</p>
        </SectionCard>

        <SectionCard title="Qué incluye" description="Una hoja por tema, con encabezados fijos y filtros" icon={Sheet}>
          <ul className="divide-y divide-stone-100">
            {SHEETS.map(([name, text], index) => (
              <li key={name} className="flex gap-3 px-5 py-3">
                <span className="grid size-6 shrink-0 place-items-center rounded bg-verde-50 text-xs font-bold text-verde-700">{index + 1}</span>
                <span className="text-sm">
                  <b className="text-stone-800">{name}</b>
                  <span className="block text-stone-500">{text}</span>
                </span>
              </li>
            ))}
          </ul>
        </SectionCard>
      </div>
    </>
  );
}
