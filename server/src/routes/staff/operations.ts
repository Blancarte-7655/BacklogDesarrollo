import { Router } from 'express';
import { z } from 'zod';
import type { AccessEvent, AccessRecord, PersonRole, PresenceItem, SecurityDashboard } from '../../../../shared/contracts.ts';
import { DATE_RE, PERSON_ROLES } from '../../../../shared/rules.ts';
import { many, one, type Param } from '../../db/index.ts';
import { dayBounds, dateKey, minutesBetween, todayBounds } from '../../lib/dates.ts';
import { parse } from '../../lib/http.ts';
import { guestPassSchema, manualRecordSchema } from '../../schemas.ts';
import { openRecordCutoff, RECORDS_SQL, registerManualAccess, toRecord, type AccessRecordRow } from '../../services/access.ts';
import { accessAnalytics } from '../../services/analytics.ts';
import { alertSummary, listAlerts, reviewAlert, reviewAllAlerts } from '../../services/alerts.ts';
import { audit } from '../../services/audit.ts';
import { closeGuestPass, issueGuestPass, listGuestPasses, reenterGuest } from '../../services/guests.ts';

/** Operación diaria: tablero, registros, alertas y pases de invitado */
export const operationsRouter = Router();

interface PresenceRow {
  id: string;
  person_id: string | null;
  guest_pass_id: string | null;
  check_in: string;
  person_name: string | null;
  person_code: string | null;
  person_role: PersonRole | null;
  person_program: string | null;
  guest_name: string | null;
  guest_reason: string | null;
  access_point_name: string | null;
}

const PRESENCE_SQL = `
  SELECT r.id, r.person_id, r.guest_pass_id, r.check_in,
         p.full_name AS person_name, p.code AS person_code, p.role AS person_role, p.program AS person_program,
         g.full_name AS guest_name, g.reason AS guest_reason, ap.name AS access_point_name
    FROM access_records r
    LEFT JOIN people p ON p.id = r.person_id
    LEFT JOIN guest_passes g ON g.id = r.guest_pass_id
    LEFT JOIN access_points ap ON ap.id = r.access_point_id
   WHERE r.check_out IS NULL AND r.incident IS NULL AND r.check_in >= ?
   ORDER BY r.check_in DESC`;

const toPresence = (row: PresenceRow, now: string): PresenceItem => ({
  recordId: row.id,
  kind: row.person_id ? 'persona' : 'invitado',
  personId: row.person_id,
  name: row.person_name ?? row.guest_name ?? 'Visitante',
  code: row.person_code ?? 'Invitado',
  role: row.person_role ?? 'invitado',
  program: row.person_program ?? row.guest_reason ?? '',
  accessPointName: row.access_point_name ?? 'Acceso eliminado',
  checkIn: row.check_in,
  minutesInside: minutesBetween(row.check_in, now),
});

operationsRouter.get('/dashboard', (_req, res) => {
  const now = new Date().toISOString();
  const today = todayBounds();
  const inside = many<PresenceRow>(PRESENCE_SQL, openRecordCutoff()).map(row => toPresence(row, now));

  const byRole = new Map<PersonRole | 'invitado', number>();
  for (const item of inside) byRole.set(item.role, (byRole.get(item.role) ?? 0) + 1);

  const events = many<{ id: string; type: 'in' | 'out'; at: string; name: string; role: PersonRole | null; access_point_name: string | null; status: 'ok' | 'incidencia' }>(
    `SELECT r.id, 'in' AS type, r.check_in AS at, COALESCE(p.full_name, g.full_name, 'Visitante') AS name, p.role AS role,
            ap.name AS access_point_name, r.status
       FROM access_records r
       LEFT JOIN people p ON p.id = r.person_id
       LEFT JOIN guest_passes g ON g.id = r.guest_pass_id
       LEFT JOIN access_points ap ON ap.id = r.access_point_id
      WHERE r.check_in BETWEEN ? AND ?
      UNION ALL
     SELECT r.id, 'out' AS type, r.check_out AS at, COALESCE(p.full_name, g.full_name, 'Visitante') AS name, p.role AS role,
            ap.name AS access_point_name, r.status
       FROM access_records r
       LEFT JOIN people p ON p.id = r.person_id
       LEFT JOIN guest_passes g ON g.id = r.guest_pass_id
       LEFT JOIN access_points ap ON ap.id = r.access_point_id
      WHERE r.check_out BETWEEN ? AND ?
      ORDER BY at DESC LIMIT 40`,
    today.start,
    today.end,
    today.start,
    today.end,
  );

  const summary = alertSummary();
  const dashboard: SecurityDashboard = {
    inside,
    insideByRole: [...byRole].map(([role, count]) => ({ role, count })),
    todayEntries: one<{ count: number }>('SELECT COUNT(*) AS count FROM access_records WHERE check_in BETWEEN ? AND ?', today.start, today.end)!.count,
    todayExits: one<{ count: number }>('SELECT COUNT(*) AS count FROM access_records WHERE check_out BETWEEN ? AND ?', today.start, today.end)!.count,
    openIncidents: summary.openIncidents,
    unreadAlerts: summary.unread,
    activeGuestPasses: one<{ count: number }>('SELECT COUNT(*) AS count FROM guest_passes WHERE valid_date = ? AND closed_at IS NULL', dateKey(new Date()))!.count,
    recent: events.map<AccessEvent>(row => ({
      id: `${row.id}:${row.type}`,
      type: row.type,
      at: row.at,
      name: row.name,
      role: row.role ?? 'invitado',
      accessPointName: row.access_point_name ?? 'Acceso eliminado',
      status: row.status,
    })),
  };
  res.json(dashboard);
});

/* ---------- Afluencia para las gráficas ---------- */

operationsRouter.get('/analytics', (req, res) => {
  const { days } = parse(z.object({ days: z.coerce.number().int().min(1).max(90).default(14) }), req.query);
  res.json(accessAnalytics(days));
});

/* ---------- Historial y auditoría ---------- */

const recordsQuery = z.object({
  from: z.string().regex(DATE_RE).optional(),
  to: z.string().regex(DATE_RE).optional(),
  personId: z.string().optional(),
  accessPointId: z.string().optional(),
  role: z.enum(PERSON_ROLES as [string, ...string[]]).optional(),
  status: z.enum(['all', 'open', 'incidencia', 'ok']).default('all'),
});

operationsRouter.get('/records', (req, res) => {
  const query = parse(recordsQuery, req.query);
  const where: string[] = [];
  const params: Param[] = [];

  if (query.from) {
    where.push('COALESCE(r.check_in, r.check_out) >= ?');
    params.push(dayBounds(query.from).start);
  }
  if (query.to) {
    where.push('COALESCE(r.check_in, r.check_out) <= ?');
    params.push(dayBounds(query.to).end);
  }
  if (query.personId) {
    where.push('r.person_id = ?');
    params.push(query.personId);
  }
  if (query.accessPointId) {
    where.push('r.access_point_id = ?');
    params.push(query.accessPointId);
  }
  if (query.role) {
    where.push('p.role = ?');
    params.push(query.role);
  }
  if (query.status === 'open') where.push('r.check_out IS NULL');
  if (query.status === 'incidencia') where.push("r.status = 'incidencia'");
  if (query.status === 'ok') where.push("r.status = 'ok' AND r.check_out IS NOT NULL");

  const rows = many<AccessRecordRow>(
    `${RECORDS_SQL} ${where.length ? `WHERE ${where.join(' AND ')}` : ''} ORDER BY COALESCE(r.check_in, r.check_out) DESC LIMIT 3000`,
    ...params,
  );
  res.json(rows.map(toRecord));
});

/** Registro manual de respaldo cuando el dispositivo del usuario no puede registrar */
operationsRouter.post('/records', (req, res) => {
  const data = parse(manualRecordSchema, req.body);
  const staff = req.staff!;
  const record: AccessRecord = registerManualAccess(data, staff.id);
  audit({ type: 'staff', id: staff.id }, `manual_${data.direction}`, 'access_record', record.id, { personId: data.personId });
  res.status(201).json(record);
});

/* ---------- Alertas ---------- */

operationsRouter.get('/alerts', (req, res) => {
  res.json(listAlerts(req.query.filter === 'unread'));
});

operationsRouter.get('/alerts/summary', (_req, res) => {
  res.json(alertSummary());
});

operationsRouter.post('/alerts/read-all', (req, res) => {
  reviewAllAlerts(req.staff!.id);
  res.status(204).end();
});

operationsRouter.post('/alerts/:id/read', (req, res) => {
  res.json(reviewAlert(req.params.id, req.staff!.id));
});

/* ---------- Pases de invitado ---------- */

operationsRouter.get('/guest-passes', (req, res) => {
  const date = typeof req.query.date === 'string' && DATE_RE.test(req.query.date) ? req.query.date : undefined;
  res.json(listGuestPasses(date));
});

operationsRouter.post('/guest-passes', (req, res) => {
  const data = parse(guestPassSchema, req.body);
  const staff = req.staff!;
  const pass = issueGuestPass(data, staff.id);
  audit({ type: 'staff', id: staff.id }, 'issue_guest_pass', 'guest_pass', pass.id, { name: data.fullName });
  res.status(201).json(pass);
});

operationsRouter.post('/guest-passes/:id/reenter', (req, res) => {
  res.json(reenterGuest(req.params.id, req.staff!.id));
});

operationsRouter.post('/guest-passes/:id/close', (req, res) => {
  const staff = req.staff!;
  const pass = closeGuestPass(req.params.id, staff.id);
  audit({ type: 'staff', id: staff.id }, 'close_guest_pass', 'guest_pass', pass.id);
  res.json(pass);
});
