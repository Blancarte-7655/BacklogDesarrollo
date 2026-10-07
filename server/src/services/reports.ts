import type { PersonRole } from '../../../shared/contracts.ts';
import { ALERT_LABELS, INCIDENT_LABELS, PERSON_ROLE_LABELS } from '../../../shared/rules.ts';
import { many } from '../db/index.ts';
import { addDays, dateKey, dayBounds, minutesBetween } from '../lib/dates.ts';
import { buildXlsx, type Sheet } from '../lib/xlsx.ts';
import { RECORDS_SQL, toRecord, type AccessRecordRow } from './access.ts';
import { incidentsBetween, sessionsBetween } from './stations.ts';

/**
 * Reporte de afluencia en Excel para directivos (historia 10): resumen, registros, por día,
 * por tipo de persona, por acceso, alertas, invitados y uso de equipos de laboratorio.
 */

const local = (iso: string | null) => (iso ? new Date(iso).toLocaleString('es-MX', { dateStyle: 'short', timeStyle: 'short', hourCycle: 'h23' }) : '');
const roleLabel = (role: PersonRole | null) => (role ? PERSON_ROLE_LABELS[role] : 'Invitado');

export function accessReport(from: string, to: string): Buffer {
  const start = dayBounds(from).start;
  const end = dayBounds(to).end;
  const records = many<AccessRecordRow>(
    `${RECORDS_SQL} WHERE COALESCE(r.check_in, r.check_out) BETWEEN ? AND ? ORDER BY COALESCE(r.check_in, r.check_out)`,
    start,
    end,
  ).map(toRecord);

  // Por día
  const days: string[] = [];
  for (let d = new Date(`${from}T12:00:00`); dateKey(d) <= to; d = addDays(d, 1)) days.push(dateKey(d));
  const perDay = new Map(days.map(day => [day, { entries: 0, exits: 0, incidents: 0, people: new Set<string>() }]));
  const perRole = new Map<string, { entries: number; minutes: number; closed: number }>();
  const perPoint = new Map<string, number>();
  const perHour = new Array<number>(24).fill(0);

  for (const record of records) {
    if (record.checkIn) {
      const key = dateKey(new Date(record.checkIn));
      const day = perDay.get(key);
      if (day) {
        day.entries++;
        day.people.add(record.personId ?? record.guestPassId ?? record.id);
      }
      perHour[new Date(record.checkIn).getHours()]++;
      const role = roleLabel(record.personRole);
      const stats = perRole.get(role) ?? { entries: 0, minutes: 0, closed: 0 };
      stats.entries++;
      if (record.checkOut) {
        stats.minutes += record.minutes;
        stats.closed++;
      }
      perRole.set(role, stats);
      perPoint.set(record.accessPointName, (perPoint.get(record.accessPointName) ?? 0) + 1);
    }
    if (record.checkOut) {
      const day = perDay.get(dateKey(new Date(record.checkOut)));
      if (day) day.exits++;
    }
    if (record.status === 'incidencia') {
      const day = perDay.get(dateKey(new Date(record.checkIn ?? record.checkOut!)));
      if (day) day.incidents++;
    }
  }

  const alerts = many<{ type: keyof typeof ALERT_LABELS; title: string; body: string; created_at: string; read_at: string | null }>(
    'SELECT type, title, body, created_at, read_at FROM alerts WHERE created_at BETWEEN ? AND ? ORDER BY created_at',
    start,
    end,
  );
  const invitations = many<{ code: string; guest_name: string; reason: string; visit_date: string; status: string; used_at: string | null; host: string | null }>(
    `SELECT i.code, i.guest_name, i.reason, i.visit_date, i.status, i.used_at, p.full_name AS host
       FROM invitations i LEFT JOIN people p ON p.id = i.host_person_id
      WHERE i.visit_date BETWEEN ? AND ? ORDER BY i.visit_date`,
    from,
    to,
  );
  const sessions = sessionsBetween(start, end);
  const incidents = incidentsBetween(start, end);

  const totalEntries = records.filter(r => r.checkIn).length;
  const closed = records.filter(r => r.checkIn && r.checkOut);
  const peakHour = perHour.indexOf(Math.max(...perHour));

  const sheets: Sheet[] = [
    {
      name: 'Resumen',
      columns: [{ header: 'Indicador', width: 38 }, { header: 'Valor', width: 26 }],
      rows: [
        ['Periodo', `${from} a ${to}`],
        ['Generado', local(new Date().toISOString())],
        ['Entradas registradas', totalEntries],
        ['Personas distintas', new Set(records.map(r => r.personId ?? r.guestPassId)).size],
        ['Estancia promedio (minutos)', closed.length ? Math.round(closed.reduce((s, r) => s + r.minutes, 0) / closed.length) : 0],
        ['Hora con más entradas', totalEntries ? `${String(peakHour).padStart(2, '0')}:00` : '—'],
        ['Incidencias de registro', records.filter(r => r.status === 'incidencia').length],
        ['Intentos de acceso denegados', alerts.filter(a => a.type !== 'incidencia' && a.type !== 'pase_vencido').length],
        ['Invitaciones atendidas', invitations.filter(i => i.status === 'usada').length],
        ['Sesiones en equipos de laboratorio', sessions.length],
        ['Incidencias en equipos', incidents.length],
      ],
    },
    {
      name: 'Registros',
      columns: [
        { header: 'Persona', width: 30 },
        { header: 'Código', width: 13 },
        { header: 'Tipo', width: 11 },
        { header: 'Acceso', width: 22 },
        { header: 'Entrada', width: 17 },
        { header: 'Salida', width: 17 },
        { header: 'Minutos', width: 10 },
        { header: 'Estado', width: 26 },
        { header: 'Origen', width: 10 },
        { header: 'Biometría', width: 11 },
      ],
      rows: records.map(r => [
        r.personName,
        r.personCode,
        roleLabel(r.personRole),
        r.accessPointName,
        local(r.checkIn),
        local(r.checkOut),
        r.checkIn && r.checkOut ? r.minutes : null,
        r.incident ? INCIDENT_LABELS[r.incident] : r.checkOut ? 'Completo' : 'Abierto',
        r.source === 'app' ? 'Celular' : 'Manual',
        r.biometric ? 'Sí' : 'No',
      ]),
    },
    {
      name: 'Por día',
      columns: [{ header: 'Fecha', width: 14 }, { header: 'Entradas' }, { header: 'Salidas' }, { header: 'Personas distintas', width: 20 }, { header: 'Incidencias' }],
      rows: days.map(day => {
        const d = perDay.get(day)!;
        return [day, d.entries, d.exits, d.people.size, d.incidents];
      }),
    },
    {
      name: 'Por tipo de persona',
      columns: [{ header: 'Tipo', width: 16 }, { header: 'Entradas' }, { header: 'Estancia promedio (min)', width: 24 }],
      rows: [...perRole].map(([role, s]) => [role, s.entries, s.closed ? Math.round(s.minutes / s.closed) : null]),
    },
    {
      name: 'Por acceso',
      columns: [{ header: 'Acceso', width: 26 }, { header: 'Entradas' }],
      rows: [...perPoint].sort((a, b) => b[1] - a[1]),
    },
    {
      name: 'Por hora',
      columns: [{ header: 'Hora', width: 10 }, { header: 'Entradas' }],
      rows: perHour.map((count, hour) => [`${String(hour).padStart(2, '0')}:00`, count]),
    },
    {
      name: 'Alertas',
      columns: [{ header: 'Fecha', width: 17 }, { header: 'Tipo', width: 26 }, { header: 'Detalle', width: 80 }, { header: 'Revisada', width: 10 }],
      rows: alerts.map(a => [local(a.created_at), ALERT_LABELS[a.type] ?? a.type, a.body, a.read_at ? 'Sí' : 'No']),
    },
    {
      name: 'Invitados',
      columns: [
        { header: 'Fecha', width: 12 },
        { header: 'Invitado', width: 28 },
        { header: 'Anfitrión', width: 28 },
        { header: 'Motivo', width: 34 },
        { header: 'Estado', width: 12 },
        { header: 'Llegada', width: 17 },
      ],
      rows: invitations.map(i => [i.visit_date, i.guest_name, i.host ?? '', i.reason, i.status, local(i.used_at)]),
    },
    {
      name: 'Uso de equipos',
      columns: [
        { header: 'Laboratorio', width: 26 },
        { header: 'Equipo', width: 9 },
        { header: 'Persona', width: 28 },
        { header: 'Código', width: 13 },
        { header: 'Inicio', width: 17 },
        { header: 'Fin', width: 17 },
        { header: 'Minutos', width: 10 },
      ],
      rows: sessions.map(s => [s.roomName, s.stationLabel, s.personName, s.personCode, local(s.startedAt), local(s.endedAt), s.endedAt ? minutesBetween(s.startedAt, s.endedAt) : null]),
    },
    {
      name: 'Incidencias de equipos',
      columns: [
        { header: 'Fecha', width: 17 },
        { header: 'Laboratorio', width: 26 },
        { header: 'Equipo', width: 9 },
        { header: 'Quién lo usaba', width: 28 },
        { header: 'Descripción', width: 60 },
        { header: 'Reportó', width: 24 },
        { header: 'Resuelta', width: 10 },
      ],
      rows: incidents.map(i => [local(i.createdAt), i.roomName, i.stationLabel, i.personName ? `${i.personName} (${i.personCode})` : 'Sin registro', i.description, i.reportedBy, i.resolvedAt ? 'Sí' : 'No']),
    },
  ];
  return buildXlsx(sheets);
}
