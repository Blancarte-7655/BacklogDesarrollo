import type { AuthenticationResponseJSON, RegistrationResponseJSON } from '@simplewebauthn/server';
import { Router } from 'express';
import { z } from 'zod';
import type { AccessRecord, PersonOverview, PersonSession } from '../../../shared/contracts.ts';
import { DATE_RE } from '../../../shared/rules.ts';
import { config } from '../config.ts';
import { many, one } from '../db/index.ts';
import { badRequest, forbidden, parse } from '../lib/http.ts';
import { checkSchema } from '../schemas.ts';
import {
  findOpenRecord,
  listAccessPoints,
  RECORDS_SQL,
  registerAccess,
  toRecord,
  type AccessRecordRow,
} from '../services/access.ts';
import { audit } from '../services/audit.ts';
import { teacherDisplayPins } from '../services/displays.ts';
import { cancelInvitation, createInvitation, listInvitationsByHost } from '../services/invitations.ts';
import { listNotifications, markNotificationsRead, notifyDeviceLinked, unreadCount } from '../services/notifications.ts';
import { acceptPrivacy, privacyAccepted } from '../services/privacy.ts';
import { scheduleOverview } from '../services/schedule.ts';
import { activeSession, endPersonSession, personSessions, reportIncident, startSession, stationByCode } from '../services/stations.ts';
import { getPerson, personCredentialValid } from '../services/people.ts';
import { authenticationOptions, completeRegistration, listCredentials, registrationOptions, verifyBiometric } from '../services/webauthn.ts';

export const personRouter = Router();

const ownRecords = (personId: string, limit: number): AccessRecord[] =>
  many<AccessRecordRow>(
    `${RECORDS_SQL} WHERE r.person_id = ? ORDER BY COALESCE(r.check_in, r.check_out) DESC LIMIT ?`,
    personId,
    limit,
  ).map(toRecord);

personRouter.get('/session', (req, res) => {
  const person = req.person!;
  const session: PersonSession = {
    id: person.id,
    code: person.code,
    fullName: person.full_name,
    email: person.email,
    role: person.role,
    privacyAccepted: privacyAccepted('person', person.id),
  };
  res.json(session);
});

personRouter.post('/privacy/accept', (req, res) => {
  acceptPrivacy('person', req.person!.id);
  audit({ type: 'person', id: req.person!.id }, 'accept_privacy', 'person', req.person!.id);
  res.status(204).end();
});

/* ---------- Mi horario ---------- */

personRouter.get('/schedule', (req, res) => {
  res.json(scheduleOverview(req.person!.id, req.person!.role));
});

/* ---------- Avisos ---------- */

personRouter.get('/notifications', (req, res) => {
  res.json(listNotifications(req.person!.id));
});

personRouter.get('/notifications/unread', (req, res) => {
  res.json({ count: unreadCount(req.person!.id) });
});

personRouter.post('/notifications/read', (req, res) => {
  const { id } = parse(z.object({ id: z.string().optional() }), req.body ?? {});
  markNotificationsRead(req.person!.id, id);
  res.status(204).end();
});

/* ---------- Invitaciones con QR (docentes y personal) ---------- */

const requireHost = (role: string) => {
  if (role === 'alumno') throw forbidden('Solo docentes y personal pueden invitar visitantes.');
};

const invitationSchema = z.object({
  guestName: z.string().trim().min(5, 'Escribe el nombre completo del invitado.').max(120),
  guestEmail: z.union([z.literal(''), z.string().trim().toLowerCase().email('El correo del invitado no es válido.')]).default(''),
  reason: z.string().trim().min(3, 'Indica el motivo de la visita.').max(200),
  visitDate: z.string().regex(DATE_RE, 'La fecha no es válida.'),
  accessPointId: z.string().min(1, 'Selecciona el acceso.'),
});

personRouter.get('/invitations', (req, res) => {
  requireHost(req.person!.role);
  res.json(listInvitationsByHost(req.person!.id));
});

personRouter.post('/invitations', async (req, res) => {
  requireHost(req.person!.role);
  const data = parse(invitationSchema, req.body);
  const invitation = await createInvitation(req.person!, data);
  audit({ type: 'person', id: req.person!.id }, 'create_invitation', 'invitation', invitation.id, { guest: data.guestName });
  res.status(201).json({ ...invitation, appOrigin: config.appOrigin });
});

personRouter.post('/invitations/:id/cancel', (req, res) => {
  res.json(cancelInvitation(req.person!.id, req.params.id));
});

/* ---------- Pantallas con PIN (docentes) ---------- */

personRouter.get('/displays', (req, res) => {
  if (req.person!.role !== 'docente') throw forbidden('El PIN de las pantallas solo lo ven los docentes.');
  res.json(teacherDisplayPins(req.person!.id));
});

/* ---------- Uso de equipos del laboratorio ---------- */

personRouter.get('/stations/current', (req, res) => {
  res.json({ session: activeSession(req.person!.id), history: personSessions(req.person!.id) });
});

personRouter.get('/stations/:code', (req, res) => {
  const station = stationByCode(req.params.code);
  res.json({ ...station, occupant: station.occupant ? { ...station.occupant, name: station.occupant.personId === req.person!.id ? station.occupant.name : 'Otra persona', code: '' } : null });
});

personRouter.post('/stations/:code/start', async (req, res) => {
  const person = req.person!;
  const { biometric } = parse(z.object({ biometric: z.record(z.string(), z.unknown()).nullable().default(null) }), req.body ?? {});
  const hasDevices = one<{ count: number }>('SELECT COUNT(*) AS count FROM webauthn_credentials WHERE person_id = ?', person.id)!.count > 0;
  if (config.requireBiometric) {
    if (!hasDevices) throw badRequest('Primero vincula la biometría de tu dispositivo desde tu perfil.');
    if (!biometric) throw badRequest('Confirma tu identidad con la huella o el rostro de tu dispositivo.');
  }
  if (biometric) await verifyBiometric(person.id, biometric as unknown as AuthenticationResponseJSON);
  const session = startSession(person, req.params.code);
  audit({ type: 'person', id: person.id }, 'start_station', 'station', session.stationId, { station: session.stationLabel });
  res.status(201).json(session);
});

personRouter.post('/stations/end', (req, res) => {
  res.json(endPersonSession(req.person!.id));
});

personRouter.post('/stations/:code/report', (req, res) => {
  const { description } = parse(z.object({ description: z.string().trim().min(5, 'Describe la falla.').max(500) }), req.body);
  const station = stationByCode(req.params.code);
  res.status(201).json(reportIncident(station.id, description, `${req.person!.full_name} (${req.person!.code})`));
});

personRouter.get('/overview', (req, res) => {
  const person = req.person!;
  const open = findOpenRecord(person.id);
  const overview: PersonOverview = {
    profile: getPerson(person.id),
    inside: !!open,
    openRecord: open ? toRecord(open) : null,
    accessPoints: listAccessPoints(true),
    recent: ownRecords(person.id, 5),
    credentialValid: personCredentialValid(person),
  };
  res.json(overview);
});

/** Historial propio: el servidor solo devuelve los registros de la sesión activa */
personRouter.get('/records', (req, res) => {
  res.json(ownRecords(req.person!.id, 300));
});

personRouter.post('/access', async (req, res) => {
  const data = parse(checkSchema, req.body);
  const result = await registerAccess(req.person!, {
    direction: data.direction,
    accessPointId: data.accessPointId,
    geo: data.geo,
    biometric: data.biometric as unknown as AuthenticationResponseJSON | null,
    ip: req.ip,
  });
  res.status(201).json(result);
});

/* ---------- Biometría del dispositivo ---------- */

personRouter.get('/biometrics', (req, res) => {
  res.json(listCredentials(req.person!.id));
});

personRouter.post('/biometrics/register-options', async (req, res) => {
  res.json(await registrationOptions(req.person!));
});

const registerSchema = z.object({
  response: z.record(z.string(), z.unknown()),
  label: z.string().trim().max(60).default(''),
});

personRouter.post('/biometrics', async (req, res) => {
  const data = parse(registerSchema, req.body);
  const personId = req.person!.id;
  await completeRegistration(personId, data.response as unknown as RegistrationResponseJSON, data.label);
  audit({ type: 'person', id: personId }, 'register_biometric', 'person', personId, { label: data.label });
  // Aviso al correo institucional: si no fue la persona, puede reportarlo de inmediato
  await notifyDeviceLinked(req.person!, data.label || 'Dispositivo');
  res.status(201).json(listCredentials(personId));
});

// Quitar un dispositivo ya no se hace desde el portal de la persona: lo hace la administración
// (DELETE /api/staff/people/:id/biometrics), para que nadie pueda reemplazarlo con el suyo.

personRouter.post('/biometrics/auth-options', async (req, res) => {
  res.json(await authenticationOptions(req.person!.id));
});
