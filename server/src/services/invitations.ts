import { randomBytes, randomInt, randomUUID } from 'node:crypto';
import type { GuestPass, Invitation, InvitationInput, InvitationStatus, PublicInvitation } from '../../../shared/contracts.ts';
import { CODE_ALPHABET } from '../../../shared/campus.ts';
import { many, nowIso, one, run } from '../db/index.ts';
import { config } from '../config.ts';
import { dateKey } from '../lib/dates.ts';
import { badRequest, conflict, notFound } from '../lib/http.ts';
import { sendMail } from '../lib/mailer.ts';
import { getAccessPoint } from './access.ts';
import { issueGuestPass } from './guests.ts';
import { notify } from './notifications.ts';
import type { PersonRow } from './people.ts';

/**
 * Invitaciones con QR: un docente o personal registra a su visitante con anticipación.
 * El visitante recibe una liga con su QR; en la caseta, vigilancia lo escanea y se emite
 * el pase del día con su entrada registrada. El anfitrión recibe un aviso cuando llega.
 */

interface InvitationRow {
  id: string;
  code: string;
  token: string;
  guest_name: string;
  guest_email: string;
  reason: string;
  visit_date: string;
  access_point_id: string | null;
  access_point_name: string | null;
  host_person_id: string | null;
  host_name: string | null;
  status: 'pendiente' | 'usada' | 'cancelada';
  created_at: string;
  used_at: string | null;
}

const SQL = `
  SELECT i.*, ap.name AS access_point_name, p.full_name AS host_name
    FROM invitations i
    LEFT JOIN access_points ap ON ap.id = i.access_point_id
    LEFT JOIN people p ON p.id = i.host_person_id`;

const statusOf = (row: InvitationRow, today = dateKey(new Date())): InvitationStatus =>
  row.status === 'pendiente' && row.visit_date < today ? 'vencida' : row.status;

const toInvitation = (row: InvitationRow): Invitation => ({
  id: row.id,
  code: row.code,
  token: row.token,
  guestName: row.guest_name,
  guestEmail: row.guest_email,
  reason: row.reason,
  visitDate: row.visit_date,
  accessPointId: row.access_point_id,
  accessPointName: row.access_point_name ?? 'Cualquier acceso',
  hostName: row.host_name ?? 'Coordinación de Seguridad',
  status: statusOf(row),
  createdAt: row.created_at,
  usedAt: row.used_at,
});

/** URL que lleva el QR: vigilancia la escanea con la cámara y abre la invitación en su portal */
export const invitationCheckUrl = (code: string) => `${config.appOrigin}/control/invitaciones/${code}`;
export const invitationGuestUrl = (token: string) => `${config.appOrigin}/invitacion/${token}`;

function newCode(): string {
  for (;;) {
    let code = '';
    for (let i = 0; i < 8; i++) code += CODE_ALPHABET[randomInt(CODE_ALPHABET.length)];
    if (!one('SELECT 1 FROM invitations WHERE code = ?', code)) return code;
  }
}

export async function createInvitation(host: PersonRow, input: InvitationInput, idPrefix = ''): Promise<Invitation> {
  if (input.visitDate < dateKey(new Date())) throw badRequest('La fecha de la visita no puede ser anterior a hoy.');
  const point = getAccessPoint(input.accessPointId);
  const id = `${idPrefix}${randomUUID()}`;
  const code = newCode();
  const token = randomBytes(18).toString('base64url');
  run(
    'INSERT INTO invitations (id, code, token, host_person_id, guest_name, guest_email, reason, visit_date, access_point_id) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
    id,
    code,
    token,
    host.id,
    input.guestName,
    input.guestEmail,
    input.reason,
    input.visitDate,
    point.id,
  );
  if (input.guestEmail) {
    try {
      await sendMail({
        to: input.guestEmail,
        subject: `Tu invitación al CUTlaquepaque para el ${input.visitDate}`,
        text: [
          `Hola, ${input.guestName}:`,
          '',
          `${host.full_name} te invitó al Centro Universitario de Tlaquepaque el ${input.visitDate}.`,
          `Motivo: ${input.reason}`,
          `Acceso: ${point.name}`,
          '',
          `Abre esta liga y muestra el código QR en la caseta de vigilancia: ${invitationGuestUrl(token)}`,
          `Si no puedes abrirla, da este código: ${code}`,
        ].join('\n'),
      });
    } catch (error) {
      console.error('No se pudo enviar la invitación por correo:', error);
    }
  }
  return toInvitation(one<InvitationRow>(`${SQL} WHERE i.id = ?`, id)!);
}

export const listInvitationsByHost = (personId: string) =>
  many<InvitationRow>(`${SQL} WHERE i.host_person_id = ? ORDER BY i.visit_date DESC, i.created_at DESC LIMIT 100`, personId).map(toInvitation);

export const listInvitationsForDate = (date: string) =>
  many<InvitationRow>(`${SQL} WHERE i.visit_date = ? ORDER BY i.created_at DESC`, date).map(toInvitation);

export function findInvitationByCode(code: string): Invitation {
  const row = one<InvitationRow>(`${SQL} WHERE i.code = ?`, code.trim().toUpperCase());
  if (!row) throw notFound('No existe una invitación con ese código.');
  return toInvitation(row);
}

export function publicInvitation(token: string): PublicInvitation {
  const row = one<InvitationRow>(`${SQL} WHERE i.token = ?`, token);
  if (!row) throw notFound('La invitación no existe.');
  const invitation = toInvitation(row);
  return {
    code: invitation.code,
    guestName: invitation.guestName,
    hostName: invitation.hostName,
    visitDate: invitation.visitDate,
    accessPointName: invitation.accessPointName,
    status: invitation.status,
    checkUrl: invitationCheckUrl(invitation.code),
  };
}

export function cancelInvitation(personId: string, id: string): Invitation {
  const row = one<InvitationRow>(`${SQL} WHERE i.id = ? AND i.host_person_id = ?`, id, personId);
  if (!row) throw notFound('La invitación no existe.');
  if (row.status !== 'pendiente') throw conflict('Solo se pueden cancelar invitaciones pendientes.');
  run("UPDATE invitations SET status = 'cancelada' WHERE id = ?", id);
  return toInvitation({ ...row, status: 'cancelada' });
}

/** Vigilancia valida la invitación: emite el pase del día, registra la entrada y avisa al anfitrión */
export function admitInvitation(code: string, staffId: string): { invitation: Invitation; pass: GuestPass } {
  const row = one<InvitationRow>(`${SQL} WHERE i.code = ?`, code.trim().toUpperCase());
  if (!row) throw notFound('No existe una invitación con ese código.');
  const status = statusOf(row);
  if (status === 'usada') throw conflict(`Esta invitación ya se usó el ${row.used_at?.slice(0, 10)}.`);
  if (status === 'cancelada') throw conflict('El anfitrión canceló esta invitación.');
  if (status === 'vencida') throw conflict(`La invitación era para el ${row.visit_date} y ya venció.`);
  if (row.visit_date > dateKey(new Date())) throw conflict(`La invitación es para el ${row.visit_date}, no para hoy.`);
  if (!row.access_point_id) throw conflict('El acceso de la invitación ya no existe. Emite un pase manual.');

  const pass = issueGuestPass(
    { fullName: row.guest_name, document: '', reason: row.reason, hostName: row.host_name ?? '', accessPointId: row.access_point_id },
    staffId,
  );
  const usedAt = nowIso();
  run("UPDATE invitations SET status = 'usada', used_at = ?, guest_pass_id = ? WHERE id = ?", usedAt, pass.id, row.id);
  if (row.host_person_id) {
    notify({
      personId: row.host_person_id,
      kind: 'invitado_llego',
      title: `${row.guest_name} ya llegó`,
      body: `Tu invitado entró por ${row.access_point_name ?? 'la caseta'} a las ${new Date(usedAt).toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' })}.`,
      link: '/acceso/invitados',
    });
  }
  return { invitation: toInvitation({ ...row, status: 'usada', used_at: usedAt }), pass };
}
