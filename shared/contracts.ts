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
  /** Si ya aceptó la versión vigente del aviso de privacidad */
  privacyAccepted?: boolean;
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
  /** Si ya aceptó la versión vigente del aviso de privacidad */
  privacyAccepted?: boolean;
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

/* ---------- Horario ---------- */

export interface ClassSession {
  /** 1 = lunes … 7 = domingo */
  weekday: number;
  start: string;
  end: string;
  subject: string;
  room: string;
  teacher: string;
  group: string;
}

export interface ScheduleOverview {
  classes: ClassSession[];
  current: ClassSession | null;
  next: (ClassSession & { startsInMinutes: number }) | null;
  /** true si es el horario ficticio de demostración (sin datos de Control Escolar) */
  isDemo: boolean;
}

/* ---------- Avisos ---------- */

export type NotificationKind =
  | 'invitado_llego'
  | 'olvidaste_salida'
  | 'credencial_por_vencer'
  | 'dispositivo_vinculado'
  | 'equipo'
  | 'emergencia'
  | 'general';

export interface AppNotification {
  id: string;
  kind: NotificationKind;
  title: string;
  body: string;
  link: string | null;
  createdAt: string;
  readAt: string | null;
}

/* ---------- Invitaciones con QR ---------- */

export type InvitationStatus = 'pendiente' | 'usada' | 'cancelada' | 'vencida';

export interface Invitation {
  id: string;
  code: string;
  token: string;
  guestName: string;
  guestEmail: string;
  reason: string;
  visitDate: string;
  accessPointId: string | null;
  accessPointName: string;
  hostName: string;
  status: InvitationStatus;
  createdAt: string;
  usedAt: string | null;
}

export interface InvitationInput {
  guestName: string;
  guestEmail: string;
  reason: string;
  visitDate: string;
  accessPointId: string;
}

/** Lo que ve el invitado en la liga pública de su invitación */
export interface PublicInvitation {
  code: string;
  guestName: string;
  hostName: string;
  visitDate: string;
  accessPointName: string;
  status: InvitationStatus;
  checkUrl: string;
}

/* ---------- Laboratorios, salones y equipos ---------- */

export type RoomKind = 'laboratorio' | 'salon';

export interface Room {
  id: string;
  name: string;
  building: string;
  kind: RoomKind;
  hasDisplay: boolean;
  stations: number;
  occupied: number;
  openIncidents: number;
}

export interface RoomInput {
  name: string;
  building: string;
  kind: RoomKind;
  hasDisplay: boolean;
  stations: number;
}

export interface Station {
  id: string;
  roomId: string;
  roomName: string;
  label: string;
  code: string;
  inService: boolean;
  occupant: { sessionId: string; personId: string; name: string; code: string; since: string } | null;
  openIncidents: number;
}

export interface StationSession {
  id: string;
  stationId: string;
  stationLabel: string;
  roomName: string;
  personId: string;
  personName: string;
  personCode: string;
  startedAt: string;
  endedAt: string | null;
  minutes: number;
}

export interface StationIncident {
  id: string;
  stationId: string;
  stationLabel: string;
  roomName: string;
  personName: string | null;
  personCode: string | null;
  description: string;
  reportedBy: string;
  createdAt: string;
  resolvedAt: string | null;
}

export interface RoomDetail {
  room: Room;
  stations: Station[];
  recentSessions: StationSession[];
  incidents: StationIncident[];
}

/* ---------- Pantallas con PIN ---------- */

export interface DisplayPin {
  roomId: string;
  roomName: string;
  building: string;
  pin: string;
  validUntil: string;
  currentClass: { subject: string; teacher: string; group: string } | null;
}

/* ---------- Emergencias y simulacros ---------- */

export type EmergencyKind = 'simulacro' | 'emergencia';

export interface EmergencyPerson {
  recordId: string;
  name: string;
  code: string;
  role: PersonRole | 'invitado';
  accessPointName: string;
  checkIn: string;
  safe: boolean;
  markedAt: string | null;
}

export interface EmergencyState {
  event: { id: string; kind: EmergencyKind; startedAt: string; startedBy: string; endedAt: string | null } | null;
  people: EmergencyPerson[];
  total: number;
  safe: number;
}

/* ---------- Modo de demostración ---------- */

export interface DemoStatus {
  active: boolean;
  people: number;
  records: number;
  rooms: number;
  invitations: number;
}
