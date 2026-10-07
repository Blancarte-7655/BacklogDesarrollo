import { randomInt, randomUUID } from 'node:crypto';
import type { Room, RoomDetail, RoomInput, Station, StationIncident, StationSession } from '../../../shared/contracts.ts';
import { CODE_ALPHABET } from '../../../shared/campus.ts';
import { many, nowIso, one, run, transaction } from '../db/index.ts';
import { minutesBetween } from '../lib/dates.ts';
import { conflict, forbidden, notFound } from '../lib/http.ts';
import { findOpenRecord } from './access.ts';
import { notify } from './notifications.ts';
import type { PersonRow } from './people.ts';

/**
 * Uso de equipos en laboratorios: cada computadora tiene un QR. Al sentarse, la persona lo
 * escanea y confirma con su biometría; queda registrado quién usó cada equipo y cuándo.
 * Si alguien reporta una falla o un mal uso, se sabe quién estaba en ese equipo a esa hora.
 */

/* ---------- Salones ---------- */

interface RoomRow {
  id: string;
  name: string;
  building: string;
  kind: 'laboratorio' | 'salon';
  has_display: number;
  stations: number;
  occupied: number;
  open_incidents: number;
}

const ROOMS_SQL = `
  SELECT r.*,
         (SELECT COUNT(*) FROM stations s WHERE s.room_id = r.id) AS stations,
         (SELECT COUNT(*) FROM station_sessions ss JOIN stations s ON s.id = ss.station_id WHERE s.room_id = r.id AND ss.ended_at IS NULL) AS occupied,
         (SELECT COUNT(*) FROM station_incidents si JOIN stations s ON s.id = si.station_id WHERE s.room_id = r.id AND si.resolved_at IS NULL) AS open_incidents
    FROM rooms r`;

const toRoom = (row: RoomRow): Room => ({
  id: row.id,
  name: row.name,
  building: row.building,
  kind: row.kind,
  hasDisplay: row.has_display === 1,
  stations: row.stations,
  occupied: row.occupied,
  openIncidents: row.open_incidents,
});

export const listRooms = (): Room[] => many<RoomRow>(`${ROOMS_SQL} ORDER BY r.kind, r.name COLLATE NOCASE`).map(toRoom);

export function getRoom(id: string): Room {
  const row = one<RoomRow>(`${ROOMS_SQL} WHERE r.id = ?`, id);
  if (!row) throw notFound('El salón no existe.');
  return toRoom(row);
}

function stationCode(): string {
  for (;;) {
    let code = '';
    for (let i = 0; i < 6; i++) code += CODE_ALPHABET[randomInt(CODE_ALPHABET.length)];
    if (!one('SELECT 1 FROM stations WHERE code = ?', code)) return code;
  }
}

export function createRoom(input: RoomInput, idPrefix = ''): Room {
  if (one('SELECT 1 FROM rooms WHERE name = ?', input.name)) throw conflict('Ya existe un salón con ese nombre.');
  const id = `${idPrefix}${randomUUID()}`;
  transaction(() => {
    run('INSERT INTO rooms (id, name, building, kind, has_display) VALUES (?, ?, ?, ?, ?)', id, input.name, input.building, input.kind, input.hasDisplay ? 1 : 0);
    for (let i = 1; i <= input.stations; i++) {
      run('INSERT INTO stations (id, room_id, label, code) VALUES (?, ?, ?, ?)', `${idPrefix}${randomUUID()}`, id, `PC-${String(i).padStart(2, '0')}`, stationCode());
    }
  });
  return getRoom(id);
}

export function deleteRoom(id: string) {
  getRoom(id);
  run('DELETE FROM rooms WHERE id = ?', id);
}

/* ---------- Equipos ---------- */

interface StationRow {
  id: string;
  room_id: string;
  room_name: string;
  label: string;
  code: string;
  in_service: number;
  session_id: string | null;
  person_id: string | null;
  person_name: string | null;
  person_code: string | null;
  started_at: string | null;
  open_incidents: number;
}

const STATIONS_SQL = `
  SELECT s.id, s.room_id, r.name AS room_name, s.label, s.code, s.in_service,
         ss.id AS session_id, ss.person_id, p.full_name AS person_name, p.code AS person_code, ss.started_at,
         (SELECT COUNT(*) FROM station_incidents si WHERE si.station_id = s.id AND si.resolved_at IS NULL) AS open_incidents
    FROM stations s
    JOIN rooms r ON r.id = s.room_id
    LEFT JOIN station_sessions ss ON ss.station_id = s.id AND ss.ended_at IS NULL
    LEFT JOIN people p ON p.id = ss.person_id`;

const toStation = (row: StationRow): Station => ({
  id: row.id,
  roomId: row.room_id,
  roomName: row.room_name,
  label: row.label,
  code: row.code,
  inService: row.in_service === 1,
  occupant:
    row.session_id && row.person_id
      ? { sessionId: row.session_id, personId: row.person_id, name: row.person_name ?? '', code: row.person_code ?? '', since: row.started_at! }
      : null,
  openIncidents: row.open_incidents,
});

export function stationByCode(code: string): Station {
  const row = one<StationRow>(`${STATIONS_SQL} WHERE s.code = ?`, code.trim().toUpperCase());
  if (!row) throw notFound('No existe un equipo con ese código. Revisa la etiqueta.');
  return toStation(row);
}

function stationById(id: string): Station {
  const row = one<StationRow>(`${STATIONS_SQL} WHERE s.id = ?`, id);
  if (!row) throw notFound('El equipo no existe.');
  return toStation(row);
}

export function setStationService(id: string, inService: boolean): Station {
  stationById(id);
  run('UPDATE stations SET in_service = ? WHERE id = ?', inService ? 1 : 0, id);
  return stationById(id);
}

/* ---------- Sesiones de uso ---------- */

interface SessionRow {
  id: string;
  station_id: string;
  station_label: string;
  room_name: string;
  person_id: string;
  person_name: string;
  person_code: string;
  started_at: string;
  ended_at: string | null;
}

const SESSIONS_SQL = `
  SELECT ss.id, ss.station_id, s.label AS station_label, r.name AS room_name, ss.person_id,
         p.full_name AS person_name, p.code AS person_code, ss.started_at, ss.ended_at
    FROM station_sessions ss
    JOIN stations s ON s.id = ss.station_id
    JOIN rooms r ON r.id = s.room_id
    JOIN people p ON p.id = ss.person_id`;

const toSession = (row: SessionRow): StationSession => ({
  id: row.id,
  stationId: row.station_id,
  stationLabel: row.station_label,
  roomName: row.room_name,
  personId: row.person_id,
  personName: row.person_name,
  personCode: row.person_code,
  startedAt: row.started_at,
  endedAt: row.ended_at,
  minutes: minutesBetween(row.started_at, row.ended_at ?? nowIso()),
});

export const activeSession = (personId: string): StationSession | null => {
  const row = one<SessionRow>(`${SESSIONS_SQL} WHERE ss.person_id = ? AND ss.ended_at IS NULL`, personId);
  return row ? toSession(row) : null;
};

export const personSessions = (personId: string): StationSession[] =>
  many<SessionRow>(`${SESSIONS_SQL} WHERE ss.person_id = ? ORDER BY ss.started_at DESC LIMIT 30`, personId).map(toSession);

/** Inicia el uso de un equipo. Requiere haber registrado la entrada al campus. */
export function startSession(person: PersonRow, code: string, requireInside = true): StationSession {
  const station = stationByCode(code);
  if (!station.inService) throw conflict(`${station.label} está fuera de servicio. Usa otro equipo y avisa al encargado.`);
  if (requireInside && !findOpenRecord(person.id)) {
    throw forbidden('Primero registra tu entrada al campus para poder usar un equipo.');
  }
  if (station.occupant && station.occupant.personId !== person.id) {
    throw conflict(`${station.label} aparece en uso por otra persona. Si está libre, avisa al encargado del laboratorio.`);
  }
  const current = activeSession(person.id);
  if (current?.stationId === station.id) return current;
  const timestamp = nowIso();
  const id = randomUUID();
  transaction(() => {
    if (current) run("UPDATE station_sessions SET ended_at = ?, ended_by = 'cambio de equipo' WHERE id = ?", timestamp, current.id);
    run('INSERT INTO station_sessions (id, station_id, person_id, started_at) VALUES (?, ?, ?, ?)', id, station.id, person.id, timestamp);
  });
  return toSession(one<SessionRow>(`${SESSIONS_SQL} WHERE ss.id = ?`, id)!);
}

export function endPersonSession(personId: string, reason = 'la persona'): StationSession | null {
  const current = activeSession(personId);
  if (!current) return null;
  run('UPDATE station_sessions SET ended_at = ?, ended_by = ? WHERE id = ?', nowIso(), reason, current.id);
  return toSession(one<SessionRow>(`${SESSIONS_SQL} WHERE ss.id = ?`, current.id)!);
}

export function endSessionByStaff(sessionId: string, staffName: string) {
  const row = one<SessionRow>(`${SESSIONS_SQL} WHERE ss.id = ?`, sessionId);
  if (!row) throw notFound('La sesión no existe.');
  if (row.ended_at) throw conflict('Esa sesión ya terminó.');
  run('UPDATE station_sessions SET ended_at = ?, ended_by = ? WHERE id = ?', nowIso(), `vigilancia (${staffName})`, sessionId);
  notify({
    personId: row.person_id,
    kind: 'equipo',
    title: `Se cerró tu sesión en ${row.station_label}`,
    body: `El encargado de ${row.room_name} terminó tu uso del equipo.`,
    link: '/acceso/equipo',
  });
}

/** Cierra sesiones olvidadas (más de 5 horas) y avisa a la persona */
export function closeStaleSessions(now = new Date()) {
  const limit = new Date(now.getTime() - 5 * 60 * 60 * 1000).toISOString();
  const stale = many<SessionRow>(`${SESSIONS_SQL} WHERE ss.ended_at IS NULL AND ss.started_at < ?`, limit);
  for (const row of stale) {
    run("UPDATE station_sessions SET ended_at = ?, ended_by = 'cierre automático' WHERE id = ?", now.toISOString(), row.id);
    notify({
      personId: row.person_id,
      kind: 'equipo',
      title: `Cerramos tu sesión en ${row.station_label}`,
      body: 'Llevaba más de 5 horas abierta. La próxima vez, termina tu sesión al dejar el equipo.',
      link: '/acceso/equipo',
      dedupeKey: `equipo-cierre:${row.id}`,
    });
  }
}

/* ---------- Incidencias de equipo ---------- */

interface IncidentRow {
  id: string;
  station_id: string;
  station_label: string;
  room_name: string;
  person_name: string | null;
  person_code: string | null;
  description: string;
  reported_by: string;
  created_at: string;
  resolved_at: string | null;
}

const INCIDENTS_SQL = `
  SELECT si.id, si.station_id, s.label AS station_label, r.name AS room_name, p.full_name AS person_name, p.code AS person_code,
         si.description, si.reported_by, si.created_at, si.resolved_at
    FROM station_incidents si
    JOIN stations s ON s.id = si.station_id
    JOIN rooms r ON r.id = s.room_id
    LEFT JOIN people p ON p.id = si.person_id`;

const toIncident = (row: IncidentRow): StationIncident => ({
  id: row.id,
  stationId: row.station_id,
  stationLabel: row.station_label,
  roomName: row.room_name,
  personName: row.person_name,
  personCode: row.person_code,
  description: row.description,
  reportedBy: row.reported_by,
  createdAt: row.created_at,
  resolvedAt: row.resolved_at,
});

/**
 * Reporta una falla o mal uso. Liga automáticamente a quien estaba usando el equipo a esa hora
 * (o en la última hora, si el equipo ya está libre).
 */
export function reportIncident(stationId: string, description: string, reportedBy: string, idPrefix = ''): StationIncident {
  stationById(stationId);
  const since = new Date(Date.now() - 60 * 60 * 1000).toISOString();
  const lastUser = one<{ person_id: string }>(
    'SELECT person_id FROM station_sessions WHERE station_id = ? AND (ended_at IS NULL OR ended_at >= ?) ORDER BY started_at DESC LIMIT 1',
    stationId,
    since,
  );
  const id = `${idPrefix}${randomUUID()}`;
  run(
    'INSERT INTO station_incidents (id, station_id, person_id, description, reported_by) VALUES (?, ?, ?, ?, ?)',
    id,
    stationId,
    lastUser?.person_id ?? null,
    description,
    reportedBy,
  );
  return toIncident(one<IncidentRow>(`${INCIDENTS_SQL} WHERE si.id = ?`, id)!);
}

export function resolveIncident(id: string) {
  if (!one('SELECT 1 FROM station_incidents WHERE id = ?', id)) throw notFound('La incidencia no existe.');
  run('UPDATE station_incidents SET resolved_at = ? WHERE id = ? AND resolved_at IS NULL', nowIso(), id);
}

export function roomDetail(id: string): RoomDetail {
  const room = getRoom(id);
  return {
    room,
    stations: many<StationRow>(`${STATIONS_SQL} WHERE s.room_id = ? ORDER BY s.label`, id).map(toStation),
    recentSessions: many<SessionRow>(`${SESSIONS_SQL} WHERE s.room_id = ? ORDER BY ss.started_at DESC LIMIT 40`, id).map(toSession),
    incidents: many<IncidentRow>(`${INCIDENTS_SQL} WHERE s.room_id = ? ORDER BY si.resolved_at IS NOT NULL, si.created_at DESC LIMIT 40`, id).map(toIncident),
  };
}

/** Para los reportes de Excel */
export const sessionsBetween = (start: string, end: string) =>
  many<SessionRow>(`${SESSIONS_SQL} WHERE ss.started_at BETWEEN ? AND ? ORDER BY ss.started_at`, start, end).map(toSession);

export const incidentsBetween = (start: string, end: string) =>
  many<IncidentRow>(`${INCIDENTS_SQL} WHERE si.created_at BETWEEN ? AND ? ORDER BY si.created_at`, start, end).map(toIncident);
