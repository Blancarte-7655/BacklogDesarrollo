import { Database, ExternalLink, GraduationCap, Presentation, RotateCcw, Sparkles, Trash2, UserRound } from 'lucide-react';
import { useState } from 'react';
import { Link } from 'react-router-dom';
import { errorMessage } from '../../../api/http';
import { useAsync } from '../../../hooks/useAsync';
import { copyText } from '../../../lib/clipboard';
import { Button, buttonStyles } from '../../../ui/Button';
import { ConfirmDialog } from '../../../ui/ConfirmDialog';
import { Badge, ErrorState, PageHeader, PageLoader, SectionCard } from '../../../ui/Display';
import { useToast } from '../../../ui/toast';
import { staffApi } from '../api';
import { useStaffContext } from '../context';

const TOUR = [
  { title: 'Alumna en su celular', text: 'Entra como alumna: horario ficticio, próxima clase, registrar equipo del laboratorio y avisos.', to: '/acceso' },
  { title: 'Docente', text: 'Entra como docente: PIN de la pantalla de su salón e invitaciones con QR.', to: '/acceso' },
  { title: 'Caseta', text: 'Valida las invitaciones de hoy (DEMOK7QX, DEMOP4MW, DEMOT9RB).', to: '/control/invitaciones' },
  { title: 'Laboratorio', text: 'Mapa de equipos ocupados e incidencias como "contraseña pegada al monitor".', to: '/control/laboratorios' },
  { title: 'Pantalla del salón', text: 'Abre el simulador y prueba un PIN correcto y uno incorrecto.', to: '/control/pantallas' },
  { title: 'Simulacro', text: 'Inicia un simulacro y marca a las personas a salvo.', to: '/control/emergencia' },
  { title: 'Reporte en Excel', text: 'Descarga los últimos 7 días y muestra las hojas.', to: '/control/reportes' },
  { title: 'Manual y privacidad', text: 'Muestra el manual interactivo y el aviso de privacidad.', to: '/ayuda' },
];

/** Carga y borra los datos de ejemplo para presentar el sistema sin datos reales de la Universidad */
export default function Demo() {
  const toast = useToast();
  const { reloadMeta } = useStaffContext();
  const { data, error, reload, setData } = useAsync(() => staffApi.demo(), []);
  const [busy, setBusy] = useState<'load' | 'clear' | null>(null);
  const [confirmClear, setConfirmClear] = useState(false);

  if (!data) return error ? <ErrorState message={error} onRetry={reload} /> : <PageLoader />;

  const load = async () => {
    setBusy('load');
    try {
      setData(await staffApi.loadDemo());
      reloadMeta();
      toast.notify('Datos de ejemplo cargados.', 'success');
    } catch (err) {
      toast.notify(errorMessage(err), 'error');
    } finally {
      setBusy(null);
    }
  };

  const copy = async (text: string) => {
    if (await copyText(text)) toast.notify('Copiado.', 'success');
  };

  return (
    <>
      <PageHeader
        eyebrow="Administración"
        title="Modo de demostración"
        description="Datos de ejemplo para presentar UniAccess sin conexión con los sistemas de la Universidad."
        actions={data.active ? <Badge tone="verde">Demostración cargada</Badge> : <Badge>Sin datos de ejemplo</Badge>}
      />

      <div className="grid gap-5 lg:grid-cols-2">
        <SectionCard title="Datos de ejemplo" icon={Database} bodyClassName="p-5">
          <dl className="grid grid-cols-2 gap-3 text-sm sm:grid-cols-4">
            {[
              ['Personas', data.people],
              ['Accesos', data.records],
              ['Salones', data.rooms],
              ['Invitaciones', data.invitations],
            ].map(([label, value]) => (
              <div key={label} className="rounded-lg bg-stone-50 p-3">
                <dt className="text-xs text-stone-500">{label}</dt>
                <dd className="font-display text-xl font-bold text-stone-900">{value}</dd>
              </div>
            ))}
          </dl>
          <p className="mt-4 text-sm text-stone-600">
            Incluye 20 personas ficticias, dos semanas de accesos, laboratorios con equipos en uso, fallas reportadas, invitaciones para hoy y avisos. Al cargar
            de nuevo se reemplazan; tus datos reales nunca se modifican.
          </p>
          <div className="mt-5 flex flex-wrap gap-2">
            <Button variant="primary" loading={busy === 'load'} icon={data.active ? <RotateCcw className="size-4" /> : <Sparkles className="size-4" />} onClick={() => void load()}>
              {data.active ? 'Volver a cargar' : 'Cargar datos de ejemplo'}
            </Button>
            {data.active && (
              <Button variant="danger" loading={busy === 'clear'} icon={<Trash2 className="size-4" />} onClick={() => setConfirmClear(true)}>
                Borrar demostración
              </Button>
            )}
          </div>
        </SectionCard>

        <SectionCard title="Cuentas de prueba" description="Portal de acceso" icon={UserRound} bodyClassName="space-y-3 p-5">
          {[
            { icon: Presentation, label: 'Docente · Ricardo Salas Ponce', code: data.teacherCode },
            { icon: GraduationCap, label: 'Alumna · Valeria Cruz Medina', code: data.studentCode },
          ].map(account => (
            <div key={account.code} className="flex items-center gap-3 rounded-xl border border-stone-200 p-3">
              <span className="grid size-9 place-items-center rounded-lg bg-verde-50 text-verde-700">
                <account.icon className="size-4" />
              </span>
              <div className="flex-1 text-sm">
                <p className="font-semibold text-stone-900">{account.label}</p>
                <p className="text-stone-500">
                  Código{' '}
                  <button type="button" className="font-mono font-semibold text-stone-800 hover:underline" onClick={() => void copy(account.code)}>
                    {account.code}
                  </button>{' '}
                  · contraseña{' '}
                  <button type="button" className="font-mono font-semibold text-stone-800 hover:underline" onClick={() => void copy(data.password)}>
                    {data.password}
                  </button>
                </p>
              </div>
            </div>
          ))}
          <p className="text-xs text-stone-500">
            {data.active ? 'Ábrelas en otra ventana privada o en tu celular.' : 'Se crean al cargar los datos de ejemplo.'} Para probar en computadora sin huella,
            arranca el servidor con <code className="font-mono">REQUIRE_BIOMETRIC=false</code>.
          </p>
        </SectionCard>
      </div>

      <SectionCard className="mt-5" title="Recorrido sugerido para presentar" icon={Presentation}>
        <ol className="grid gap-px bg-stone-100 sm:grid-cols-2">
          {TOUR.map((step, index) => (
            <li key={step.title} className="flex gap-3 bg-surface px-5 py-4">
              <span className="grid size-7 shrink-0 place-items-center rounded-full bg-brand text-xs font-bold text-white">{index + 1}</span>
              <div className="min-w-0 flex-1 text-sm">
                <p className="font-semibold text-stone-900">{step.title}</p>
                <p className="text-stone-500">{step.text}</p>
              </div>
              <Link to={step.to} target={step.to.startsWith('/acceso') || step.to === '/ayuda' ? '_blank' : undefined} className={buttonStyles('ghost', 'sm', 'self-center')} aria-label={`Abrir: ${step.title}`}>
                <ExternalLink className="size-3.5" />
              </Link>
            </li>
          ))}
        </ol>
      </SectionCard>

      <ConfirmDialog
        open={confirmClear}
        title="Borrar demostración"
        message="Se eliminan solo los datos de ejemplo (personas, accesos, laboratorios, invitaciones y avisos de la demo)."
        confirmLabel="Borrar"
        onCancel={() => setConfirmClear(false)}
        onConfirm={async () => {
          setBusy('clear');
          try {
            setData(await staffApi.clearDemo());
            reloadMeta();
            toast.notify('Se borró la demostración.', 'success');
          } catch (err) {
            toast.notify(errorMessage(err), 'error');
          } finally {
            setBusy(null);
            setConfirmClear(false);
          }
        }}
      />
    </>
  );
}
