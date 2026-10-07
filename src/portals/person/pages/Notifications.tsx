import { BadgeCheck, Bell, BellOff, BellRing, CalendarClock, CheckCheck, Fingerprint, LogOut, Monitor, Siren, UserRoundCheck, type LucideIcon } from 'lucide-react';
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import type { NotificationKind } from '../../../../shared/contracts';
import { errorMessage } from '../../../api/http';
import { deviceNotificationState, enableDeviceNotifications, showDeviceNotification, type DeviceNotificationState } from '../../../lib/deviceNotifications';
import { relativeTime } from '../../../lib/format';
import { Button } from '../../../ui/Button';
import { EmptyState, PageHeader, PageLoader, SectionCard } from '../../../ui/Display';
import { useToast } from '../../../ui/toast';
import { personApi } from '../api';
import { usePersonContext } from '../context';

const KIND_ICON: Record<NotificationKind, { icon: LucideIcon; tone: string }> = {
  invitado_llego: { icon: UserRoundCheck, tone: 'bg-verde-50 text-verde-700' },
  olvidaste_salida: { icon: LogOut, tone: 'bg-amber-50 text-amber-700' },
  credencial_por_vencer: { icon: CalendarClock, tone: 'bg-amber-50 text-amber-700' },
  dispositivo_vinculado: { icon: Fingerprint, tone: 'bg-sky-50 text-sky-700' },
  equipo: { icon: Monitor, tone: 'bg-cafe-50 text-cafe-700' },
  emergencia: { icon: Siren, tone: 'bg-red-50 text-red-700' },
  general: { icon: Bell, tone: 'bg-stone-100 text-stone-600' },
};

export default function Notifications() {
  const toast = useToast();
  const navigate = useNavigate();
  const { notifications, unread, refreshNotifications } = usePersonContext();
  const [permission, setPermission] = useState<DeviceNotificationState>(deviceNotificationState);

  const markAll = async () => {
    try {
      await personApi.markNotificationsRead();
      refreshNotifications();
    } catch (error) {
      toast.notify(errorMessage(error), 'error');
    }
  };

  const open = async (id: string, link: string | null, read: boolean) => {
    if (!read) {
      await personApi.markNotificationsRead(id).catch(() => undefined);
      refreshNotifications();
    }
    if (link) navigate(link);
  };

  const enable = async () => {
    const result = await enableDeviceNotifications();
    setPermission(result);
    if (result === 'granted') {
      toast.notify('Listo: los avisos llegarán a este dispositivo.', 'success');
      void showDeviceNotification('Avisos activados', 'Así se verán los avisos de UniAccess en tu celular.', '/acceso/avisos', 'prueba');
    } else if (result === 'denied') toast.notify('El navegador bloqueó los avisos. Actívalos en la configuración del sitio.', 'warning');
  };

  return (
    <>
      <PageHeader
        eyebrow="Centro de avisos"
        title="Avisos"
        description={unread ? `${unread} sin leer` : 'Estás al día'}
        actions={
          !!unread && (
            <Button size="sm" icon={<CheckCheck className="size-3.5" />} onClick={() => void markAll()}>
              Marcar todo como leído
            </Button>
          )
        }
      />

      <div className="card mb-5 flex flex-col gap-3 p-5 sm:flex-row sm:items-center">
        <span className={`grid size-11 shrink-0 place-items-center rounded-xl ${permission === 'granted' ? 'bg-verde-50 text-verde-700' : 'bg-stone-100 text-stone-500'}`}>
          {permission === 'granted' ? <BellRing className="size-5" /> : <BellOff className="size-5" />}
        </span>
        <div className="flex-1 text-sm">
          <p className="font-semibold text-stone-900">
            {permission === 'granted' ? 'Avisos activados en este dispositivo' : permission === 'unsupported' ? 'Este navegador no admite avisos' : 'Recibe los avisos en tu celular'}
          </p>
          <p className="text-stone-500">
            {permission === 'granted'
              ? 'Te llegarán como notificación mientras UniAccess esté abierto o en segundo plano.'
              : permission === 'denied'
                ? 'Los bloqueaste. Puedes permitirlos desde el candado junto a la dirección del sitio.'
                : permission === 'unsupported'
                  ? 'En iPhone, agrega UniAccess a la pantalla de inicio para recibir avisos.'
                  : 'Credencial por vencer, invitados que llegan, salidas olvidadas y emergencias.'}
          </p>
        </div>
        {permission === 'default' && (
          <Button variant="primary" icon={<BellRing className="size-4" />} onClick={() => void enable()}>
            Activar avisos en este celular
          </Button>
        )}
        {permission === 'granted' && (
          <Button size="sm" onClick={() => void showDeviceNotification('Aviso de prueba', 'Si ves esto, los avisos funcionan.', '/acceso/avisos', 'prueba')}>
            Enviar uno de prueba
          </Button>
        )}
      </div>

      <SectionCard title="Recientes" icon={Bell}>
        {!notifications ? (
          <PageLoader />
        ) : notifications.length ? (
          <ul className="divide-y divide-stone-100">
            {notifications.map(item => {
              const { icon: Icon, tone } = KIND_ICON[item.kind] ?? KIND_ICON.general;
              return (
                <li key={item.id}>
                  <button
                    type="button"
                    onClick={() => void open(item.id, item.link, !!item.readAt)}
                    className={`flex w-full gap-3 px-5 py-4 text-left transition hover:bg-stone-50 ${item.readAt ? '' : 'bg-verde-50/40'}`}
                  >
                    <span className={`grid size-9 shrink-0 place-items-center rounded-lg ${tone}`}>
                      <Icon className="size-4" />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="flex items-start justify-between gap-3">
                        <span className={`text-sm ${item.readAt ? 'font-medium text-stone-700' : 'font-bold text-stone-900'}`}>{item.title}</span>
                        <span className="shrink-0 text-xs text-stone-400">{relativeTime(item.createdAt)}</span>
                      </span>
                      <span className="mt-0.5 block text-sm text-stone-500">{item.body}</span>
                    </span>
                    {!item.readAt && <span className="mt-1.5 size-2 shrink-0 rounded-full bg-accent" aria-label="Sin leer" />}
                  </button>
                </li>
              );
            })}
          </ul>
        ) : (
          <EmptyState icon={BadgeCheck} title="Sin avisos" description="Aquí aparecerán los avisos de tu credencial, tus invitados y el campus." />
        )}
      </SectionCard>
    </>
  );
}
