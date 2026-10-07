/**
 * Pruebas de las funciones de campus: horario, invitaciones con QR, avisos, uso de equipos,
 * PIN de pantallas, lista de emergencia, reporte de Excel y modo de demostración.
 */
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { after, describe, test } from 'node:test';

const dataDir = mkdtempSync(path.join(tmpdir(), 'uniaccess-campus-'));
process.env.DATA_DIR = dataDir;
process.env.REQUIRE_BIOMETRIC = 'false';

const { db, one, run } = await import('../src/db/index.ts');
const { registerAccess } = await import('../src/services/access.ts');
const { scheduleOverview } = await import('../src/services/schedule.ts');
const { admitInvitation, createInvitation, publicInvitation } = await import('../src/services/invitations.ts');
const { generateScheduledNotifications, listNotifications } = await import('../src/services/notifications.ts');
const stations = await import('../src/services/stations.ts');
const { pinFor, allDisplayPins } = await import('../src/services/displays.ts');
const emergency = await import('../src/services/emergency.ts');
const { accessReport } = await import('../src/services/reports.ts');
const demo = await import('../src/services/demo.ts');
const { encodeQr } = await import('../../shared/qr.ts');
const { dateKey, addDays } = await import('../src/lib/dates.ts');
type PersonRow = import('../src/services/people.ts').PersonRow;

after(() => {
  db.close();
  rmSync(dataDir, { recursive: true, force: true });
});

/* ---------- Datos de prueba ---------- */

let seq = 0;
function createPerson(role: 'alumno' | 'docente' | 'personal' = 'alumno', expires: string | null = null): PersonRow {
  const id = randomUUID();
  const code = String(100000000 + ++seq);
  run(
    'INSERT INTO people (id, code, full_name, email, role, credential_expires_at, password_hash) VALUES (?, ?, ?, ?, ?, ?, ?)',
    id,
    code,
    `Persona ${seq}`,
    `${code}@alumnos.udg.mx`,
    role,
    expires,
    'x',
  );
  return one<PersonRow>('SELECT * FROM people WHERE id = ?', id)!;
}

function createPoint(): string {
  const id = randomUUID();
  run('INSERT INTO access_points (id, name, allowed_roles) VALUES (?, ?, ?)', id, `Acceso ${id.slice(0, 6)}`, '["alumno","docente","personal"]');
  return id;
}

function createGuard(): string {
  const id = randomUUID();
  run("INSERT INTO staff (id, email, full_name, role, password_hash) VALUES (?, ?, 'Vigilante', 'vigilancia', 'x')", id, `v.${id.slice(0, 6)}@udg.mx`);
  return id;
}

const enter = (person: PersonRow, point: string) => registerAccess(person, { direction: 'in', accessPointId: point, geo: null, biometric: null });
const leave = (person: PersonRow, point: string) => registerAccess(person, { direction: 'out', accessPointId: point, geo: null, biometric: null });
const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));
const status = (code: number) => (error: { status?: number }) => error.status === code;

/* ---------- Código QR ---------- */

describe('Código QR', () => {
  test('un texto corto genera un QR versión 1 (21 × 21) con sus patrones de esquina', () => {
    const matrix = encodeQr('HOLA');
    assert.equal(matrix.length, 21);
    // Patrón de búsqueda: anillo oscuro, anillo claro y centro oscuro 3 × 3
    assert.equal(matrix[0][0], true);
    assert.equal(matrix[1][1], false);
    assert.equal(matrix[3][3], true);
    assert.equal(matrix[0][20], true);
    assert.equal(matrix[20][0], true);
  });

  test('una liga de invitación cabe y el tamaño crece con el texto', () => {
    const short = encodeQr('https://uniaccess.local/control/invitaciones/K7QX2M9P');
    const long = encodeQr('x'.repeat(300));
    assert.ok(short.length < long.length);
    assert.equal((short.length - 17) % 4, 0);
  });
});

/* ---------- Horario ---------- */

describe('Mi horario', () => {
  test('sin horario cargado, un alumno ve el horario ficticio con la clase en curso y la siguiente', () => {
    const alumno = createPerson('alumno');
    const monday10am = new Date(2026, 9, 5, 10, 0); // lunes 5 de octubre de 2026, 10:00
    const overview = scheduleOverview(alumno.id, 'alumno', monday10am);
    assert.equal(overview.isDemo, true);
    assert.equal(overview.current?.subject, 'Ingeniería de Software II');
    assert.equal(overview.next?.subject, 'Redes de Computadoras');
    assert.equal(overview.next?.startsInMinutes, 60);
  });

  test('el viernes por la noche, la siguiente clase es el lunes', () => {
    const overview = scheduleOverview(createPerson('alumno').id, 'alumno', new Date(2026, 9, 9, 21, 0));
    assert.equal(overview.current, null);
    assert.equal(overview.next?.weekday, 1);
  });
});

/* ---------- Invitaciones ---------- */

describe('Invitaciones con QR', () => {
  test('vigilancia admite la invitación: se emite el pase, se registra la entrada y se avisa al anfitrión', async () => {
    const host = createPerson('docente');
    const point = createPoint();
    const invitation = await createInvitation(host, {
      guestName: 'Ing. Mariana Treviño',
      guestEmail: '',
      reason: 'Plática de nearshoring',
      visitDate: dateKey(new Date()),
      accessPointId: point,
    });
    assert.equal(invitation.code.length, 8);
    assert.equal(publicInvitation(invitation.token).guestName, 'Ing. Mariana Treviño');

    const result = admitInvitation(invitation.code, createGuard());
    assert.equal(result.invitation.status, 'usada');
    assert.ok(one('SELECT 1 FROM access_records WHERE guest_pass_id = ? AND check_out IS NULL', result.pass.id));
    assert.equal(listNotifications(host.id)[0].kind, 'invitado_llego');

    assert.throws(() => admitInvitation(invitation.code, createGuard()), status(409));
  });

  test('una invitación para mañana todavía no se puede usar', async () => {
    const invitation = await createInvitation(createPerson('docente'), {
      guestName: 'Visitante de Mañana',
      guestEmail: '',
      reason: 'Reunión',
      visitDate: dateKey(addDays(new Date(), 1)),
      accessPointId: createPoint(),
    });
    assert.throws(() => admitInvitation(invitation.code, createGuard()), status(409));
  });

  test('no se pueden crear invitaciones con fecha pasada', async () => {
    await assert.rejects(
      createInvitation(createPerson('docente'), { guestName: 'Visitante', guestEmail: '', reason: 'Visita', visitDate: '2020-01-01', accessPointId: createPoint() }),
      status(400),
    );
  });
});

/* ---------- Equipos del laboratorio ---------- */

describe('Uso de equipos del laboratorio', () => {
  const lab = stations.createRoom({ name: 'Laboratorio de Prueba', building: 'C', kind: 'laboratorio', hasDisplay: true, stations: 3 });
  const pcs = () => stations.roomDetail(lab.id).stations;

  test('el laboratorio se crea con sus equipos y un código por equipo', () => {
    assert.equal(lab.stations, 3);
    assert.deepEqual(
      pcs().map(s => s.label),
      ['PC-01', 'PC-02', 'PC-03'],
    );
    assert.equal(new Set(pcs().map(s => s.code)).size, 3);
  });

  test('para usar un equipo primero hay que registrar la entrada al campus', () => {
    assert.throws(() => stations.startSession(createPerson(), pcs()[0].code), status(403));
  });

  test('queda registrado quién usa cada equipo y nadie más puede tomarlo', async () => {
    const point = createPoint();
    const ana = createPerson();
    const luis = createPerson();
    await enter(ana, point);
    await enter(luis, point);
    const session = stations.startSession(ana, pcs()[1].code);
    assert.equal(session.stationLabel, 'PC-02');
    assert.equal(pcs()[1].occupant?.personId, ana.id);
    assert.throws(() => stations.startSession(luis, pcs()[1].code), status(409));
  });

  test('al salir del campus se termina el uso del equipo', async () => {
    const point = createPoint();
    const person = createPerson();
    await enter(person, point);
    stations.startSession(person, pcs()[2].code);
    await sleep(5);
    await leave(person, point);
    assert.equal(stations.activeSession(person.id), null);
  });

  test('una incidencia se liga a quien usaba el equipo', async () => {
    const point = createPoint();
    const person = createPerson();
    await enter(person, point);
    stations.startSession(person, pcs()[0].code);
    const incident = stations.reportIncident(pcs()[0].id, 'Dejaron una contraseña pegada en el monitor', 'Encargado');
    assert.equal(incident.personName, person.full_name);
  });

  test('un equipo fuera de servicio no se puede usar', async () => {
    const point = createPoint();
    const person = createPerson();
    await enter(person, point);
    stations.setStationService(pcs()[0].id, false);
    assert.throws(() => stations.startSession(person, pcs()[0].code), status(409));
    stations.setStationService(pcs()[0].id, true);
  });
});

/* ---------- Pantallas con PIN ---------- */

describe('PIN de pantallas', () => {
  test('el PIN tiene 6 dígitos, se mantiene en el mismo bloque y cambia en el siguiente', () => {
    const block = new Date(2026, 9, 5, 9, 0);
    const pin = pinFor('salon-1', block);
    assert.match(pin, /^\d{6}$/);
    assert.equal(pinFor('salon-1', block), pin);
    assert.notEqual(pinFor('salon-1', new Date(2026, 9, 5, 11, 0)), pin);
    assert.notEqual(pinFor('salon-2', block), pin);
  });

  test('cada salón con pantalla tiene un PIN vigente', () => {
    const pins = allDisplayPins();
    assert.ok(pins.length >= 1);
    for (const pin of pins) assert.ok(new Date(pin.validUntil) > new Date());
  });
});

/* ---------- Emergencia ---------- */

describe('Lista de emergencia', () => {
  test('al iniciar un simulacro se avisa a quien está dentro y vigilancia marca a cada persona a salvo', async () => {
    const point = createPoint();
    const person = createPerson();
    await enter(person, point);
    const state = emergency.startEmergency('simulacro', 'Vigilante');
    const mine = state.people.find(p => p.code === person.code)!;
    assert.equal(mine.safe, false);
    assert.equal(listNotifications(person.id)[0].kind, 'emergencia');

    const marked = emergency.toggleSafe(mine.recordId, 'Vigilante');
    assert.equal(marked.people.find(p => p.recordId === mine.recordId)?.safe, true);
    assert.equal(marked.safe, 1);
    assert.throws(() => emergency.startEmergency('emergencia', 'Otro'), status(409));
    assert.equal(emergency.endEmergency().event, null);
  });
});

/* ---------- Avisos automáticos ---------- */

describe('Avisos automáticos', () => {
  test('una credencial que vence en menos de 7 días genera un aviso una sola vez', () => {
    const person = createPerson('alumno', dateKey(addDays(new Date(), 3)));
    generateScheduledNotifications();
    generateScheduledNotifications();
    assert.equal(listNotifications(person.id).filter(n => n.kind === 'credencial_por_vencer').length, 1);
  });
});

/* ---------- Reporte de Excel y modo de demostración ---------- */

describe('Reporte de Excel y demostración', () => {
  test('la demostración carga datos de ejemplo y se borra sin tocar los datos reales', async () => {
    const real = createPerson();
    const status1 = await demo.loadDemo();
    assert.equal(status1.active, true);
    assert.ok(status1.records > 20);
    assert.ok(status1.rooms >= 2);

    const today = dateKey(new Date());
    const file = accessReport(dateKey(addDays(new Date(), -13)), today);
    assert.equal(file.subarray(0, 2).toString(), 'PK');
    const names = file.toString('latin1');
    for (const part of ['xl/workbook.xml', 'xl/worksheets/sheet1.xml', 'xl/worksheets/sheet10.xml']) assert.ok(names.includes(part), part);

    demo.clearDemo();
    assert.equal(demo.demoStatus().active, false);
    assert.ok(one('SELECT 1 FROM people WHERE id = ?', real.id));
  });
});

describe('Simulador de pantalla', () => {
  test('la pantalla acepta el PIN vigente y rechaza otro', async () => {
    const { verifyDisplayPin } = await import('../src/services/displays.ts');
    const room = stations.createRoom({ name: 'Aula Pantalla', building: 'B', kind: 'salon', hasDisplay: true, stations: 0 });
    const pin = allDisplayPins().find(p => p.roomId === room.id)!.pin;
    assert.equal(verifyDisplayPin(room.id, pin), true);
    assert.equal(verifyDisplayPin(room.id, pin === '000000' ? '111111' : '000000'), false);
  });
});
