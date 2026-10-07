import type { ClassSession } from './contracts.ts';

/** Versión vigente del aviso de privacidad: al cambiarla, todos deben aceptarlo de nuevo */
export const PRIVACY_VERSION = '2026-10';

export const WEEKDAY_LABELS = ['', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo'];

/** "07:30" → 450 */
export const timeToMinutes = (time: string) => {
  const [h, m] = time.split(':').map(Number);
  return h * 60 + m;
};

/** Día de la semana con lunes = 1 … domingo = 7 */
export const isoWeekday = (date: Date) => ((date.getDay() + 6) % 7) + 1;

/** Alfabeto de códigos cortos sin caracteres confusos (sin 0/O, 1/I/L) */
export const CODE_ALPHABET = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';

/**
 * Horario ficticio de 7.º semestre de Ingeniería en Informática. Se muestra cuando la persona
 * no tiene un horario cargado (mientras no haya conexión con Control Escolar).
 */
const STUDENT_WEEK: Array<[number, string, string, string, string, string]> = [
  [1, '07:00', '09:00', 'Seminario de Integración: Desarrollo', 'Aula B-201', 'Mtra. Laura Ortega'],
  [1, '09:00', '11:00', 'Ingeniería de Software II', 'Laboratorio de Cómputo 1', 'Mtro. Ricardo Salas'],
  [1, '11:00', '13:00', 'Redes de Computadoras', 'Aula B-104', 'Dr. Andrés Medina'],
  [2, '08:00', '10:00', 'Sistemas Distribuidos', 'Laboratorio de Cómputo 2', 'Dra. Paula Ibarra'],
  [2, '10:00', '12:00', 'Ética y Responsabilidad Profesional', 'Aula A-12', 'Mtra. Elena Ruiz'],
  [3, '07:00', '09:00', 'Seminario de Integración: Desarrollo', 'Aula B-201', 'Mtra. Laura Ortega'],
  [3, '09:00', '11:00', 'Ingeniería de Software II', 'Laboratorio de Cómputo 1', 'Mtro. Ricardo Salas'],
  [3, '11:00', '13:00', 'Redes de Computadoras', 'Aula B-104', 'Dr. Andrés Medina'],
  [4, '08:00', '10:00', 'Sistemas Distribuidos', 'Laboratorio de Cómputo 2', 'Dra. Paula Ibarra'],
  [4, '10:00', '12:00', 'Ética y Responsabilidad Profesional', 'Aula A-12', 'Mtra. Elena Ruiz'],
  [5, '09:00', '12:00', 'Taller de Proyecto Integrador', 'Laboratorio de Cómputo 1', 'Mtro. Ricardo Salas'],
  [5, '12:00', '14:00', 'Inglés Técnico', 'Aula A-12', 'Mtra. Claire Moreno'],
];

export const DEMO_STUDENT_SCHEDULE: ClassSession[] = STUDENT_WEEK.map(([weekday, start, end, subject, room, teacher]) => ({
  weekday,
  start,
  end,
  subject,
  room,
  teacher,
  group: '7A-INF',
}));

/** Horario ficticio de un docente: imparte Ingeniería de Software II y el Taller */
export const DEMO_TEACHER_SCHEDULE: ClassSession[] = DEMO_STUDENT_SCHEDULE.filter(c => c.teacher === 'Mtro. Ricardo Salas').map(c => ({
  ...c,
  teacher: 'Tú',
}));

/** Salones y laboratorios que usa el horario de demostración */
export const DEMO_ROOMS: Array<{ name: string; building: string; kind: 'laboratorio' | 'salon'; stations: number }> = [
  { name: 'Laboratorio de Cómputo 1', building: 'Edificio C', kind: 'laboratorio', stations: 20 },
  { name: 'Laboratorio de Cómputo 2', building: 'Edificio C', kind: 'laboratorio', stations: 16 },
  { name: 'Aula B-201', building: 'Edificio B', kind: 'salon', stations: 0 },
  { name: 'Aula B-104', building: 'Edificio B', kind: 'salon', stations: 0 },
  { name: 'Aula A-12', building: 'Edificio A', kind: 'salon', stations: 0 },
];
