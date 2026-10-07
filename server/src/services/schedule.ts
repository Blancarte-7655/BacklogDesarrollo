import { randomUUID } from 'node:crypto';
import type { ClassSession, PersonRole, ScheduleOverview } from '../../../shared/contracts.ts';
import { DEMO_STUDENT_SCHEDULE, DEMO_TEACHER_SCHEDULE, isoWeekday, timeToMinutes } from '../../../shared/campus.ts';
import { many, run } from '../db/index.ts';

interface ScheduleRow {
  weekday: number;
  start_time: string;
  end_time: string;
  subject: string;
  room: string;
  teacher: string;
  group_code: string;
}

const toClass = (row: ScheduleRow): ClassSession => ({
  weekday: row.weekday,
  start: row.start_time,
  end: row.end_time,
  subject: row.subject,
  room: row.room,
  teacher: row.teacher,
  group: row.group_code,
});

const sortClasses = (classes: ClassSession[]) =>
  [...classes].sort((a, b) => a.weekday - b.weekday || timeToMinutes(a.start) - timeToMinutes(b.start));

/** Horario de la persona; si no tiene uno cargado, el de demostración según su rol */
export function scheduleFor(personId: string, role: PersonRole): { classes: ClassSession[]; isDemo: boolean } {
  const rows = many<ScheduleRow>('SELECT * FROM schedules WHERE person_id = ?', personId);
  if (rows.length) return { classes: sortClasses(rows.map(toClass)), isDemo: false };
  if (role === 'personal') return { classes: [], isDemo: true };
  return { classes: role === 'docente' ? DEMO_TEACHER_SCHEDULE : DEMO_STUDENT_SCHEDULE, isDemo: true };
}

/** Clase en curso y la siguiente (hoy o en los próximos días) */
export function scheduleOverview(personId: string, role: PersonRole, now = new Date()): ScheduleOverview {
  const { classes, isDemo } = scheduleFor(personId, role);
  const today = isoWeekday(now);
  const minute = now.getHours() * 60 + now.getMinutes();
  const current = classes.find(c => c.weekday === today && timeToMinutes(c.start) <= minute && minute < timeToMinutes(c.end)) ?? null;

  let next: ScheduleOverview['next'] = null;
  for (let offset = 0; offset < 7 && !next; offset++) {
    const day = ((today - 1 + offset) % 7) + 1;
    const candidate = classes
      .filter(c => c.weekday === day && (offset > 0 || timeToMinutes(c.start) > minute))
      .sort((a, b) => timeToMinutes(a.start) - timeToMinutes(b.start))[0];
    if (candidate) next = { ...candidate, startsInMinutes: offset * 1440 + timeToMinutes(candidate.start) - minute };
  }
  return { classes, current, next, isDemo };
}

/** Clase que se imparte ahora en un salón, buscando en los horarios cargados y en el de demostración */
export function currentClassInRoom(roomName: string, now = new Date()): ClassSession | null {
  const today = isoWeekday(now);
  const minute = now.getHours() * 60 + now.getMinutes();
  const inRange = (c: ClassSession) => c.weekday === today && timeToMinutes(c.start) <= minute && minute < timeToMinutes(c.end);
  const stored = many<ScheduleRow>('SELECT * FROM schedules WHERE room = ? AND weekday = ?', roomName, today).map(toClass).find(inRange);
  return stored ?? DEMO_STUDENT_SCHEDULE.filter(c => c.room === roomName).find(inRange) ?? null;
}

/** Guarda un horario completo (usado por el modo de demostración) */
export function saveSchedule(personId: string, classes: ClassSession[], idPrefix = '') {
  run('DELETE FROM schedules WHERE person_id = ?', personId);
  for (const c of classes) {
    run(
      'INSERT INTO schedules (id, person_id, weekday, start_time, end_time, subject, room, teacher, group_code) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
      `${idPrefix}${randomUUID()}`,
      personId,
      c.weekday,
      c.start,
      c.end,
      c.subject,
      c.room,
      c.teacher,
      c.group,
    );
  }
}
