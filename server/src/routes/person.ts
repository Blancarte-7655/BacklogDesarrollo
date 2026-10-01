import type { AuthenticationResponseJSON, RegistrationResponseJSON } from '@simplewebauthn/server';
import { Router } from 'express';
import { z } from 'zod';
import type { AccessRecord, PersonOverview, PersonSession } from '../../../shared/contracts.ts';
import { many } from '../db/index.ts';
import { parse } from '../lib/http.ts';
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
import { notifyDeviceLinked } from '../services/notifications.ts';
import { getPerson, personCredentialValid } from '../services/people.ts';
import { authenticationOptions, completeRegistration, listCredentials, registrationOptions } from '../services/webauthn.ts';

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
  };
  res.json(session);
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
