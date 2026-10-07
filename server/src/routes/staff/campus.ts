import { Router, type Request } from 'express';
import { z } from 'zod';
import { DATE_RE } from '../../../../shared/rules.ts';
import { dateKey } from '../../lib/dates.ts';
import { badRequest, parse } from '../../lib/http.ts';
import { requireAdmin } from '../../middleware/auth.ts';
import { audit } from '../../services/audit.ts';
import { clearDemo, DEMO_PASSWORD, DEMO_STUDENT_CODE, DEMO_TEACHER_CODE, demoStatus, loadDemo } from '../../services/demo.ts';
import { allDisplayPins } from '../../services/displays.ts';
import { emergencyState, endEmergency, startEmergency, toggleSafe } from '../../services/emergency.ts';
import { admitInvitation, findInvitationByCode, listInvitationsForDate } from '../../services/invitations.ts';
import { acceptPrivacy } from '../../services/privacy.ts';
import { accessReport } from '../../services/reports.ts';
import {
  createRoom,
  deleteRoom,
  endSessionByStaff,
  listRooms,
  reportIncident,
  resolveIncident,
  roomDetail,
  setStationService,
} from '../../services/stations.ts';

/** Funciones de campus para vigilancia y administración: invitaciones, laboratorios, pantallas, emergencia y reportes */
export const campusRouter = Router();

const actor = (req: Request) => ({ type: 'staff' as const, id: req.staff!.id });

campusRouter.post('/privacy/accept', (req, res) => {
  acceptPrivacy('staff', req.staff!.id);
  audit(actor(req), 'accept_privacy', 'staff', req.staff!.id);
  res.status(204).end();
});

/* ---------- Invitaciones con QR ---------- */

campusRouter.get('/invitations', (req, res) => {
  const date = typeof req.query.date === 'string' && DATE_RE.test(req.query.date) ? req.query.date : dateKey(new Date());
  res.json(listInvitationsForDate(date));
});

campusRouter.get('/invitations/:code', (req, res) => {
  res.json(findInvitationByCode(req.params.code));
});

campusRouter.post('/invitations/:code/admit', (req, res) => {
  const result = admitInvitation(req.params.code, req.staff!.id);
  audit(actor(req), 'admit_invitation', 'invitation', result.invitation.id, { guest: result.invitation.guestName });
  res.json(result);
});

/* ---------- Laboratorios y equipos ---------- */

campusRouter.get('/rooms', (_req, res) => {
  res.json(listRooms());
});

campusRouter.get('/rooms/:id', (req, res) => {
  res.json(roomDetail(req.params.id));
});

const roomSchema = z.object({
  name: z.string().trim().min(3, 'Escribe el nombre del salón o laboratorio.').max(80),
  building: z.string().trim().max(60).default(''),
  kind: z.enum(['laboratorio', 'salon']),
  hasDisplay: z.boolean().default(true),
  stations: z.number().int().min(0).max(80),
});

campusRouter.post('/rooms', requireAdmin, (req, res) => {
  const room = createRoom(parse(roomSchema, req.body));
  audit(actor(req), 'create_room', 'room', room.id, { name: room.name });
  res.status(201).json(room);
});

campusRouter.delete('/rooms/:id', requireAdmin, (req, res) => {
  const id = String(req.params.id);
  deleteRoom(id);
  audit(actor(req), 'delete_room', 'room', id);
  res.status(204).end();
});

campusRouter.post('/stations/:id/service', (req, res) => {
  const { inService } = parse(z.object({ inService: z.boolean() }), req.body);
  res.json(setStationService(req.params.id, inService));
});

campusRouter.post('/stations/:id/incidents', (req, res) => {
  const { description } = parse(z.object({ description: z.string().trim().min(5, 'Describe lo que pasó.').max(500) }), req.body);
  const incident = reportIncident(req.params.id, description, req.staff!.fullName);
  audit(actor(req), 'report_station_incident', 'station', req.params.id);
  res.status(201).json(incident);
});

campusRouter.post('/station-incidents/:id/resolve', (req, res) => {
  resolveIncident(req.params.id);
  res.status(204).end();
});

campusRouter.post('/station-sessions/:id/end', (req, res) => {
  endSessionByStaff(req.params.id, req.staff!.fullName);
  audit(actor(req), 'end_station_session', 'station_session', req.params.id);
  res.status(204).end();
});

/* ---------- Pantallas con PIN ---------- */

campusRouter.get('/displays', (_req, res) => {
  res.json(allDisplayPins());
});

/* ---------- Emergencias y simulacros ---------- */

campusRouter.get('/emergency', (_req, res) => {
  res.json(emergencyState());
});

campusRouter.post('/emergency/start', (req, res) => {
  const { kind } = parse(z.object({ kind: z.enum(['simulacro', 'emergencia']) }), req.body);
  const state = startEmergency(kind, req.staff!.fullName);
  audit(actor(req), 'start_emergency', 'emergency', state.event!.id, { kind });
  res.json(state);
});

campusRouter.post('/emergency/:recordId/safe', (req, res) => {
  res.json(toggleSafe(req.params.recordId, req.staff!.fullName));
});

campusRouter.post('/emergency/end', (req, res) => {
  const state = endEmergency();
  audit(actor(req), 'end_emergency', 'emergency', null);
  res.json(state);
});

/* ---------- Reportes en Excel ---------- */

campusRouter.get('/reports/excel', (req, res) => {
  const { from, to } = parse(z.object({ from: z.string().regex(DATE_RE), to: z.string().regex(DATE_RE) }), req.query);
  if (from > to) throw badRequest('La fecha inicial debe ser anterior a la final.');
  const file = accessReport(from, to);
  audit(actor(req), 'export_excel', 'report', null, { from, to });
  res.set({
    'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'Content-Disposition': `attachment; filename="uniaccess-reporte-${from}_a_${to}.xlsx"`,
  });
  res.send(file);
});

/* ---------- Modo de demostración (solo administración) ---------- */

const demoInfo = () => ({ ...demoStatus(), password: DEMO_PASSWORD, teacherCode: DEMO_TEACHER_CODE, studentCode: DEMO_STUDENT_CODE });

campusRouter.get('/demo', requireAdmin, (_req, res) => {
  res.json(demoInfo());
});

campusRouter.post('/demo/load', requireAdmin, async (req, res) => {
  await loadDemo();
  audit(actor(req), 'load_demo', 'demo', null);
  res.json(demoInfo());
});

campusRouter.post('/demo/clear', requireAdmin, (req, res) => {
  clearDemo();
  audit(actor(req), 'clear_demo', 'demo', null);
  res.json(demoInfo());
});
