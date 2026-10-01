import { Router } from 'express';
import { z } from 'zod';
import type { PersonSession } from '../../../shared/contracts.ts';
import { nowIso, one, run } from '../db/index.ts';
import { forbidden, parse, unauthorized } from '../lib/http.ts';
import { verifyPassword } from '../lib/passwords.ts';
import { clearRateLimit, hitRateLimit, MINUTE } from '../lib/rateLimit.ts';
import { endSession, startSession } from '../lib/sessions.ts';
import { STAFF_NETWORK_MESSAGE } from '../middleware/auth.ts';
import { ipAllowed, staffNetworks } from '../services/network.ts';
import { audit } from '../services/audit.ts';
import { personCredentialValid, type PersonRow } from '../services/people.ts';
import { toStaffProfile, type StaffRow } from '../services/staff.ts';

export const authRouter = Router();

const password = z.string().min(1, 'Escribe tu contraseña.').max(200);

const staffLoginSchema = z.object({
  email: z.string().trim().toLowerCase().min(1, 'Escribe tu correo institucional.').max(200),
  password,
});

const personLoginSchema = z.object({
  identifier: z.string().trim().toLowerCase().min(1, 'Escribe tu matrícula o correo institucional.').max(200),
  password,
});

/* ---------- Portal institucional (vigilancia y administración) ---------- */

authRouter.post('/staff/login', async (req, res) => {
  const { email, password } = parse(staffLoginSchema, req.body);
  if (!ipAllowed(req.ip, staffNetworks())) throw forbidden(STAFF_NETWORK_MESSAGE);
  const limiterKey = `staff-login:${req.ip}:${email}`;
  hitRateLimit(limiterKey, 5, 15 * MINUTE);

  const staff = one<StaffRow>('SELECT * FROM staff WHERE email = ?', email);
  const valid = await verifyPassword(password, staff?.password_hash ?? null);
  if (!staff || !valid) throw unauthorized('Correo institucional o contraseña incorrectos.');
  if (!staff.active) throw forbidden('Tu cuenta está desactivada. Contacta al administrador del sistema.');

  clearRateLimit(limiterKey);
  const loginAt = nowIso();
  run('UPDATE staff SET last_login_at = ? WHERE id = ?', loginAt, staff.id);
  startSession(res, 'staff', staff.id, req.get('user-agent'));
  audit({ type: 'staff', id: staff.id }, 'login', 'staff', staff.id);
  res.json(toStaffProfile({ ...staff, last_login_at: loginAt }));
});

authRouter.post('/staff/logout', (req, res) => {
  endSession(req, res, 'staff');
  res.status(204).end();
});

/* ---------- Portal de acceso (alumnos, docentes y personal) ---------- */

authRouter.post('/person/login', async (req, res) => {
  const { identifier, password } = parse(personLoginSchema, req.body);
  const limiterKey = `person-login:${req.ip}:${identifier}`;
  hitRateLimit(limiterKey, 5, 15 * MINUTE);

  const person = one<PersonRow>('SELECT * FROM people WHERE code = ? OR email = ?', identifier, identifier);
  const valid = await verifyPassword(password, person?.password_hash ?? null);
  if (!person || !valid) throw unauthorized('Matrícula o correo y contraseña no coinciden.');
  if (!person.active) throw forbidden('Tu credencial fue dada de baja. Acude a la caseta de vigilancia.');
  if (!personCredentialValid(person)) {
    throw forbidden(`Tu credencial venció el ${person.credential_expires_at}. Acude a Control Escolar para renovarla.`);
  }

  clearRateLimit(limiterKey);
  run('UPDATE people SET last_login_at = ? WHERE id = ?', nowIso(), person.id);
  startSession(res, 'person', person.id, req.get('user-agent'));
  const session: PersonSession = {
    id: person.id,
    code: person.code,
    fullName: person.full_name,
    email: person.email,
    role: person.role,
  };
  res.json(session);
});

authRouter.post('/person/logout', (req, res) => {
  endSession(req, res, 'person');
  res.status(204).end();
});
