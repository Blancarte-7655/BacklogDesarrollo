import { randomUUID } from 'node:crypto';
import type { AuthenticationResponseJSON } from '@simplewebauthn/server';
import type {
  AccessDirection,
  AccessPoint,
  AccessRecord,
  AccessSource,
  AccessStatus,
  CheckResult,
  GeoPoint,
  IncidentType,
  PersonRole,
} from '../../../shared/contracts.ts';
import { checkGeofence, PERSON_ROLE_LABELS } from '../../../shared/rules.ts';
import { config } from '../config.ts';
import { bool, many, nowIso, one, run } from '../db/index.ts';
import { badRequest, conflict, forbidden, notFound } from '../lib/http.ts';
import { dateKey, minutesBetween, todayBounds } from '../lib/dates.ts';
import { raiseAlert } from './alerts.ts';
import { personCredentialValid, type PersonRow } from './people.ts';
import { verifyBiometric } from './webauthn.ts';

/** Una entrada se considera abierta durante 18 horas; después es una incidencia */
const OPEN_WINDOW_HOURS = 18;

export const openRecordCutoff = () => new Date(Date.now() - OPEN_WINDOW_HOURS * 60 * 60 * 1000).toISOString();

/* ---------- Accesos (puertas o áreas) ---------- */

export interface AccessPointRow {
  id: string;
  name: string;
  description: string;
  allowed_roles: string;
  lat: number | null;
  lng: number | null;
  radius_meters: number;
  active: number;
  created_at: string;
}

export const toAccessPoint = (row: AccessPointRow): AccessPoint => ({
  id: row.id,
  name: row.name,
  description: row.description,
  allowedRoles: JSON.parse(row.allowed_roles) as PersonRole[],
  lat: row.lat,
  lng: row.lng,
  radiusMeters: row.radius_meters,
  active: row.active === 1,
  createdAt: row.created_at,
});

export const listAccessPoints = (onlyActive = false): AccessPoint[] =>
  many<AccessPointRow>(`SELECT * FROM access_points ${onlyActive ? 'WHERE active = 1' : ''} ORDER BY name COLLATE NOCASE`).map(toAccessPoint);

export function getAccessPoint(id: string): AccessPoint {
  const row = one<AccessPointRow>('SELECT * FROM access_points WHERE id = ?', id);
  if (!row) throw notFound('El acceso no existe.');
  return toAccessPoint(row);
}

/* ---------- Registros ---------- */

export interface AccessRecordRow {
  id: string;
  person_id: string | null;
  guest_pass_id: string | null;
  access_point_id: string | null;
  check_in: string | null;
  check_out: string | null;
  status: AccessStatus;
  incident: IncidentType | null;
  source: AccessSource;
  biometric: number;
  geo: string | null;
  notes: string;
  person_name: string | null;
  person_code: string | null;
  person_role: PersonRole | null;
  guest_name: string | null;
  access_point_name: string | null;
  staff_name: string | null;
}

export const RECORDS_SQL = `
  SELECT r.id, r.person_id, r.guest_pass_id, r.access_point_id, r.check_in, r.check_out, r.status, r.incident,
         r.source, r.biometric, r.geo, r.notes,
         p.full_name AS person_name, p.code AS person_code, p.role AS person_role,
         g.full_name AS guest_name, ap.name AS access_point_name, s.full_name AS staff_name
    FROM access_records r
    LEFT JOIN people p ON p.id = r.person_id
    LEFT JOIN guest_passes g ON g.id = r.guest_pass_id
    LEFT JOIN access_points ap ON ap.id = r.access_point_id
    LEFT JOIN staff s ON s.id = r.registered_by`;

function parseGeo(value: string | null): GeoPoint | null {
  if (!value) return null;
  try {
    return JSON.parse(value) as GeoPoint;
  } catch {
    return null;
  }
}

export const toRecord = (row: AccessRecordRow): AccessRecord => ({
  id: row.id,
  personId: row.person_id,
  personName: row.person_name ?? row.guest_name ?? 'Visitante',
  personCode: row.person_code ?? 'Invitado',
  personRole: row.person_role,
  guestPassId: row.guest_pass_id,
  accessPointId: row.access_point_id,
  accessPointName: row.access_point_name ?? 'Acceso eliminado',
  checkIn: row.check_in,
  checkOut: row.check_out,
  minutes: row.check_in && row.check_out ? minutesBetween(row.check_in, row.check_out) : 0,
  status: row.status,
  incident: row.incident,
  source: row.source,
  biometric: row.biometric === 1,
  geo: parseGeo(row.geo),
  notes: row.notes,
  registeredByName: row.staff_name,
});

export const findRecord = (id: string) => one<AccessRecordRow>(`${RECORDS_SQL} WHERE r.id = ?`, id);

/** Entrada abierta más reciente dentro de la ventana de 18 horas */
export const findOpenRecord = (personId: string) =>
  one<AccessRecordRow>(
    `${RECORDS_SQL} WHERE r.person_id = ? AND r.check_out IS NULL AND r.check_in >= ? ORDER BY r.check_in DESC LIMIT 1`,
    personId,
    openRecordCutoff(),
  );

/* ---------- Registro desde el celular ---------- */

interface CheckInput {
  direction: AccessDirection;
  accessPointId: string;
  geo: GeoPoint | null;
  biometric: AuthenticationResponseJSON | null;
}

export async function registerAccess(person: PersonRow, input: CheckInput): Promise<CheckResult> {
  const point = getAccessPoint(input.accessPointId);

  // 1. Credencial vigente
  if (!personCredentialValid(person)) {
    raiseAlert({
      type: 'credencial_invalida',
      title: 'Intento de acceso con credencial no válida',
      body: `${person.full_name} (${person.code}) intentó registrar su ${input.direction === 'in' ? 'entrada' : 'salida'} con una credencial vencida o dada de baja.`,
      personId: person.id,
      accessPointId: point.id,
      dedupeKey: `credencial_invalida:${person.id}:${dateKey(new Date())}`,
    });
    throw forbidden('Tu credencial no está vigente. Acude a la caseta de vigilancia o a Control Escolar.');
  }

  // 2. Acceso habilitado para su rol
  if (!point.active) throw badRequest('Ese acceso está fuera de servicio. Elige otro.');
  if (!point.allowedRoles.includes(person.role)) {
    raiseAlert({
      type: 'area_no_permitida',
      title: 'Acceso denegado por área no permitida',
      body: `${person.full_name} (${person.code}, ${PERSON_ROLE_LABELS[person.role]}) intentó ingresar por ${point.name}, que no admite su rol.`,
      personId: person.id,
      accessPointId: point.id,
      dedupeKey: `area_no_permitida:${person.id}:${point.id}:${dateKey(new Date())}`,
    });
    throw forbidden(`Tu rol no tiene permitido el ingreso por ${point.name}.`);
  }

  // 3. Geocerca del acceso
  if (config.enforceGeofence && point.lat !== null && point.lng !== null) {
    if (!input.geo) throw badRequest('Activa la ubicación para registrar tu acceso.');
    const geofence = checkGeofence(input.geo, { lat: point.lat, lng: point.lng, radiusMeters: point.radiusMeters });
    if (!geofence.ok && geofence.reason === 'imprecisa') {
      throw badRequest(
        `Tu ubicación es muy imprecisa (±${input.geo.accuracy} m). Activa la ubicación precisa o sal a un lugar abierto e inténtalo de nuevo.`,
      );
    }
    if (!geofence.ok) {
      const { distance } = geofence;
      raiseAlert({
        type: 'fuera_de_area',
        title: 'Intento de registro fuera del campus',
        body: `${person.full_name} (${person.code}) intentó registrar acceso en ${point.name} a ${distance} m de distancia.`,
        personId: person.id,
        accessPointId: point.id,
        dedupeKey: `fuera_de_area:${person.id}:${dateKey(new Date())}`,
      });
      throw forbidden(`Estás a ${distance} m de ${point.name}. Acércate al acceso para registrarte.`);
    }
  }

  // 4. Identidad confirmada con la biometría del dispositivo
  const hasDevices = one<{ count: number }>('SELECT COUNT(*) AS count FROM webauthn_credentials WHERE person_id = ?', person.id)!.count > 0;
  if (config.requireBiometric) {
    if (!hasDevices) {
      throw conflict('Primero vincula la biometría de tu dispositivo desde tu perfil para poder registrar tu acceso.');
    }
    if (!input.biometric) throw badRequest('Confirma tu identidad con la huella o el rostro de tu dispositivo.');
  }
  if (input.biometric) await verifyBiometric(person.id, input.biometric);

  const timestamp = nowIso();
  const geo = input.geo ? JSON.stringify(input.geo) : null;
  const open = findOpenRecord(person.id);

  // 5. Entrada
  if (input.direction === 'in') {
    if (open) throw conflict(`Ya tienes una entrada registrada por ${open.access_point_name} desde las ${open.check_in?.slice(11, 16)}.`);
    const id = randomUUID();
    run(
      `INSERT INTO access_records (id, person_id, access_point_id, check_in, biometric, geo, source)
       VALUES (?, ?, ?, ?, ?, ?, 'app')`,
      id,
      person.id,
      point.id,
      timestamp,
      bool(!!input.biometric),
      geo,
    );
    return {
      direction: 'in',
      record: toRecord(findRecord(id)!),
      message: `Entrada registrada en ${point.name}.`,
      incident: false,
    };
  }

  // 6. Salida
  if (open) {
    run('UPDATE access_records SET check_out = ?, geo = COALESCE(geo, ?), biometric = ?, updated_at = ? WHERE id = ?', timestamp, geo, bool(!!input.biometric), timestamp, open.id);
    return {
      direction: 'out',
      record: toRecord(findRecord(open.id)!),
      message: `Salida registrada. Estuviste ${minutesBetween(open.check_in!, timestamp)} minutos dentro del campus.`,
      incident: false,
    };
  }

  // Ya había registrado su salida hoy: se avisa y no se duplica
  const today = todayBounds();
  const closedToday = one<{ id: string; check_out: string }>(
    'SELECT id, check_out FROM access_records WHERE person_id = ? AND check_out IS NOT NULL AND check_out BETWEEN ? AND ? ORDER BY check_out DESC LIMIT 1',
    person.id,
    today.start,
    today.end,
  );
  if (closedToday) throw conflict(`Ya registraste tu salida hoy a las ${closedToday.check_out.slice(11, 16)}. No se duplica el registro.`);

  // Salida sin entrada previa: se registra y se marca como incidencia
  const id = randomUUID();
  run(
    `INSERT INTO access_records (id, person_id, access_point_id, check_out, biometric, geo, source, status, incident)
     VALUES (?, ?, ?, ?, ?, ?, 'app', 'incidencia', 'salida_sin_entrada')`,
    id,
    person.id,
    point.id,
    timestamp,
    bool(!!input.biometric),
    geo,
  );
  raiseAlert({
    type: 'incidencia',
    title: 'Salida sin entrada registrada',
    body: `${person.full_name} (${person.code}) registró su salida por ${point.name} sin tener una entrada abierta.`,
    personId: person.id,
    accessPointId: point.id,
    refId: id,
    dedupeKey: `incidencia:${id}`,
  });
  return {
    direction: 'out',
    record: toRecord(findRecord(id)!),
    message: 'Salida registrada. No había una entrada previa, así que se marcó como incidencia para vigilancia.',
    incident: true,
  };
}

/* ---------- Registro manual de respaldo (vigilancia) ---------- */

export function registerManualAccess(input: { personId: string; accessPointId: string; direction: AccessDirection; notes: string }, staffId: string): AccessRecord {
  const point = getAccessPoint(input.accessPointId);
  const person = one<PersonRow>('SELECT * FROM people WHERE id = ?', input.personId);
  if (!person) throw notFound('La persona no existe.');
  if (person.active !== 1) throw forbidden('Esa persona está dada de baja.');

  const timestamp = nowIso();
  const open = findOpenRecord(person.id);

  if (input.direction === 'in') {
    if (open) throw conflict('Esa persona ya tiene una entrada abierta.');
    const id = randomUUID();
    run(
      `INSERT INTO access_records (id, person_id, access_point_id, check_in, source, notes, registered_by)
       VALUES (?, ?, ?, ?, 'manual', ?, ?)`,
      id,
      person.id,
      point.id,
      timestamp,
      input.notes,
      staffId,
    );
    return toRecord(findRecord(id)!);
  }

  if (!open) throw conflict('Esa persona no tiene una entrada abierta que cerrar.');
  run('UPDATE access_records SET check_out = ?, notes = ?, registered_by = ?, updated_at = ? WHERE id = ?', timestamp, input.notes, staffId, timestamp, open.id);
  return toRecord(findRecord(open.id)!);
}

/** Marca como incidencia las entradas que se quedaron abiertas más de 18 horas */
export function closeStaleRecords() {
  const stale = many<{ id: string; check_in: string; person_id: string | null; full_name: string | null; code: string | null }>(
    `SELECT r.id, r.check_in, r.person_id, p.full_name, p.code
       FROM access_records r LEFT JOIN people p ON p.id = r.person_id
      WHERE r.check_out IS NULL AND r.incident IS NULL AND r.check_in < ?`,
    openRecordCutoff(),
  );
  for (const row of stale) {
    run("UPDATE access_records SET status = 'incidencia', incident = 'sin_salida', updated_at = ? WHERE id = ?", nowIso(), row.id);
    raiseAlert({
      type: 'incidencia',
      title: 'Entrada sin salida registrada',
      body: `${row.full_name ?? 'Visitante'}${row.code ? ` (${row.code})` : ''} no registró su salida del ${dateKey(new Date(row.check_in))}.`,
      personId: row.person_id,
      refId: row.id,
      dedupeKey: `incidencia:${row.id}`,
    });
  }
}
