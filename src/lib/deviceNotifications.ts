/**
 * Avisos en el celular con la API de notificaciones del navegador.
 * El portal consulta los avisos nuevos cada 30 s y, si la persona dio permiso, los muestra
 * como notificación del sistema mediante el service worker (así funcionan también en Android).
 * Las notificaciones push con la app cerrada requieren llaves VAPID y un servicio de envío:
 * quedan registradas como deuda técnica (DT-07).
 */

export type DeviceNotificationState = 'unsupported' | 'default' | 'granted' | 'denied';

export const deviceNotificationState = (): DeviceNotificationState =>
  typeof window === 'undefined' || !('Notification' in window) ? 'unsupported' : Notification.permission;

async function registration(): Promise<ServiceWorkerRegistration | null> {
  if (!('serviceWorker' in navigator)) return null;
  try {
    return await navigator.serviceWorker.register('/sw.js');
  } catch {
    return null;
  }
}

export async function enableDeviceNotifications(): Promise<DeviceNotificationState> {
  if (deviceNotificationState() === 'unsupported') return 'unsupported';
  const result = await Notification.requestPermission();
  if (result === 'granted') await registration();
  return result;
}

export async function showDeviceNotification(title: string, body: string, link: string | null, tag: string) {
  if (deviceNotificationState() !== 'granted') return;
  const options: NotificationOptions = { body, tag, icon: '/favicon.svg', badge: '/favicon.svg', data: { link: link ?? '/acceso/avisos' } };
  const reg = await registration();
  if (reg) await reg.showNotification(title, options);
  else new Notification(title, options);
}
