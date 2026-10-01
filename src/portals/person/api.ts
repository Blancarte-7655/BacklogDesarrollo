import type { startAuthentication, startRegistration } from '@simplewebauthn/browser';
import type { AccessRecord, BiometricCredential, CheckPayload, CheckResult, PersonOverview } from '../../../shared/contracts';
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
};
