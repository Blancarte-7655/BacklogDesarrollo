import { useEffect, useRef } from 'react';
import { useAsync } from '../../../hooks/useAsync';
import { showDeviceNotification } from '../../../lib/deviceNotifications';
import { personApi } from '../api';

/**
 * Consulta los avisos cada 30 s. Los que llegan mientras el portal está abierto
 * se muestran también como notificación del celular (si la persona dio permiso).
 */
export function useNotificationFeed() {
  const feed = useAsync(() => personApi.notifications(), [], { pollMs: 30_000 });
  const seen = useRef<Set<string> | null>(null);

  useEffect(() => {
    if (!feed.data) return;
    if (!seen.current) {
      // Primera carga: lo que ya existía no se vuelve a notificar
      seen.current = new Set(feed.data.map(n => n.id));
      return;
    }
    for (const notification of feed.data) {
      if (seen.current.has(notification.id)) continue;
      seen.current.add(notification.id);
      if (!notification.readAt) void showDeviceNotification(notification.title, notification.body, notification.link, notification.id);
    }
  }, [feed.data]);

  return {
    notifications: feed.data,
    unread: feed.data?.filter(n => !n.readAt).length ?? 0,
    refresh: () => void feed.reload(),
  };
}
