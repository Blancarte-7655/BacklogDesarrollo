/**
 * Contrato de datos compartido entre el servidor (server/) y los portales (src/).
 * Cualquier cambio aquí se valida en ambos lados con TypeScript.
 */

/** Personas que registran acceso al campus */
export type PersonRole = 'alumno' | 'docente' | 'personal';
/** Operadores del sistema */
export type StaffRole = 'admin' | 'vigilancia';

export type AccessDirection = 'in' | 'out';
/** app = autoservicio desde el celular · manual = registrado por vigilancia */
export type AccessSource = 'app' | 'manual';
export type AccessStatus = 'ok' | 'incidencia';
export type IncidentType = 'salida_sin_entrada' | 'sin_salida';
export type AlertType = 'credencial_invalida' | 'area_no_permitida' | 'fuera_de_area' | 'red_no_permitida' | 'incidencia' | 'pase_vencido';
export type GuestPassStatus = 'activo' | 'cerrado' | 'expirado';

export interface GeoPoint {
  lat: number;
  lng: number;
  accuracy: number;
}

/* ---------- Accesos (puertas o áreas) ---------- */

export interface AccessPoint {
  id: string;
  name: string;
  description: string;
  /** Roles que pueden ingresar por este acceso */
  allowedRoles: PersonRole[];
  lat: number | null;
  lng: number | null;
  /** Radio de la geocerca; se ignora si no hay coordenadas */
  radiusMeters: number;
  active: boolean;
  createdAt: string;
}

export interface AccessPointInput {
  name: string;
  description: string;
  allowedRoles: PersonRole[];
  lat: number | null;
  lng: number | null;
  radiusMeters: number;
  active: boolean;
}

/* ---------- Personas ---------- */

export interface Person {
  id: string;
  code: string;
  fullName: string;
  email: string;
  role: PersonRole;
  /** Carrera, departamento o adscripción */
  program: string;
  /** Vigencia de la credencial (YYYY-MM-DD); null = sin vencimiento */
  credentialExpiresAt: string | null;
  active: boolean;
  createdAt: string;
  lastLoginAt: string | null;
  biometricDevices: number;
  inside: boolean;
  lastAccessAt: string | null;
  totalRecords: number;
}

export interface PersonInput {
  code: string;
  fullName: string;
  email: string;
  role: PersonRole;
  program: string;
  credentialExpiresAt: string | null;
}

export interface PersonSession {
  id: string;
  code: string;
  fullName: string;
  email: string;
  role: PersonRole;
}

/* ---------- Operadores ---------- */

export interface StaffProfile {
  id: string;
  email: string;
  fullName: string;
  area: string;
  role: StaffRole;
  active: boolean;
  createdAt: string;
  lastLoginAt: string | null;
}

export interface StaffListItem extends StaffProfile {
  guestPasses: number;
}

export interface StaffInput {
  email: string;
  fullName: string;
  area: string;
  role: StaffRole;
}

/* ---------- Registros de acceso ---------- */

export interface AccessRecord {
  id: string;
  personId: string | null;
  personName: string;
  personCode: string;
  personRole: PersonRole | null;
  guestPassId: string | null;
  accessPointId: string | null;
  accessPointName: string;
  checkIn: string | null;
  checkOut: string | null;
  /** Minutos dentro del campus (0 si sigue abierto) */
  minutes: number;
  status: AccessStatus;
  incident: IncidentType | null;
  source: AccessSource;
  biometric: boolean;
  geo: GeoPoint | null;
  notes: string;
  registeredByName: string | null;
}

export interface ManualRecordInput {
  personId: string;
  accessPointId: string;
  direction: AccessDirection;
  notes: string;
}

/* ---------- Pases de invitado ---------- */

export interface GuestPass {
  id: string;
  fullName: string;
  /** Identificación presentada (INE, credencial de otra institución…) */
  document: string;
  reason: string;
  hostName: string;
  accessPointId: string | null;
  accessPointName: string;
  issuedByName: string | null;
  /** Día en que es válido (YYYY-MM-DD) */
  validDate: string;
  status: GuestPassStatus;
  createdAt: string;
  closedAt: string | null;
  /** Hora de entrada si sigue dentro */
  insideSince: string | null;
  minutesInside: number;
}

export interface GuestPassInput {
  fullName: string;
  document: string;
  reason: string;
  hostName: string;
  accessPointId: string;
}

/* ---------- Registro desde el celular ---------- */

export interface CheckPayload {
  direction: AccessDirection;
  accessPointId: string;
  geo: GeoPoint | null;
  /** Respuesta WebAuthn (AuthenticationResponseJSON) */
  biometric: Record<string, unknown> | null;
}

export interface CheckResult {
  direction: AccessDirection;
  record: AccessRecord;
  message: string;
  /** true cuando la salida se registró sin una entrada previa */
  incident: boolean;
}

export interface PersonOverview {
  profile: Person;
  inside: boolean;
  openRecord: AccessRecord | null;
  accessPoints: AccessPoint[];
  recent: AccessRecord[];
  credentialValid: boolean;
}

export interface BiometricCredential {
  id: string;
  label: string;
  createdAt: string;
  lastUsedAt: string | null;
}

/* ---------- Vigilancia ---------- */

export interface PresenceItem {
  recordId: string;
  kind: 'persona' | 'invitado';
  personId: string | null;
  name: string;
  code: string;
  role: PersonRole | 'invitado';
  program: string;
  accessPointName: string;
  checkIn: string;
  minutesInside: number;
}

export interface AccessEvent {
  id: string;
  type: AccessDirection;
  at: string;
  name: string;
  role: PersonRole | 'invitado';
  accessPointName: string;
  status: AccessStatus;
}

export interface SecurityDashboard {
  inside: PresenceItem[];
  insideByRole: Array<{ role: PersonRole | 'invitado'; count: number }>;
  todayEntries: number;
  todayExits: number;
  openIncidents: number;
  unreadAlerts: number;
  activeGuestPasses: number;
  recent: AccessEvent[];
}

/** Afluencia para las gráficas del tablero */
export interface AccessAnalytics {
  days: number;
  /** Entradas y salidas de hoy por hora (0 a 23) */
  hourly: Array<{ hour: number; entries: number; exits: number }>;
  /** Entradas y salidas por día, del más antiguo al más reciente */
  daily: Array<{ date: string; entries: number; exits: number }>;
  byRole: Array<{ role: PersonRole | 'invitado'; entries: number }>;
  byAccessPoint: Array<{ name: string; entries: number }>;
  denied: Array<{ type: AlertType; count: number }>;
  /** Permanencia promedio en minutos de los ciclos cerrados del periodo */
  averageMinutes: number;
  /** Hora con más entradas en el periodo, o null si no hay registros */
  peakHour: number | null;
  totalEntries: number;
}

/** Redes desde las que se aceptan registros y el portal institucional */
export interface NetworkSettings {
  /** Rangos (CIDR) de la red del campus para registrar entrada y salida. Vacío: cualquier red */
  campusNetworks: string[];
  /** Rangos (CIDR) desde los que abre el portal institucional. Vacío: cualquier red */
  staffNetworks: string[];
  /** IP con la que el servidor ve esta solicitud */
  yourIp: string;
}

/* ---------- Administración ---------- */

export interface AdminDashboard {
  people: number;
  activePeople: number;
  expiringCredentials: number;
  insideNow: number;
  todayEntries: number;
  todayIncidents: number;
  accessPoints: number;
  guestPassesToday: number;
  unreadAlerts: number;
  peopleByRole: Array<{ role: PersonRole; count: number }>;
}

export interface Alert {
  id: string;
  type: AlertType;
  title: string;
  body: string;
  personId: string | null;
  personName: string | null;
  accessPointName: string | null;
  readAt: string | null;
  reviewedByName: string | null;
  createdAt: string;
}

export interface AlertSummary {
  unread: number;
  openIncidents: number;
}

export interface AdminMeta {
  programs: string[];
  accessPoints: AccessPoint[];
  smtpConfigured: boolean;
  portalUrl: string;
}

/* ---------- Varios ---------- */

export interface GeneratedPassword {
  password: string;
}

export interface MailResult {
  delivered: boolean;
  mode: 'smtp' | 'outbox';
}
