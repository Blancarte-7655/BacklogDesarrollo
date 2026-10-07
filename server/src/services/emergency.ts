import { randomUUID } from 'node:crypto';
import type { EmergencyKind, EmergencyPerson, EmergencyState, PersonRole } from '../../../shared/contracts.ts';
import { many, nowIso, one, run } from '../db/index.ts';
import { conflict, notFound } from '../lib/http.ts';
import { openRecordCutoff } from './access.ts';
import { notify } from './notifications.ts';

/**
 * Lista de emergencia: quién está dentro del campus en este momento. Al iniciar un simulacro
 * o una emergencia, vigilancia marca a cada persona como "a salvo" en el punto de reunión, y las
 * personas dentro reciben un aviso en su celular.
 */

interface EventRow {
  id: string;
  kind: EmergencyKind;
  started_by: string;
  started_at: string;
  ended_at: string | null;
}

interface InsideRow {
  id: string;
  check_in: string;
  person_id: string | null;
  name: string;
  code: string;
  role: PersonRole | null;
  access_point_name: string | null;
  marked_at: string | null;
}

const activeEvent = () => one<EventRow>('SELECT * FROM emergency_events WHERE ended_at IS NULL ORDER BY started_at DESC LIMIT 1');

export function emergencyState(): EmergencyState {
  const event = activeEvent() ?? null;
  const rows = many<InsideRow>(
    `SELECT r.id, r.check_in, r.person_id, COALESCE(p.full_name, g.full_name, 'Visitante') AS name,
            COALESCE(p.code, 'Invitado') AS code, p.role, ap.name AS access_point_name,
            m.marked_at
       FROM access_records r
       LEFT JOIN people p ON p.id = r.person_id
       LEFT JOIN guest_passes g ON g.id = r.guest_pass_id
       LEFT JOIN access_points ap ON ap.id = r.access_point_id
       LEFT JOIN emergency_marks m ON m.record_id = r.id AND m.event_id = ?
      WHERE r.check_out IS NULL AND r.incident IS NULL AND r.check_in >= ?
      ORDER BY name COLLATE NOCASE`,
    event?.id ?? '',
    openRecordCutoff(),
  );
  const people: EmergencyPerson[] = rows.map(row => ({
    recordId: row.id,
    name: row.name,
    code: row.code,
    role: row.role ?? 'invitado',
    accessPointName: row.access_point_name ?? 'Acceso eliminado',
    checkIn: row.check_in,
    safe: !!row.marked_at,
    markedAt: row.marked_at,
  }));
  return {
    event: event ? { id: event.id, kind: event.kind, startedAt: event.started_at, startedBy: event.started_by, endedAt: event.ended_at } : null,
    people,
    total: people.length,
    safe: people.filter(p => p.safe).length,
  };
}

export function startEmergency(kind: EmergencyKind, staffName: string): EmergencyState {
  if (activeEvent()) throw conflict('Ya hay una emergencia o simulacro en curso.');
  run('INSERT INTO emergency_events (id, kind, started_by, started_at) VALUES (?, ?, ?, ?)', randomUUID(), kind, staffName, nowIso());
  const inside = many<{ person_id: string }>(
    'SELECT DISTINCT person_id FROM access_records WHERE person_id IS NOT NULL AND check_out IS NULL AND incident IS NULL AND check_in >= ?',
    openRecordCutoff(),
  );
  for (const { person_id } of inside) {
    notify({
      personId: person_id,
      kind: 'emergencia',
      title: kind === 'simulacro' ? 'Simulacro de evacuación' : 'Emergencia en el campus',
      body: 'Sal con calma por la ruta de evacuación más cercana y dirígete al punto de reunión. Sigue las indicaciones de vigilancia.',
      link: '/acceso',
    });
  }
  return emergencyState();
}

export function toggleSafe(recordId: string, staffName: string): EmergencyState {
  const event = activeEvent();
  if (!event) throw conflict('No hay una emergencia o simulacro en curso.');
  if (!one('SELECT 1 FROM access_records WHERE id = ?', recordId)) throw notFound('El registro no existe.');
  const marked = one('SELECT 1 FROM emergency_marks WHERE event_id = ? AND record_id = ?', event.id, recordId);
  if (marked) run('DELETE FROM emergency_marks WHERE event_id = ? AND record_id = ?', event.id, recordId);
  else run('INSERT INTO emergency_marks (event_id, record_id, marked_by, marked_at) VALUES (?, ?, ?, ?)', event.id, recordId, staffName, nowIso());
  return emergencyState();
}

export function endEmergency(): EmergencyState {
  const event = activeEvent();
  if (!event) throw conflict('No hay una emergencia o simulacro en curso.');
  run('UPDATE emergency_events SET ended_at = ? WHERE id = ?', nowIso(), event.id);
  return emergencyState();
}
