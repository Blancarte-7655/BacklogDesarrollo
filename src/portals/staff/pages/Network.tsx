import { Monitor, Plus, ShieldCheck, Trash2, Wifi, type LucideIcon } from 'lucide-react';
import { useEffect, useState } from 'react';
import { errorMessage } from '../../../api/http';
import { useAsync } from '../../../hooks/useAsync';
import { Button } from '../../../ui/Button';
import { ErrorState, PageHeader, PageLoader, SectionCard } from '../../../ui/Display';
import { FormError } from '../../../ui/Field';
import { useToast } from '../../../ui/toast';
import { staffApi } from '../api';

/** Redes permitidas: registro solo desde el WiFi del campus y portal solo desde la caseta */
export default function Network() {
  const toast = useToast();
  const settings = useAsync(() => staffApi.network(), []);
  const [campus, setCampus] = useState<string[]>([]);
  const [staff, setStaff] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!settings.data) return;
    setCampus(settings.data.campusNetworks);
    setStaff(settings.data.staffNetworks);
  }, [settings.data]);

  if (!settings.data) return settings.loading ? <PageLoader /> : <ErrorState message={settings.error ?? ''} onRetry={settings.reload} />;
  const yourIp = settings.data.yourIp;

  const save = async () => {
    setSaving(true);
    setError(null);
    try {
      const saved = await staffApi.saveNetwork({ campusNetworks: campus, staffNetworks: staff });
      settings.setData(saved);
      toast.notify('Redes guardadas.', 'success');
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <PageHeader
        eyebrow="Administración"
        title="Redes permitidas"
        description="Dos barreras opcionales además de la biometría y la geocerca. Si una lista queda vacía, no se restringe nada."
        actions={
          <Button variant="primary" loading={saving} onClick={save} icon={<ShieldCheck className="size-4" />}>
            Guardar redes
          </Button>
        }
      />

      <p className="mb-5 inline-flex flex-wrap items-center gap-2 rounded-xl border border-stone-200 bg-surface px-4 py-2.5 text-sm text-stone-600">
        <Monitor className="size-4 text-stone-400" aria-hidden="true" />
        Tu conexión llega al servidor con la IP <b className="font-mono text-stone-900">{yourIp || 'desconocida'}</b>
      </p>

      <FormError message={error} />

      <div className="mt-4 grid gap-5 lg:grid-cols-2">
        <NetworkList
          icon={Wifi}
          title="Red del campus"
          description="Desde dónde se puede registrar entrada y salida con el celular."
          help="Agrega el rango del WiFi del campus que asigna el área de sistemas, por ejemplo 10.20.0.0/16. Quien intente registrarse desde datos móviles u otra red verá un aviso y vigilancia recibirá una alerta."
          entries={campus}
          onChange={setCampus}
          suggestion={yourIp}
        />
        <NetworkList
          icon={ShieldCheck}
          title="Portal institucional"
          description="Desde qué computadoras abre /control (caseta y administración)."
          help="Usa las IP fijas de las computadoras de vigilancia. Tu IP actual debe quedar incluida para no perder el acceso. El servidor mismo (localhost) siempre puede entrar."
          entries={staff}
          onChange={setStaff}
          suggestion={yourIp}
        />
      </div>
    </>
  );
}

interface NetworkListProps {
  icon: LucideIcon;
  title: string;
  description: string;
  help: string;
  entries: string[];
  onChange: (entries: string[]) => void;
  suggestion: string;
}

function NetworkList({ icon, title, description, help, entries, onChange, suggestion }: NetworkListProps) {
  const [draft, setDraft] = useState('');
  const inputId = `${title.replace(/\s+/g, '-').toLowerCase()}-nueva`;

  const add = (value: string) => {
    const clean = value.trim();
    if (!clean || entries.includes(clean)) return;
    onChange([...entries, clean]);
    setDraft('');
  };

  return (
    <SectionCard title={title} description={description} icon={icon} bodyClassName="p-5">
      <p className="text-sm text-stone-600">{help}</p>

      {entries.length ? (
        <ul className="mt-4 divide-y divide-stone-100 rounded-xl border border-stone-200">
          {entries.map(entry => (
            <li key={entry} className="flex items-center justify-between gap-3 px-4 py-2.5">
              <span className="font-mono text-sm text-stone-900">{entry}</span>
              <Button size="sm" variant="ghost" icon={<Trash2 className="size-3.5" />} onClick={() => onChange(entries.filter(item => item !== entry))}>
                Quitar
              </Button>
            </li>
          ))}
        </ul>
      ) : (
        <p className="mt-4 rounded-xl border border-dashed border-stone-300 px-4 py-3 text-sm text-stone-500">Sin restricción: se acepta cualquier red.</p>
      )}

      <form
        className="mt-4 flex flex-wrap items-end gap-2"
        onSubmit={event => {
          event.preventDefault();
          add(draft);
        }}
      >
        <label htmlFor={inputId} className="w-full text-sm font-semibold text-stone-700">
          Agregar IP o rango
        </label>
        <input id={inputId} className="input min-w-0 flex-1 font-mono" placeholder="10.20.0.0/16" value={draft} onChange={event => setDraft(event.target.value)} />
        <Button type="submit" icon={<Plus className="size-4" />}>
          Agregar
        </Button>
        {suggestion && !entries.includes(suggestion) && (
          <button type="button" onClick={() => add(suggestion)} className="w-full text-left text-xs font-semibold text-verde-700 hover:underline">
            Agregar mi IP actual ({suggestion})
          </button>
        )}
      </form>
    </SectionCard>
  );
}
