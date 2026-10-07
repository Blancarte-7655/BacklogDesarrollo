import { createHmac, randomBytes, timingSafeEqual } from 'node:crypto';
import type { DisplayPin } from '../../../shared/contracts.ts';
import { timeToMinutes } from '../../../shared/campus.ts';
import { one, run } from '../db/index.ts';
import { notFound } from '../lib/http.ts';
import { currentClassInRoom, scheduleFor } from './schedule.ts';
import { getRoom, listRooms } from './stations.ts';

/**
 * PIN de las pantallas de los salones. Cambia en cada clase (o cada hora si no hay clase) y
 * solo lo ven el docente que da la clase en ese salón y el personal de vigilancia.
 * Para que funcione de verdad, la pantalla o el transmisor del salón debe pedir este PIN
 * (lo configura el área de sistemas); UniAccess genera y reparte el PIN.
 */

function secret(): string {
  const row = one<{ value: string }>("SELECT value FROM settings WHERE key = 'displayPinSecret'");
  if (row) return JSON.parse(row.value) as string;
  const value = randomBytes(32).toString('hex');
  run("INSERT OR IGNORE INTO settings (key, value) VALUES ('displayPinSecret', ?)", JSON.stringify(value));
  return value;
}

/** Inicio y fin del bloque actual: la clase en curso o la hora en punto */
function currentBlock(roomName: string, now: Date) {
  const lesson = currentClassInRoom(roomName, now);
  const start = new Date(now);
  const end = new Date(now);
  if (lesson) {
    const s = timeToMinutes(lesson.start);
    const e = timeToMinutes(lesson.end);
    start.setHours(Math.floor(s / 60), s % 60, 0, 0);
    end.setHours(Math.floor(e / 60), e % 60, 0, 0);
  } else {
    start.setMinutes(0, 0, 0);
    end.setTime(start.getTime() + 60 * 60 * 1000);
  }
  return { lesson, start, end };
}

export function pinFor(roomId: string, blockStart: Date): string {
  const digest = createHmac('sha256', secret()).update(`${roomId}|${blockStart.toISOString()}`).digest();
  return String(digest.readUInt32BE(0) % 1_000_000).padStart(6, '0');
}

function displayPin(room: { id: string; name: string; building: string }, now: Date): DisplayPin {
  const { lesson, start, end } = currentBlock(room.name, now);
  return {
    roomId: room.id,
    roomName: room.name,
    building: room.building,
    pin: pinFor(room.id, start),
    validUntil: end.toISOString(),
    currentClass: lesson ? { subject: lesson.subject, teacher: lesson.teacher, group: lesson.group } : null,
  };
}

/** Todos los salones con pantalla (vigilancia y administración) */
export const allDisplayPins = (now = new Date()): DisplayPin[] => listRooms().filter(r => r.hasDisplay).map(r => displayPin(r, now));

/** Solo los salones donde el docente da clase en este momento */
export function teacherDisplayPins(personId: string, now = new Date()): DisplayPin[] {
  const { classes } = scheduleFor(personId, 'docente');
  const today = ((now.getDay() + 6) % 7) + 1;
  const minute = now.getHours() * 60 + now.getMinutes();
  const rooms = new Set(
    classes.filter(c => c.weekday === today && timeToMinutes(c.start) - 10 <= minute && minute < timeToMinutes(c.end)).map(c => c.room),
  );
  return listRooms()
    .filter(r => r.hasDisplay && rooms.has(r.name))
    .map(r => displayPin(r, now));
}

/** Lo que muestra la pantalla del salón antes de conectarse (sin revelar el PIN) */
export function displayInfo(roomId: string, now = new Date()) {
  const room = getRoom(roomId);
  if (!room.hasDisplay) throw notFound('Este salón no tiene pantalla registrada.');
  const { lesson, end } = currentBlock(room.name, now);
  return {
    roomName: room.name,
    building: room.building,
    validUntil: end.toISOString(),
    currentClass: lesson ? { subject: lesson.subject, teacher: lesson.teacher, group: lesson.group } : null,
  };
}

/** Simula lo que haría la pantalla: compara el PIN escrito con el del bloque actual */
export function verifyDisplayPin(roomId: string, pin: string, now = new Date()): boolean {
  const room = getRoom(roomId);
  const { start } = currentBlock(room.name, now);
  const expected = Buffer.from(pinFor(room.id, start));
  const given = Buffer.from(pin.padEnd(6, ' ').slice(0, 6));
  return timingSafeEqual(expected, given);
}
