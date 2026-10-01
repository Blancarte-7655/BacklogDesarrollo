import type { RequestHandler } from 'express';
import type { StaffProfile } from '../../../shared/contracts.ts';
import { one } from '../db/index.ts';
import { forbidden, unauthorized } from '../lib/http.ts';
import { readCookie, resolveSession, SESSION_COOKIES } from '../lib/sessions.ts';
import { ipAllowed, staffNetworks } from '../services/network.ts';
import type { PersonRow } from '../services/people.ts';
import { toStaffProfile, type StaffRow } from '../services/staff.ts';

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      staff?: StaffProfile;
      person?: PersonRow;
    }
  }
}

export const STAFF_NETWORK_MESSAGE = 'El portal institucional solo abre desde las computadoras autorizadas de vigilancia y administración.';

/** Vigilancia o administración */
export const requireStaff: RequestHandler = (req, _res, next) => {
  if (!ipAllowed(req.ip, staffNetworks())) throw forbidden(STAFF_NETWORK_MESSAGE);
  const token = readCookie(req, SESSION_COOKIES.staff);
  const staffId = token ? resolveSession('staff', token) : null;
  const row = staffId ? one<StaffRow>('SELECT * FROM staff WHERE id = ? AND active = 1', staffId) : undefined;
  if (!row) throw unauthorized('Tu sesión expiró. Inicia sesión nuevamente.');
  req.staff = toStaffProfile(row);
  next();
};

/** Solo administración */
export const requireAdmin: RequestHandler = (req, _res, next) => {
  if (req.staff?.role !== 'admin') throw forbidden('Esta sección es exclusiva de la administración del sistema.');
  next();
};

/** Persona con credencial institucional (alumno, docente o personal) */
export const requirePerson: RequestHandler = (req, _res, next) => {
  const token = readCookie(req, SESSION_COOKIES.person);
  const personId = token ? resolveSession('person', token) : null;
  const row = personId ? one<PersonRow>('SELECT * FROM people WHERE id = ? AND active = 1', personId) : undefined;
  if (!row) throw unauthorized('Tu sesión expiró. Inicia sesión nuevamente.');
  req.person = row;
  next();
};
