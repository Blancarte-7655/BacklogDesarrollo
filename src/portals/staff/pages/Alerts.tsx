import { BadgeAlert, Bell, CheckCheck, Circle, DoorClosed, MapPinOff, ShieldAlert, TriangleAlert, WifiOff, type LucideIcon } from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';
import { useMemo, useState } from 'react';
import type { Alert, AlertType } from '../../../../shared/contracts';
import { ALERT_LABELS } from '../../../../shared/rules';
import { errorMessage } from '../../../api/http';
import { useAsync } from '../../../hooks/useAsync';
import { capitalize, dateKey, formatDate, formatTime, relativeTime } from '../../../lib/format';
import { Button } from '../../../ui/Button';
import { Badge, EmptyState, ErrorState, PageHeader, PageLoader } from '../../../ui/Display';
import { Segmented } from '../../../ui/Segmented';
import { useToast } from '../../../ui/toast';
import { staffApi } from '../api';
import { useStaffContext } from '../context';

const STYLES: Record<AlertType, { icon: LucideIcon; tone: string }> = {
  credencial_invalida: { icon: ShieldAlert, tone: 'bg-red-50 text-red-600' },
  area_no_permitida: { icon: DoorClosed, tone: 'bg-terracota-50 text-terracota-600' },
  fuera_de_area: { icon: MapPinOff, tone: 'bg-amber-50 text-amber-700' },
  red_no_permitida: { icon: WifiOff, tone: 'bg-amber-50 text-amber-700' },
  incidencia: { icon: TriangleAlert, tone: 'bg-amber-50 text-amber-700' },
  pase_vencido: { icon: BadgeAlert, tone: 'bg-stone-100 text-stone-600' },
};

const dayLabel = (iso: string) => {
  const key = dateKey(new Date(iso));
  if (key === dateKey(new Date())) return 'Hoy';
  if (key === dateKey(new Date(Date.now() - 86_400_000))) return 'Ayer';
  return capitalize(formatDate(iso, 'long'));
};

export default function Alerts() {
  const toast = useToast();
  const { refreshAlerts } = useStaffContext();
  const [filter, setFilter] = useState<'unread' | 'all'>('unread');
  const [type, setType] = useState<AlertType | 'any'>('any');
  const [busyId, setBusyId] = useState<string | null>(null);
  const list = useAsync(() => staffApi.alerts(filter), [filter], { pollMs: 30_000 });

  const items = useMemo(() => (list.data ?? []).filter(alert => type === 'any' || alert.type === type), [list.data, type]);
  const groups = useMemo(() => {
    const map = new Map<string, Alert[]>();
    for (const alert of items) map.set(dayLabel(alert.createdAt), [...(map.get(dayLabel(alert.createdAt)) ?? []), alert]);
    return [...map];
  }, [items]);

  const run = async (id: string, action: () => Promise<unknown>) => {
    setBusyId(id);
    try {
      await action();
      void list.reload();
      refreshAlerts();
    } catch (err) {
      toast.notify(errorMessage(err), 'error');
    } finally {
      setBusyId(null);
    }
  };

  const countBy = (value: AlertType) => (list.data ?? []).filter(alert => alert.type === value).length;

  return (
    <>
      <PageHeader
        eyebrow="Seguridad"
        title="Alertas"
        description="Accesos denegados e incidencias detectadas automáticamente por el sistema."
        actions={
          <Button icon={<CheckCheck className="size-4" />} loading={busyId === 'all'} onClick={() => run('all', () => staffApi.reviewAllAlerts())}>
            Marcar todas como revisadas
          </Button>
        }
      />

      <div className="mb-4 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <Segmented
          id="alerts-read"
          value={filter}
          onChange={setFilter}
          options={[
            { value: 'unread', label: 'Sin revisar' },
            { value: 'all', label: 'Todas' },
          ]}
        />
        <div className="flex flex-wrap gap-1.5">
          <Chip active={type === 'any'} label="Todos los tipos" onClick={() => setType('any')} />
          {(Object.keys(ALERT_LABELS) as AlertType[]).map(value => (
            <Chip key={value} active={type === value} label={`${ALERT_LABELS[value]} (${countBy(value)})`} onClick={() => setType(value)} />
          ))}
        </div>
      </div>

      {!list.data ? (
        list.loading ? (
          <PageLoader />
        ) : (
          <ErrorState message={list.error ?? ''} onRetry={list.reload} />
        )
      ) : groups.length === 0 ? (
        <div className="card">
          <EmptyState
            icon={Bell}
            title={filter === 'unread' ? 'Sin alertas pendientes' : 'Sin alertas'}
            description={filter === 'unread' ? 'Todo está revisado por ahora.' : 'Aquí aparecerán los intentos de acceso denegados y las incidencias.'}
          />
        </div>
      ) : (
        <div className="space-y-5">
          {groups.map(([label, alerts]) => (
            <section key={label}>
              <p className="eyebrow mb-2 text-stone-500">{label}</p>
              <ul className="card divide-y divide-stone-100 overflow-hidden">
                <AnimatePresence initial={false}>
                  {alerts.map(alert => {
                    const style = STYLES[alert.type];
                    return (
                      <motion.li
                        key={alert.id}
                        layout
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0, height: 0 }}
                        className={`flex flex-col gap-3 px-5 py-4 sm:flex-row sm:items-start ${alert.readAt ? '' : 'bg-terracota-50/30'}`}
                      >
                        <span className={`grid size-10 shrink-0 place-items-center rounded-xl ${style.tone}`}>
                          <style.icon className="size-5" />
                        </span>
                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-center gap-2">
                            {!alert.readAt && <Circle className="size-2 fill-accent text-terracota-500" />}
                            <p className="font-semibold text-stone-900">{alert.title}</p>
                            <Badge>{ALERT_LABELS[alert.type]}</Badge>
                            <span className="text-xs text-stone-400">{formatTime(alert.createdAt)}</span>
                          </div>
                          <p className="mt-0.5 text-sm text-stone-600">{alert.body}</p>
                          <p className="mt-1 text-xs text-stone-400">
                            {alert.accessPointName && `${alert.accessPointName} · `}
                            {relativeTime(alert.createdAt)}
                            {alert.reviewedByName && ` · revisó ${alert.reviewedByName}`}
                          </p>
                        </div>
                        {!alert.readAt && (
                          <Button size="sm" loading={busyId === alert.id} onClick={() => run(alert.id, () => staffApi.reviewAlert(alert.id))}>
                            Marcar revisada
                          </Button>
                        )}
                      </motion.li>
                    );
                  })}
                </AnimatePresence>
              </ul>
            </section>
          ))}
        </div>
      )}
    </>
  );
}

function Chip({ active, label, onClick }: { active: boolean; label: string; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-full px-3 py-1 text-xs font-medium ring-1 transition ${active ? 'bg-brand text-white ring-brand' : 'bg-surface text-stone-600 ring-stone-200 hover:ring-stone-300'}`}
    >
      {label}
    </button>
  );
}
