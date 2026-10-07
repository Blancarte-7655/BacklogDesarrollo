import type {
  AccessAnalytics,
  AccessPoint,
  AccessPointInput,
  AccessRecord,
  AdminDashboard,
  AdminMeta,
  Alert,
  DemoStatus,
  DisplayPin,
  EmergencyKind,
  EmergencyState,
  Invitation,
  Room,
  RoomDetail,
  RoomInput,
  Station,
  StationIncident,
  AlertSummary,
  GeneratedPassword,
  GuestPass,
  GuestPassInput,
  MailResult,
  NetworkSettings,
  ManualRecordInput,
  Person,
  PersonInput,
  PersonRole,
  SecurityDashboard,
  StaffInput,
  StaffListItem,
  StaffProfile,
} from '../../../shared/contracts';
import { api } from '../../api/http';

export interface RecordFilter {
  from?: string;
  to?: string;
  personId?: string;
  accessPointId?: string;
  role?: PersonRole;
  status?: 'all' | 'open' | 'incidencia' | 'ok';
}

export interface PersonOption {
  id: string;
  fullName: string;
  code: string;
  role: PersonRole;
  active: boolean;
}

const query = (params: object) => {
  const entries = Object.entries(params).filter(([, value]) => value !== undefined && value !== '');
  return entries.length ? `?${new URLSearchParams(entries as [string, string][])}` : '';
};

export const staffApi = {
  dashboard: () => api<SecurityDashboard>('/staff/dashboard'),
  analytics: (days: number) => api<AccessAnalytics>(`/staff/analytics?days=${days}`),
  network: () => api<NetworkSettings>('/staff/network'),
  saveNetwork: (body: { campusNetworks: string[]; staffNetworks: string[] }) => api<NetworkSettings>('/staff/network', { method: 'PUT', body }),
  stats: () => api<AdminDashboard>('/staff/stats'),
  meta: () => api<AdminMeta>('/staff/meta'),

  records: (filter: RecordFilter) => api<AccessRecord[]>(`/staff/records${query(filter)}`),
  manualRecord: (input: ManualRecordInput) => api<AccessRecord>('/staff/records', { body: input }),
  peopleLookup: () => api<PersonOption[]>('/staff/people-lookup'),

  alerts: (filter: 'all' | 'unread') => api<Alert[]>(`/staff/alerts${query({ filter })}`),
  alertSummary: () => api<AlertSummary>('/staff/alerts/summary'),
  reviewAlert: (id: string) => api<Alert>(`/staff/alerts/${id}/read`, { method: 'POST' }),
  reviewAllAlerts: () => api<null>('/staff/alerts/read-all', { method: 'POST' }),

  guestPasses: (date?: string) => api<GuestPass[]>(`/staff/guest-passes${query({ date })}`),
  issueGuestPass: (input: GuestPassInput) => api<GuestPass>('/staff/guest-passes', { body: input }),
  reenterGuest: (id: string) => api<GuestPass>(`/staff/guest-passes/${id}/reenter`, { method: 'POST' }),
  closeGuestPass: (id: string) => api<GuestPass>(`/staff/guest-passes/${id}/close`, { method: 'POST' }),

  people: () => api<Person[]>('/staff/people'),
  person: (id: string) => api<Person>(`/staff/people/${id}`),
  createPerson: (input: PersonInput) => api<{ person: Person } & GeneratedPassword>('/staff/people', { body: input }),
  updatePerson: (id: string, input: PersonInput) => api<Person>(`/staff/people/${id}`, { method: 'PUT', body: input }),
  setPersonActive: (id: string, active: boolean) => api<Person>(`/staff/people/${id}/status`, { method: 'PATCH', body: { active } }),
  resetPersonPassword: (id: string) => api<GeneratedPassword>(`/staff/people/${id}/password`, { method: 'POST' }),
  emailPerson: (id: string, subject: string, body: string) => api<MailResult>(`/staff/people/${id}/email`, { body: { subject, body } }),
  removePersonBiometrics: (id: string) => api<Person>(`/staff/people/${id}/biometrics`, { method: 'DELETE' }),

  createAccessPoint: (input: AccessPointInput) => api<AccessPoint>('/staff/access-points', { body: input }),
  updateAccessPoint: (id: string, input: AccessPointInput) => api<AccessPoint>(`/staff/access-points/${id}`, { method: 'PUT', body: input }),
  deleteAccessPoint: (id: string) => api<null>(`/staff/access-points/${id}`, { method: 'DELETE' }),

  operators: () => api<StaffListItem[]>('/staff/staff'),
  createOperator: (input: StaffInput) => api<{ staff: StaffProfile } & GeneratedPassword>('/staff/staff', { body: input }),
  updateOperator: (id: string, input: StaffInput) => api<StaffProfile>(`/staff/staff/${id}`, { method: 'PUT', body: input }),
  setOperatorActive: (id: string, active: boolean) => api<StaffProfile>(`/staff/staff/${id}/status`, { method: 'PATCH', body: { active } }),
  resetOperatorPassword: (id: string) => api<GeneratedPassword>(`/staff/staff/${id}/password`, { method: 'POST' }),
  emailOperator: (id: string, subject: string, body: string) => api<MailResult>(`/staff/staff/${id}/email`, { body: { subject, body } }),

  acceptPrivacy: () => api<null>('/staff/privacy/accept', { method: 'POST' }),

  invitations: (date?: string) => api<Invitation[]>(`/staff/invitations${query({ date })}`),
  invitation: (code: string) => api<Invitation>(`/staff/invitations/${encodeURIComponent(code)}`),
  admitInvitation: (code: string) => api<{ invitation: Invitation; pass: GuestPass }>(`/staff/invitations/${encodeURIComponent(code)}/admit`, { method: 'POST' }),

  rooms: () => api<Room[]>('/staff/rooms'),
  room: (id: string) => api<RoomDetail>(`/staff/rooms/${id}`),
  createRoom: (input: RoomInput) => api<Room>('/staff/rooms', { body: input }),
  deleteRoom: (id: string) => api<null>(`/staff/rooms/${id}`, { method: 'DELETE' }),
  setStationService: (id: string, inService: boolean) => api<Station>(`/staff/stations/${id}/service`, { body: { inService } }),
  reportStationIncident: (id: string, description: string) => api<StationIncident>(`/staff/stations/${id}/incidents`, { body: { description } }),
  resolveStationIncident: (id: string) => api<null>(`/staff/station-incidents/${id}/resolve`, { method: 'POST' }),
  endStationSession: (id: string) => api<null>(`/staff/station-sessions/${id}/end`, { method: 'POST' }),

  displays: () => api<DisplayPin[]>('/staff/displays'),

  emergency: () => api<EmergencyState>('/staff/emergency'),
  startEmergency: (kind: EmergencyKind) => api<EmergencyState>('/staff/emergency/start', { body: { kind } }),
  toggleSafe: (recordId: string) => api<EmergencyState>(`/staff/emergency/${recordId}/safe`, { method: 'POST' }),
  endEmergency: () => api<EmergencyState>('/staff/emergency/end', { method: 'POST' }),

  demo: () => api<DemoInfo>('/staff/demo'),
  loadDemo: () => api<DemoInfo>('/staff/demo/load', { method: 'POST' }),
  clearDemo: () => api<DemoInfo>('/staff/demo/clear', { method: 'POST' }),
};

export interface DemoInfo extends DemoStatus {
  password: string;
  teacherCode: string;
  studentCode: string;
}
