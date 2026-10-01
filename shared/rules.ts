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
 * Dispositivos biométricos por persona. Con uno solo, nadie puede vincular su propia huella
 * a la cuenta de otra persona para registrarle el acceso. Para cambiar de teléfono,
 * la administración desvincula el anterior.
 */
export const MAX_BIOMETRIC_DEVICES = 1;

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
