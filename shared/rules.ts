import type { AlertType, GeoPoint, IncidentType, PersonRole, StaffRole } from './contracts.ts';

/** Correos de la UdeG y sus subdominios: @udg.mx, @alumnos.udg.mx, @academicos.udg.mx… */
export const INSTITUTIONAL_EMAIL_RE = /^[a-z0-9._%+-]+@([a-z0-9-]+\.)*udg\.mx$/i;
export const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
/** Matrícula de alumno o número de empleado */
export const CODE_RE = /^\d{6,10}$/;

export const PERSON_ROLES: PersonRole[] = ['alumno', 'docente', 'personal'];
export const STAFF_ROLES: StaffRole[] = ['admin', 'vigilancia'];

export const PERSON_ROLE_LABELS: Record<PersonRole, string> = {
  alumno: 'Alumno',
  docente: 'Docente',
  personal: 'Personal',
};

export const STAFF_ROLE_LABELS: Record<StaffRole, string> = {
  admin: 'Administrador',
  vigilancia: 'Vigilancia',
};

export const INCIDENT_LABELS: Record<IncidentType, string> = {
  salida_sin_entrada: 'Salida sin entrada registrada',
  sin_salida: 'Sin salida registrada',
};

export const ALERT_LABELS: Record<AlertType, string> = {
  credencial_invalida: 'Credencial no válida',
  area_no_permitida: 'Área no permitida',
  fuera_de_area: 'Fuera del campus',
  incidencia: 'Incidencia de registro',
  pase_vencido: 'Pase de invitado vencido',
};

export const DEFAULT_GEOFENCE_METERS = 300;

/**
 * Precisión máxima aceptada de la ubicación del teléfono. Con una lectura peor no se puede
 * saber si la persona está en el acceso, y aceptarla permitiría saltarse la geocerca
 * enviando una precisión enorme.
 */
export const MAX_GEO_ACCURACY_METERS = 100;

const pad = (n: number) => String(n).padStart(2, '0');

/** Fecha local YYYY-MM-DD */
export const dateKey = (date: Date) => `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;

/** Distancia en metros entre dos coordenadas (fórmula de Haversine) */
export function distanceMeters(a: GeoPoint | { lat: number; lng: number }, b: { lat: number; lng: number }): number {
  const R = 6371000;
  const toRad = (value: number) => (value * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const lat1 = toRad(a.lat);
  const lat2 = toRad(b.lat);
  const h = Math.sin(dLat / 2) ** 2 + Math.sin(dLng / 2) ** 2 * Math.cos(lat1) * Math.cos(lat2);
  return Math.round(2 * R * Math.asin(Math.sqrt(h)));
}

/** La credencial es válida si la persona está activa y su vigencia no pasó */
export function credentialValid(person: { active: boolean; credentialExpiresAt: string | null }, today = new Date()): boolean {
  if (!person.active) return false;
  if (!person.credentialExpiresAt) return true;
  return person.credentialExpiresAt >= dateKey(today);
}

export type GeofenceResult =
  | { ok: true; distance: number }
  | { ok: false; reason: 'imprecisa' | 'lejos'; distance: number };

/** Valida que la ubicación reportada esté dentro de la geocerca del acceso */
export function checkGeofence(geo: GeoPoint, point: { lat: number; lng: number; radiusMeters: number }): GeofenceResult {
  const distance = distanceMeters(geo, point);
  if (geo.accuracy > MAX_GEO_ACCURACY_METERS) return { ok: false, reason: 'imprecisa', distance };
  // El margen de error del GPS se suma al radio, pero nunca más de MAX_GEO_ACCURACY_METERS
  if (distance > point.radiusMeters + geo.accuracy) return { ok: false, reason: 'lejos', distance };
  return { ok: true, distance };
}
