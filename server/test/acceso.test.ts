/**
 * Pruebas de integración de las reglas de entrada y salida (historias 1, 2, 3 y 7).
 * Usan una base SQLite temporal, así que no tocan los datos de desarrollo.
 */
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { after, describe, test } from 'node:test';

// La configuración se lee al importar los módulos del servidor: hay que definirla antes
const dataDir = mkdtempSync(path.join(tmpdir(), 'uniaccess-test-'));
process.env.DATA_DIR = dataDir;
process.env.REQUIRE_BIOMETRIC = 'false';
process.env.ENFORCE_GEOFENCE = 'true';

const { db, one, run } = await import('../src/db/index.ts');
const { closeStaleRecords, registerAccess, registerManualAccess } = await import('../src/services/access.ts');
type PersonRow = import('../src/services/people.ts').PersonRow;

after(() => {
  db.close();
  rmSync(dataDir, { recursive: true, force: true });
});

/* ---------- Datos de prueba ---------- */

const CAMPUS = { lat: 20.6, lng: -103.3 };
const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

function createPerson(overrides: Partial<PersonRow> = {}): PersonRow {
  const id = randomUUID();
  const code = String(Math.floor(100000000 + Math.random() * 899999999));
  run(
    'INSERT INTO people (id, code, full_name, email, role, credential_expires_at, password_hash, active) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
    id,
    code,
    overrides.full_name ?? 'Persona de Prueba',
    `${code}@alumnos.udg.mx`,
    overrides.role ?? 'alumno',
    overrides.credential_expires_at ?? null,
    'sin-contraseña',
    overrides.active ?? 1,
  );
  return one<PersonRow>('SELECT * FROM people WHERE id = ?', id)!;
}

function createAccessPoint(options: { roles?: string[]; geofence?: boolean; active?: boolean } = {}): string {
  const id = randomUUID();
  run(
    'INSERT INTO access_points (id, name, allowed_roles, lat, lng, radius_meters, active) VALUES (?, ?, ?, ?, ?, ?, ?)',
    id,
    `Acceso ${id.slice(0, 8)}`,
    JSON.stringify(options.roles ?? ['alumno', 'docente', 'personal']),
    options.geofence ? CAMPUS.lat : null,
    options.geofence ? CAMPUS.lng : null,
    100,
    options.active === false ? 0 : 1,
  );
  return id;
}

function createGuard(): string {
  const id = randomUUID();
  run(
    "INSERT INTO staff (id, email, full_name, role, password_hash) VALUES (?, ?, 'Vigilante de Prueba', 'vigilancia', 'sin-contraseña')",
    id,
    `vigilancia.${id.slice(0, 8)}@udg.mx`,
  );
  return id;
}

const alertsOf = (personId: string, type: string) =>
  one<{ count: number }>('SELECT COUNT(*) AS count FROM alerts WHERE person_id = ? AND type = ?', personId, type)!.count;

/** Comprueba que la promesa falle con el código HTTP esperado */
const rejectsWith = (promise: Promise<unknown>, status: number) =>
  assert.rejects(promise, (error: { status?: number }) => error.status === status);

const access = (person: PersonRow, accessPointId: string, direction: 'in' | 'out', geo: { lat: number; lng: number; accuracy: number } | null = null) =>
  registerAccess(person, { direction, accessPointId, geo, biometric: null });

/* ---------- Historias 1 y 2: entrada y salida ---------- */

describe('Entrada y salida desde el celular', () => {
  test('una entrada válida deja a la persona dentro del campus', async () => {
    const person = createPerson();
    const point = createAccessPoint();
    const result = await access(person, point, 'in');
    assert.equal(result.direction, 'in');
    assert.equal(result.incident, false);
    assert.ok(result.record.checkIn);
    assert.equal(result.record.checkOut, null);
  });

  test('no permite registrar dos entradas seguidas', async () => {
    const person = createPerson();
    const point = createAccessPoint();
    await access(person, point, 'in');
    await rejectsWith(access(person, point, 'in'), 409);
  });

  test('la salida cierra la entrada abierta', async () => {
    const person = createPerson();
    const point = createAccessPoint();
    const entry = await access(person, point, 'in');
    await sleep(5);
    const exit = await access(person, point, 'out');
    assert.equal(exit.record.id, entry.record.id);
    assert.ok(exit.record.checkOut);
    assert.equal(exit.incident, false);
  });

  test('una segunda salida el mismo día se avisa y no se duplica', async () => {
    const person = createPerson();
    const point = createAccessPoint();
    await access(person, point, 'in');
    await sleep(5);
    await access(person, point, 'out');
    await rejectsWith(access(person, point, 'out'), 409);
    const { count } = one<{ count: number }>('SELECT COUNT(*) AS count FROM access_records WHERE person_id = ?', person.id)!;
    assert.equal(count, 1);
  });

  test('una salida sin entrada se registra como incidencia y alerta a vigilancia', async () => {
    const person = createPerson();
    const point = createAccessPoint();
    const result = await access(person, point, 'out');
    assert.equal(result.incident, true);
    assert.equal(result.record.incident, 'salida_sin_entrada');
    assert.equal(alertsOf(person.id, 'incidencia'), 1);
  });
});

/* ---------- Credencial, rol y geocerca ---------- */

describe('Accesos denegados', () => {
  test('una credencial vencida se rechaza y genera alerta', async () => {
    const person = createPerson({ credential_expires_at: '2020-01-01' });
    await rejectsWith(access(person, createAccessPoint(), 'in'), 403);
    assert.equal(alertsOf(person.id, 'credencial_invalida'), 1);
  });

  test('una persona dada de baja no puede registrar acceso', async () => {
    const person = createPerson({ active: 0 });
    await rejectsWith(access(person, createAccessPoint(), 'in'), 403);
  });

  test('un rol no permitido en el acceso se rechaza y genera alerta (historia 3)', async () => {
    const person = createPerson({ role: 'alumno' });
    const point = createAccessPoint({ roles: ['personal'] });
    await rejectsWith(access(person, point, 'in'), 403);
    assert.equal(alertsOf(person.id, 'area_no_permitida'), 1);
  });

  test('un acceso fuera de servicio no admite registros', async () => {
    await rejectsWith(access(createPerson(), createAccessPoint({ active: false }), 'in'), 400);
  });

  test('con geocerca, se exige la ubicación', async () => {
    await rejectsWith(access(createPerson(), createAccessPoint({ geofence: true }), 'in', null), 400);
  });

  test('dentro de la geocerca, el registro procede', async () => {
    const result = await access(createPerson(), createAccessPoint({ geofence: true }), 'in', { ...CAMPUS, accuracy: 10 });
    assert.equal(result.direction, 'in');
  });

  test('una ubicación demasiado imprecisa no puede saltarse la geocerca', async () => {
    const person = createPerson();
    const farButImprecise = { lat: CAMPUS.lat + 0.5, lng: CAMPUS.lng, accuracy: 100000 };
    await rejectsWith(access(person, createAccessPoint({ geofence: true }), 'in', farButImprecise), 400);
  });

  test('lejos del acceso se rechaza y genera alerta', async () => {
    const person = createPerson();
    const farAway = { lat: CAMPUS.lat + 0.05, lng: CAMPUS.lng, accuracy: 10 }; // ~5.5 km
    await rejectsWith(access(person, createAccessPoint({ geofence: true }), 'in', farAway), 403);
    assert.equal(alertsOf(person.id, 'fuera_de_area'), 1);
  });
});

/* ---------- Respaldo e incidencias ---------- */

describe('Registro manual de vigilancia', () => {
  test('vigilancia puede registrar la entrada de una persona', () => {
    const record = registerManualAccess(
      { personId: createPerson().id, accessPointId: createAccessPoint(), direction: 'in', notes: 'Teléfono sin batería' },
      createGuard(),
    );
    assert.equal(record.source, 'manual');
  });

  test('no se puede cerrar manualmente una salida sin entrada abierta', () => {
    assert.throws(
      () => registerManualAccess({ personId: createPerson().id, accessPointId: createAccessPoint(), direction: 'out', notes: 'Prueba' }, createGuard()),
      (error: { status?: number }) => error.status === 409,
    );
  });
});

describe('Entradas que se quedan abiertas', () => {
  test('después de 18 horas se marcan como incidencia sin salida', () => {
    const person = createPerson();
    const id = randomUUID();
    const twentyHoursAgo = new Date(Date.now() - 20 * 60 * 60 * 1000).toISOString();
    run("INSERT INTO access_records (id, person_id, access_point_id, check_in, source) VALUES (?, ?, ?, ?, 'app')", id, person.id, createAccessPoint(), twentyHoursAgo);

    closeStaleRecords();

    const row = one<{ status: string; incident: string }>('SELECT status, incident FROM access_records WHERE id = ?', id)!;
    assert.equal(row.status, 'incidencia');
    assert.equal(row.incident, 'sin_salida');
    assert.equal(alertsOf(person.id, 'incidencia'), 1);
  });
});

/* ---------- Biometría ---------- */

describe('Dispositivos biométricos', () => {
  test('una persona con un dispositivo vinculado no puede vincular otro', async () => {
    const { registrationOptions } = await import('../src/services/webauthn.ts');
    const person = createPerson();
    run(
      'INSERT INTO webauthn_credentials (id, person_id, public_key, transports, label) VALUES (?, ?, ?, ?, ?)',
      randomUUID(),
      person.id,
      new Uint8Array([1, 2, 3]),
      '[]',
      'Teléfono de la persona',
    );
    await rejectsWith(registrationOptions(person), 409);
  });
});
