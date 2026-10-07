import { randomUUID } from 'node:crypto';
import type { DemoStatus, PersonRole } from '../../../shared/contracts.ts';
import { DEMO_ROOMS, DEMO_STUDENT_SCHEDULE, DEMO_TEACHER_SCHEDULE } from '../../../shared/campus.ts';
import { many, one, run, transaction } from '../db/index.ts';
import { addDays, dateKey } from '../lib/dates.ts';
import { hashPassword } from '../lib/passwords.ts';
import { notify } from './notifications.ts';
import { saveSchedule } from './schedule.ts';
import { createRoom } from './stations.ts';

/**
 * Modo de demostración para presentar el proyecto sin datos reales de la universidad.
 * Todo lo que crea lleva el prefijo "demo-" en su id y se borra con un clic, sin tocar
 * los usuarios ni los registros reales.
 */

export const DEMO_PASSWORD = 'Demo-2026';
export const DEMO_TEACHER_CODE = '990000001';
export const DEMO_STUDENT_CODE = '990000002';

const PEOPLE: Array<[string, PersonRole, string]> = [
  ['Ricardo Salas Ponce', 'docente', ''],
  ['Valeria Cruz Medina', 'alumno', 'Ingeniería en Informática'],
  ['Ana Lucía López', 'alumno', 'Ingeniería en Informática'],
  ['Luis Fernando Pérez', 'alumno', 'Ingeniería en Informática'],
  ['María José Gómez', 'alumno', 'Ingeniería en Informática'],
  ['Jorge Ruiz Ibarra', 'alumno', 'Ingeniería en Informática'],
  ['Sofía Díaz Orozco', 'alumno', 'Diseño de Artesanías'],
  ['Diego Torres Ávila', 'alumno', 'Ingeniería en Informática'],
  ['Fernanda Ríos Luna', 'alumno', 'Administración'],
  ['Andrés Silva Mora', 'alumno', 'Ingeniería en Informática'],
  ['Paola Herrera Gil', 'alumno', 'Diseño de Artesanías'],
  ['Carlos Méndez Rojas', 'alumno', 'Administración'],
  ['Daniela Navarro Paz', 'alumno', 'Ingeniería en Informática'],
  ['Emilio Castro Vega', 'alumno', 'Ingeniería en Informática'],
  ['Regina Flores Soto', 'alumno', 'Administración'],
  ['Mtra. Laura Ortega', 'docente', ''],
  ['Dr. Andrés Medina', 'docente', ''],
  ['Dra. Paula Ibarra', 'docente', ''],
  ['Héctor Ramírez Lara', 'personal', 'Coordinación de Servicios Académicos'],
  ['Claudia Morales Ruiz', 'personal', 'Control Escolar'],
];

/** Generador pseudoaleatorio con semilla: la demo se ve igual cada vez que se carga */
function seeded(seed: number) {
  return () => {
    seed = (seed * 16807) % 2147483647;
    return seed / 2147483647;
  };
}

export function demoStatus(): DemoStatus {
  const count = (table: string) => one<{ count: number }>(`SELECT COUNT(*) AS count FROM ${table} WHERE id LIKE 'demo-%'`)!.count;
  const people = count('people');
  return { active: people > 0, people, records: count('access_records'), rooms: count('rooms'), invitations: count('invitations') };
}

export function clearDemo() {
  transaction(() => {
    run("DELETE FROM emergency_marks WHERE record_id LIKE 'demo-%'");
    run("DELETE FROM alerts WHERE id LIKE 'demo-%' OR person_id LIKE 'demo-%'");
    run("DELETE FROM notifications WHERE id LIKE 'demo-%' OR person_id LIKE 'demo-%'");
    run("DELETE FROM station_incidents WHERE id LIKE 'demo-%' OR person_id LIKE 'demo-%'");
    run("DELETE FROM station_sessions WHERE id LIKE 'demo-%' OR person_id LIKE 'demo-%'");
    run("DELETE FROM invitations WHERE id LIKE 'demo-%' OR host_person_id LIKE 'demo-%'");
    run("DELETE FROM access_records WHERE id LIKE 'demo-%' OR person_id LIKE 'demo-%' OR guest_pass_id LIKE 'demo-%'");
    run("DELETE FROM guest_passes WHERE id LIKE 'demo-%'");
    run("DELETE FROM sessions WHERE subject_id LIKE 'demo-%'");
    run("DELETE FROM webauthn_credentials WHERE person_id LIKE 'demo-%'");
    run("DELETE FROM privacy_consents WHERE subject_id LIKE 'demo-%'");
    run("DELETE FROM schedules WHERE id LIKE 'demo-%' OR person_id LIKE 'demo-%'");
    run("DELETE FROM people WHERE id LIKE 'demo-%'");
    run("DELETE FROM rooms WHERE id LIKE 'demo-%'");
  });
}

export async function loadDemo(now = new Date()): Promise<DemoStatus> {
  clearDemo();
  const rand = seeded(20261006);
  const passwordHash = await hashPassword(DEMO_PASSWORD);
  const points = many<{ id: string; name: string; allowed_roles: string }>('SELECT id, name, allowed_roles FROM access_points WHERE active = 1');
  if (!points.length) throw new Error('Crea al menos un acceso antes de cargar la demostración.');
  const pointFor = (role: PersonRole) => {
    const allowed = points.filter(p => (JSON.parse(p.allowed_roles) as string[]).includes(role));
    return (allowed.length ? allowed : points)[Math.floor(rand() * (allowed.length || points.length))];
  };

  transaction(() => {
    // Personas
    PEOPLE.forEach(([name, role, program], i) => {
      const code = String(990000001 + i);
      const login = i === 0 || i === 1;
      run(
        'INSERT INTO people (id, code, full_name, email, role, program, credential_expires_at, password_hash) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
        `demo-p${i}`,
        code,
        name,
        `demo.${code}@${role === 'alumno' ? 'alumnos.' : ''}udg.mx`,
        role,
        program,
        i === 4 ? dateKey(addDays(now, 5)) : null,
        login ? passwordHash : 'sin-acceso',
      );
    });
  });

  // Horarios: los alumnos de Informática llevan el horario de 7.º; el docente, sus clases
  PEOPLE.forEach(([, role, program], i) => {
    if (role === 'alumno' && program === 'Ingeniería en Informática') saveSchedule(`demo-p${i}`, DEMO_STUDENT_SCHEDULE, 'demo-');
  });
  saveSchedule('demo-p0', DEMO_TEACHER_SCHEDULE.map(c => ({ ...c, teacher: 'Ricardo Salas Ponce' })), 'demo-');

  // Salones y laboratorios con equipos
  for (const room of DEMO_ROOMS) {
    if (!one('SELECT 1 FROM rooms WHERE name = ?', room.name)) createRoom({ ...room, hasDisplay: true }, 'demo-');
  }

  transaction(() => {
    // Registros de los últimos 14 días, en horario de clases
    for (let d = 13; d >= 0; d--) {
      const day = addDays(now, -d);
      const weekday = day.getDay();
      if (weekday === 0) continue;
      PEOPLE.forEach(([, role], i) => {
        if (rand() < (weekday === 6 ? 0.8 : 0.22)) return;
        const start = new Date(day);
        start.setHours(7 + Math.floor(rand() * 5), Math.floor(rand() * 60), 0, 0);
        if (start > now) return;
        const end = new Date(start.getTime() + (80 + rand() * 340) * 60000);
        const stillInside = d === 0 && (end > now || rand() < 0.35);
        const forgot = d > 0 && rand() < 0.04;
        const point = pointFor(role);
        run(
          `INSERT INTO access_records (id, person_id, access_point_id, check_in, check_out, source, biometric, status, incident)
           VALUES (?, ?, ?, ?, ?, ?, 1, ?, ?)`,
          `demo-r-${d}-${i}`,
          `demo-p${i}`,
          point.id,
          start.toISOString(),
          stillInside || forgot ? null : end.toISOString(),
          rand() < 0.93 ? 'app' : 'manual',
          forgot ? 'incidencia' : 'ok',
          forgot ? 'sin_salida' : null,
        );
      });
    }

    // Alertas de accesos denegados
    const alertTypes: Array<[string, string, string]> = [
      ['area_no_permitida', 'Acceso denegado por área no permitida', 'intentó ingresar por el Acceso vehicular, que no admite su rol.'],
      ['fuera_de_area', 'Intento de registro fuera del campus', 'intentó registrar acceso a 1,240 m del acceso principal.'],
      ['credencial_invalida', 'Intento de acceso con credencial no válida', 'intentó registrar su entrada con una credencial vencida.'],
      ['red_no_permitida', 'Intento de registro fuera de la red del campus', 'intentó registrar acceso desde datos móviles.'],
    ];
    for (let j = 0; j < 12; j++) {
      const [type, title, body] = alertTypes[j % alertTypes.length];
      const person = 1 + Math.floor(rand() * 14);
      run(
        'INSERT INTO alerts (id, type, title, body, person_id, created_at, read_at) VALUES (?, ?, ?, ?, ?, ?, ?)',
        `demo-a${j}`,
        type,
        title,
        `${PEOPLE[person][0]} ${body}`,
        `demo-p${person}`,
        (() => {
          const at = addDays(now, -Math.floor(rand() * 12));
          at.setHours(8 + Math.floor(rand() * 10), Math.floor(rand() * 60), 0, 0);
          return (at > now ? addDays(at, -1) : at).toISOString();
        })(),
        j > 3 ? now.toISOString() : null,
      );
    }

    // Uso de equipos: sesiones pasadas, sesiones activas e incidencias
    const lab1 = many<{ id: string; label: string }>(
      "SELECT s.id, s.label FROM stations s JOIN rooms r ON r.id = s.room_id WHERE r.name = 'Laboratorio de Cómputo 1' ORDER BY s.label",
    );
    if (lab1.length) {
      for (let k = 0; k < 40; k++) {
        const startedAt = new Date(now.getTime() - (1 + rand() * 13) * 86400000);
        startedAt.setHours(9 + Math.floor(rand() * 4), Math.floor(rand() * 60), 0, 0);
        run(
          "INSERT INTO station_sessions (id, station_id, person_id, started_at, ended_at, ended_by) VALUES (?, ?, ?, ?, ?, 'la persona')",
          `demo-ss${k}`,
          lab1[Math.floor(rand() * lab1.length)].id,
          `demo-p${1 + Math.floor(rand() * 13)}`,
          startedAt.toISOString(),
          new Date(startedAt.getTime() + (40 + rand() * 80) * 60000).toISOString(),
        );
      }
      const insideNow = many<{ person_id: string }>(
        "SELECT person_id FROM access_records WHERE id LIKE 'demo-r-0-%' AND check_out IS NULL AND person_id IN (SELECT id FROM people WHERE role = 'alumno')",
      );
      insideNow.slice(0, 7).forEach((row, k) => {
        run(
          "INSERT INTO station_sessions (id, station_id, person_id, started_at) VALUES (?, ?, ?, ?)",
          `demo-ssa${k}`,
          lab1[k * 2 + 1].id,
          row.person_id,
          new Date(now.getTime() - (10 + k * 7) * 60000).toISOString(),
        );
      });
      run(
        "INSERT INTO station_incidents (id, station_id, person_id, description, reported_by, created_at) VALUES ('demo-i1', ?, 'demo-p7', ?, 'Mtro. Ricardo Salas', ?)",
        lab1[4].id,
        'Dejaron la contraseña del laboratorio escrita en un papel pegado al monitor.',
        new Date(now.getTime() - 2 * 3600000).toISOString(),
      );
      run(
        "INSERT INTO station_incidents (id, station_id, person_id, description, reported_by, created_at, resolved_at) VALUES ('demo-i2', ?, 'demo-p9', ?, 'Encargado del laboratorio', ?, ?)",
        lab1[11].id,
        'Instalaron un juego en el equipo durante la clase.',
        new Date(now.getTime() - 3 * 86400000).toISOString(),
        new Date(now.getTime() - 2 * 86400000).toISOString(),
      );
    }

    // Invitaciones del docente de demostración: tres para hoy y una que ya se usó
    const guests: Array<[string, string, number]> = [
      ['Ing. Mariana Treviño', 'Plática sobre nearshoring para 7.º semestre', 0],
      ['Lic. Roberto Anaya', 'Revisión del proyecto integrador', 0],
      ['Dra. Isabel Fuentes', 'Jurado del Demo Day', 0],
      ['Ing. Tomás Lozano', 'Taller de Git y revisión de código', -1],
    ];
    const principal = points[0];
    guests.forEach(([name, reason, offset], k) => {
      const used = offset < 0;
      const passId = used ? `demo-g${k}` : null;
      if (passId) {
        const visit = addDays(now, offset);
        visit.setHours(10, 5, 0, 0);
        run(
          'INSERT INTO guest_passes (id, full_name, reason, host_name, access_point_id, valid_date, closed_at) VALUES (?, ?, ?, ?, ?, ?, ?)',
          passId,
          name,
          reason,
          'Ricardo Salas Ponce',
          principal.id,
          dateKey(visit),
          new Date(visit.getTime() + 2 * 3600000).toISOString(),
        );
        run(
          "INSERT INTO access_records (id, guest_pass_id, access_point_id, check_in, check_out, source) VALUES (?, ?, ?, ?, ?, 'manual')",
          `demo-rg${k}`,
          passId,
          principal.id,
          visit.toISOString(),
          new Date(visit.getTime() + 2 * 3600000).toISOString(),
        );
      }
      run(
        'INSERT INTO invitations (id, code, token, host_person_id, guest_name, guest_email, reason, visit_date, access_point_id, status, guest_pass_id, used_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
        `demo-inv${k}`,
        `DEMO${['K7QX', 'P4MW', 'T9RB', 'H3ZN'][k]}`,
        `demo-token-${k}-${randomUUID()}`,
        'demo-p0',
        name,
        '',
        reason,
        dateKey(addDays(now, offset)),
        principal.id,
        used ? 'usada' : 'pendiente',
        passId,
        used ? (() => { const at = addDays(now, offset); at.setHours(10, 5, 0, 0); return at.toISOString(); })() : null,
      );
    });
  });

  // Avisos de ejemplo para el docente y el alumno de demostración
  notify({ personId: 'demo-p0', kind: 'invitado_llego', title: 'Ing. Tomás Lozano ya llegó', body: 'Tu invitado entró por el acceso principal a las 10:05.', link: '/acceso/invitados', idPrefix: 'demo-' });
  notify({ personId: 'demo-p1', kind: 'general', title: 'Bienvenida a UniAccess', body: 'Activa los avisos para enterarte cuando tu credencial esté por vencer o si olvidas registrar tu salida.', link: '/acceso/avisos', idPrefix: 'demo-' });
  notify({ personId: 'demo-p4', kind: 'credencial_por_vencer', title: 'Tu credencial está por vencer', body: 'Vence en 5 días. Renuévala en Control Escolar.', link: '/acceso/perfil', idPrefix: 'demo-' });

  return demoStatus();
}
