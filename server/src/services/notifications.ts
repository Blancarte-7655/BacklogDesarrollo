import { randomUUID } from 'node:crypto';
import type { AppNotification, NotificationKind } from '../../../shared/contracts.ts';
import { many, nowIso, one, run } from '../db/index.ts';
import { addDays, dateKey } from '../lib/dates.ts';
import { sendMail } from '../lib/mailer.ts';
import type { PersonRow } from './people.ts';

/**
 * Avisos para el celular. Se guardan en la base y el portal los muestra en la campana;
 * si la persona activó los avisos, el navegador también los muestra como notificación.
 */

interface NotificationRow {
  id: string;
  kind: NotificationKind;
  title: string;
  body: string;
  link: string | null;
  created_at: string;
  read_at: string | null;
}

const toNotification = (row: NotificationRow): AppNotification => ({
  id: row.id,
  kind: row.kind,
  title: row.title,
  body: row.body,
  link: row.link,
  createdAt: row.created_at,
  readAt: row.read_at,
});

interface NotifyInput {
  personId: string;
  kind: NotificationKind;
  title: string;
  body: string;
  link?: string | null;
  /** Evita repetir el mismo aviso */
  dedupeKey?: string | null;
  idPrefix?: string;
}

export function notify({ personId, kind, title, body, link = null, dedupeKey = null, idPrefix = '' }: NotifyInput) {
  run(
    'INSERT OR IGNORE INTO notifications (id, person_id, kind, title, body, link, dedupe_key) VALUES (?, ?, ?, ?, ?, ?, ?)',
    `${idPrefix}${randomUUID()}`,
    personId,
    kind,
    title,
    body,
    link,
    dedupeKey,
  );
}

export const listNotifications = (personId: string): AppNotification[] =>
  many<NotificationRow>('SELECT * FROM notifications WHERE person_id = ? ORDER BY created_at DESC LIMIT 60', personId).map(toNotification);

export const unreadCount = (personId: string) =>
  one<{ count: number }>('SELECT COUNT(*) AS count FROM notifications WHERE person_id = ? AND read_at IS NULL', personId)!.count;

export function markNotificationsRead(personId: string, id?: string) {
  if (id) run('UPDATE notifications SET read_at = ? WHERE id = ? AND person_id = ? AND read_at IS NULL', nowIso(), id, personId);
  else run('UPDATE notifications SET read_at = ? WHERE person_id = ? AND read_at IS NULL', nowIso(), personId);
}

/** Avisos automáticos: credenciales por vencer y salidas olvidadas (se ejecuta cada 10 minutos) */
export function generateScheduledNotifications(now = new Date()) {
  const today = dateKey(now);
  const limit = dateKey(addDays(now, 7));
  const expiring = many<{ id: string; credential_expires_at: string }>(
    'SELECT id, credential_expires_at FROM people WHERE active = 1 AND credential_expires_at IS NOT NULL AND credential_expires_at BETWEEN ? AND ?',
    today,
    limit,
  );
  for (const person of expiring) {
    notify({
      personId: person.id,
      kind: 'credencial_por_vencer',
      title: 'Tu credencial está por vencer',
      body: `Vence el ${person.credential_expires_at}. Renuévala en Control Escolar para seguir registrando tu acceso.`,
      link: '/acceso/perfil',
      dedupeKey: `credencial:${person.id}:${person.credential_expires_at}`,
    });
  }

  const tenHoursAgo = new Date(now.getTime() - 10 * 60 * 60 * 1000).toISOString();
  const forgotten = many<{ id: string; person_id: string }>(
    'SELECT id, person_id FROM access_records WHERE person_id IS NOT NULL AND check_out IS NULL AND incident IS NULL AND check_in < ?',
    tenHoursAgo,
  );
  for (const record of forgotten) {
    notify({
      personId: record.person_id,
      kind: 'olvidaste_salida',
      title: '¿Olvidaste registrar tu salida?',
      body: 'Tienes una entrada abierta desde hace más de 10 horas. Si ya saliste del campus, registra tu salida.',
      link: '/acceso',
      dedupeKey: `salida:${record.id}`,
    });
  }
}

/** Avisa a la persona que se vinculó un dispositivo biométrico a su cuenta (correo y aviso) */
export async function notifyDeviceLinked(person: Pick<PersonRow, 'id' | 'email' | 'full_name'>, label: string) {
  const when = new Date().toLocaleString('es-MX', { dateStyle: 'long', timeStyle: 'short' });
  notify({
    personId: person.id,
    kind: 'dispositivo_vinculado',
    title: 'Se vinculó un dispositivo a tu cuenta',
    body: `"${label}" ya puede confirmar tus registros. Si no fuiste tú, acude a la Coordinación de Seguridad y Accesos.`,
    link: '/acceso/perfil',
  });
  try {
    await sendMail({
      to: person.email,
      subject: 'UniAccess: se vinculó un dispositivo a tu cuenta',
      text: [
        `Hola, ${person.full_name}:`,
        '',
        `El ${when} se vinculó el dispositivo "${label}" para registrar tu acceso al CUTlaquepaque.`,
        '',
        'Si fuiste tú, no tienes que hacer nada.',
        'Si no fuiste tú, acude a la Coordinación de Seguridad y Accesos para que lo desvinculen y restablezcan tu contraseña.',
      ].join('\n'),
    });
  } catch (error) {
    // El aviso no debe impedir la vinculación si el correo falla
    console.error('No se pudo enviar el aviso de dispositivo vinculado:', error);
  }
}
