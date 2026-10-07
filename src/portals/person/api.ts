import type { startAuthentication, startRegistration } from '@simplewebauthn/browser';
import type {
  AccessRecord,
  AppNotification,
  BiometricCredential,
  CheckPayload,
  CheckResult,
  DisplayPin,
  Invitation,
  InvitationInput,
  PersonOverview,
  ScheduleOverview,
  Station,
  StationIncident,
  StationSession,
} from '../../../shared/contracts';
import { api } from '../../api/http';

type RegistrationOptions = Parameters<typeof startRegistration>[0]['optionsJSON'];
type AuthenticationOptions = Parameters<typeof startAuthentication>[0]['optionsJSON'];

export const personApi = {
  overview: () => api<PersonOverview>('/person/overview'),
  records: () => api<AccessRecord[]>('/person/records'),
  access: (payload: CheckPayload) => api<CheckResult>('/person/access', { body: payload }),

  biometrics: () => api<BiometricCredential[]>('/person/biometrics'),
  registrationOptions: () => api<RegistrationOptions>('/person/biometrics/register-options', { method: 'POST' }),
  registerBiometric: (response: unknown, label: string) => api<BiometricCredential[]>('/person/biometrics', { body: { response, label } }),
  authenticationOptions: () => api<AuthenticationOptions>('/person/biometrics/auth-options', { method: 'POST' }),

  acceptPrivacy: () => api<null>('/person/privacy/accept', { method: 'POST' }),
  schedule: () => api<ScheduleOverview>('/person/schedule'),

  notifications: () => api<AppNotification[]>('/person/notifications'),
  unreadNotifications: () => api<{ count: number }>('/person/notifications/unread'),
  markNotificationsRead: (id?: string) => api<null>('/person/notifications/read', { body: { id } }),

  invitations: () => api<Invitation[]>('/person/invitations'),
  createInvitation: (input: InvitationInput) => api<Invitation>('/person/invitations', { body: input }),
  cancelInvitation: (id: string) => api<Invitation>(`/person/invitations/${id}/cancel`, { method: 'POST' }),

  displays: () => api<DisplayPin[]>('/person/displays'),

  stationStatus: () => api<{ session: StationSession | null; history: StationSession[] }>('/person/stations/current'),
  station: (code: string) => api<Station>(`/person/stations/${encodeURIComponent(code)}`),
  startStation: (code: string, biometric: Record<string, unknown> | null) =>
    api<StationSession>(`/person/stations/${encodeURIComponent(code)}/start`, { body: { biometric } }),
  endStation: () => api<StationSession | null>('/person/stations/end', { method: 'POST' }),
  reportStation: (code: string, description: string) => api<StationIncident>(`/person/stations/${encodeURIComponent(code)}/report`, { body: { description } }),
};
