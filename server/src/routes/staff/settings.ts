import { randomUUID } from 'node:crypto';
import { Router, type Request } from 'express';
import { z } from 'zod';
import type { AdminDashboard, GeneratedPassword, PersonRole, StaffListItem, StaffProfile } from '../../../../shared/contracts.ts';
import { PERSON_ROLES } from '../../../../shared/rules.ts';
import { bool, many, one, run } from '../../db/index.ts';
import { dateKey, todayBounds } from '../../lib/dates.ts';
import { badRequest, conflict, HttpError, notFound, parse } from '../../lib/http.ts';
import { sendMail } from '../../lib/mailer.ts';
import { generatePassword, hashPassword } from '../../lib/passwords.ts';
import { revokeSessions } from '../../lib/sessions.ts';
import { accessPointSchema, emailSchema, staffSchema } from '../../schemas.ts';
import { getAccessPoint, listAccessPoints, openRecordCutoff } from '../../services/access.ts';
import { audit } from '../../services/audit.ts';
import { getNetworkSettings, saveNetworkSettings } from '../../services/network.ts';
import { toStaffProfile, type StaffRow } from '../../services/staff.ts';

/** Configuración del sistema: panel, accesos y operadores (solo administración) */
export const settingsRouter = Router();

const actor = (req: Request) => ({ type: 'staff' as const, id: req.staff!.id });

/* ---------- Panel de administración ---------- */

settingsRouter.get('/stats', (_req, res) => {
  const today = todayBounds();
  const count = (sql: string, ...params: Array<string | number>) => one<{ count: number }>(sql, ...params)!.count;
  const soon = new Date();
  soon.setDate(soon.getDate() + 30);

  const stats: AdminDashboard = {
    people: count('SELECT COUNT(*) AS count FROM people'),
    activePeople: count('SELECT COUNT(*) AS count FROM people WHERE active = 1'),
    expiringCredentials: count(
      'SELECT COUNT(*) AS count FROM people WHERE active = 1 AND credential_expires_at IS NOT NULL AND credential_expires_at <= ?',
      dateKey(soon),
    ),
    insideNow: count('SELECT COUNT(*) AS count FROM access_records WHERE check_out IS NULL AND incident IS NULL AND check_in >= ?', openRecordCutoff()),
    todayEntries: count('SELECT COUNT(*) AS count FROM access_records WHERE check_in BETWEEN ? AND ?', today.start, today.end),
    todayIncidents: count("SELECT COUNT(*) AS count FROM access_records WHERE status = 'incidencia' AND COALESCE(check_in, check_out) BETWEEN ? AND ?", today.start, today.end),
    accessPoints: count('SELECT COUNT(*) AS count FROM access_points WHERE active = 1'),
    guestPassesToday: count('SELECT COUNT(*) AS count FROM guest_passes WHERE valid_date = ?', dateKey(new Date())),
    unreadAlerts: count('SELECT COUNT(*) AS count FROM alerts WHERE read_at IS NULL'),
    peopleByRole: many<{ role: PersonRole; count: number }>(
      'SELECT role, COUNT(*) AS count FROM people WHERE active = 1 GROUP BY role',
    ),
  };
  res.json(stats);
});

/* ---------- Redes permitidas ---------- */

settingsRouter.get('/network', (req, res) => {
  res.json(getNetworkSettings(req.ip));
});

const networkSchema = z.object({
  campusNetworks: z.array(z.string().max(60)).max(50),
  staffNetworks: z.array(z.string().max(60)).max(50),
});

settingsRouter.put('/network', (req, res) => {
  const data = parse(networkSchema, req.body);
  const saved = saveNetworkSettings(data, req.ip);
  audit(actor(req), 'update_networks', 'settings', 'network', saved);
  res.json(getNetworkSettings(req.ip));
});

/* ---------- Accesos ---------- */

settingsRouter.post('/access-points', (req, res) => {
  const data = parse(accessPointSchema, req.body);
  if (one('SELECT id FROM access_points WHERE name = ?', data.name)) throw conflict('Ya existe un acceso con ese nombre.');
  const id = randomUUID();
  run(
    'INSERT INTO access_points (id, name, description, allowed_roles, lat, lng, radius_meters, active) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
    id,
    data.name,
    data.description,
    JSON.stringify(data.allowedRoles),
    data.lat,
    data.lng,
    data.radiusMeters,
    bool(data.active),
  );
  audit(actor(req), 'create', 'access_point', id, { name: data.name });
  res.status(201).json(getAccessPoint(id));
});

settingsRouter.put('/access-points/:id', (req, res) => {
  const { id } = req.params;
  getAccessPoint(id);
  const data = parse(accessPointSchema, req.body);
  if (one('SELECT id FROM access_points WHERE name = ? AND id <> ?', data.name, id)) throw conflict('Ya existe un acceso con ese nombre.');
  run(
    'UPDATE access_points SET name = ?, description = ?, allowed_roles = ?, lat = ?, lng = ?, radius_meters = ?, active = ? WHERE id = ?',
    data.name,
    data.description,
    JSON.stringify(data.allowedRoles),
    data.lat,
    data.lng,
    data.radiusMeters,
    bool(data.active),
    id,
  );
  audit(actor(req), 'update', 'access_point', id);
  res.json(getAccessPoint(id));
});

settingsRouter.delete('/access-points/:id', (req, res) => {
  const { id } = req.params;
  const point = getAccessPoint(id);
  const used = one<{ count: number }>('SELECT COUNT(*) AS count FROM access_records WHERE access_point_id = ?', id)!.count;
  if (used > 0) throw badRequest('Ese acceso tiene registros asociados. Desactívalo en lugar de eliminarlo.');
  run('DELETE FROM access_points WHERE id = ?', id);
  audit(actor(req), 'delete', 'access_point', id, { name: point.name });
  res.status(204).end();
});

/* ---------- Operadores ---------- */

function findStaff(id: string): StaffRow {
  const row = one<StaffRow>('SELECT * FROM staff WHERE id = ?', id);
  if (!row) throw notFound('El operador no existe.');
  return row;
}

settingsRouter.get('/staff', (_req, res) => {
  const rows = many<StaffRow & { passes: number }>(
    `SELECT s.*, (SELECT COUNT(*) FROM guest_passes g WHERE g.issued_by = s.id) AS passes
       FROM staff s ORDER BY s.role, s.full_name COLLATE NOCASE`,
  );
  const list: StaffListItem[] = rows.map(row => ({ ...toStaffProfile(row), guestPasses: row.passes }));
  res.json(list);
});

settingsRouter.post('/staff', async (req, res) => {
  const data = parse(staffSchema, req.body);
  if (one('SELECT id FROM staff WHERE email = ?', data.email)) throw conflict('Ya existe un operador con ese correo.');
  const password = generatePassword();
  const id = randomUUID();
  run(
    'INSERT INTO staff (id, email, full_name, area, role, password_hash) VALUES (?, ?, ?, ?, ?, ?)',
    id,
    data.email,
    data.fullName,
    data.area,
    data.role,
    await hashPassword(password),
  );
  audit(actor(req), 'create', 'staff', id, { email: data.email, role: data.role });
  const body: { staff: StaffProfile } & GeneratedPassword = { staff: toStaffProfile(findStaff(id)), password };
  res.status(201).json(body);
});

settingsRouter.put('/staff/:id', (req, res) => {
  const current = findStaff(req.params.id);
  const data = parse(staffSchema, req.body);
  if (current.id === req.staff!.id && data.role !== 'admin') throw badRequest('No puedes quitarte a ti mismo el rol de administrador.');
  if (one('SELECT id FROM staff WHERE email = ? AND id <> ?', data.email, current.id)) throw conflict('Ya existe un operador con ese correo.');
  run('UPDATE staff SET email = ?, full_name = ?, area = ?, role = ? WHERE id = ?', data.email, data.fullName, data.area, data.role, current.id);
  audit(actor(req), 'update', 'staff', current.id);
  res.json(toStaffProfile(findStaff(current.id)));
});

settingsRouter.patch('/staff/:id/status', (req, res) => {
  const current = findStaff(req.params.id);
  const { active } = parse(z.object({ active: z.boolean() }), req.body);
  if (current.id === req.staff!.id) throw badRequest('No puedes desactivar tu propia cuenta.');
  run('UPDATE staff SET active = ? WHERE id = ?', bool(active), current.id);
  if (!active) revokeSessions('staff', current.id);
  audit(actor(req), active ? 'activate' : 'deactivate', 'staff', current.id);
  res.json(toStaffProfile(findStaff(current.id)));
});

settingsRouter.post('/staff/:id/password', async (req, res) => {
  const current = findStaff(req.params.id);
  const password = generatePassword();
  run('UPDATE staff SET password_hash = ? WHERE id = ?', await hashPassword(password), current.id);
  revokeSessions('staff', current.id);
  audit(actor(req), 'reset_password', 'staff', current.id);
  const body: GeneratedPassword = { password };
  res.json(body);
});

settingsRouter.post('/staff/:id/email', async (req, res) => {
  const current = findStaff(req.params.id);
  const data = parse(emailSchema, req.body);
  try {
    const result = await sendMail({ to: current.email, subject: data.subject, text: data.body });
    audit(actor(req), 'send_email', 'staff', current.id, { subject: data.subject, mode: result.mode });
    res.json(result);
  } catch (error) {
    console.error(error);
    throw new HttpError(502, 'No se pudo enviar el correo. Revisa la configuración SMTP del servidor.');
  }
});

export const accessPointsForRoles = (roles: PersonRole[]) => listAccessPoints(true).filter(point => roles.some(role => point.allowedRoles.includes(role)));
export const allRoles = PERSON_ROLES;
