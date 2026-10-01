import {
  generateAuthenticationOptions,
  generateRegistrationOptions,
  verifyAuthenticationResponse,
  verifyRegistrationResponse,
  type AuthenticationResponseJSON,
  type RegistrationResponseJSON,
} from '@simplewebauthn/server';
import type { BiometricCredential } from '../../../shared/contracts.ts';
import { MAX_BIOMETRIC_DEVICES } from '../../../shared/rules.ts';
import { config } from '../config.ts';
import { many, nowIso, one, run } from '../db/index.ts';
import { badRequest, conflict } from '../lib/http.ts';
import type { PersonRow } from './people.ts';

type AuthenticatorTransportFuture = NonNullable<Parameters<typeof verifyAuthenticationResponse>[0]['credential']['transports']>[number];

const CHALLENGE_TTL = 5 * 60 * 1000;
const challenges = new Map<string, { challenge: string; expiresAt: number }>();

function consumeChallenge(key: string): string {
  const entry = challenges.get(key);
  challenges.delete(key);
  if (!entry || entry.expiresAt < Date.now()) throw badRequest('La verificación biométrica expiró. Inténtalo de nuevo.');
  return entry.challenge;
}

interface CredentialRow {
  id: string;
  person_id: string;
  public_key: Uint8Array;
  counter: number;
  transports: string;
  label: string;
  created_at: string;
  last_used_at: string | null;
}

const transportsOf = (row: Pick<CredentialRow, 'transports'>) => JSON.parse(row.transports) as AuthenticatorTransportFuture[];

export function listCredentials(personId: string): BiometricCredential[] {
  return many<CredentialRow>('SELECT * FROM webauthn_credentials WHERE person_id = ? ORDER BY created_at', personId).map(row => ({
    id: row.id,
    label: row.label,
    createdAt: row.created_at,
    lastUsedAt: row.last_used_at,
  }));
}

const deviceCount = (personId: string) =>
  one<{ count: number }>('SELECT COUNT(*) AS count FROM webauthn_credentials WHERE person_id = ?', personId)!.count;

/** Solo se permite vincular un dispositivo; el cambio de teléfono lo autoriza la administración */
function assertCanAddDevice(personId: string) {
  if (deviceCount(personId) >= MAX_BIOMETRIC_DEVICES) {
    throw conflict('Ya tienes un dispositivo vinculado. Si cambiaste de teléfono, acude a la Coordinación de Seguridad y Accesos para que desvinculen el anterior.');
  }
}

export async function registrationOptions(person: PersonRow) {
  assertCanAddDevice(person.id);
  const existing = many<Pick<CredentialRow, 'id' | 'transports'>>('SELECT id, transports FROM webauthn_credentials WHERE person_id = ?', person.id);
  const options = await generateRegistrationOptions({
    rpName: 'UniAccess CUTlaquepaque',
    rpID: config.rpID,
    userName: person.email,
    userDisplayName: person.full_name,
    userID: new TextEncoder().encode(person.id),
    attestationType: 'none',
    excludeCredentials: existing.map(row => ({ id: row.id, transports: transportsOf(row) })),
    authenticatorSelection: { residentKey: 'preferred', userVerification: 'required', authenticatorAttachment: 'platform' },
  });
  challenges.set(`register:${person.id}`, { challenge: options.challenge, expiresAt: Date.now() + CHALLENGE_TTL });
  return options;
}

export async function completeRegistration(personId: string, response: RegistrationResponseJSON, label: string) {
  assertCanAddDevice(personId);
  const verification = await verifyRegistrationResponse({
    response,
    expectedChallenge: consumeChallenge(`register:${personId}`),
    expectedOrigin: config.allowedOrigins,
    expectedRPID: config.rpID,
    requireUserVerification: true,
  }).catch(() => ({ verified: false, registrationInfo: undefined }));

  if (!verification.verified || !verification.registrationInfo) {
    throw badRequest('No se pudo verificar la biometría de este dispositivo.');
  }
  const { credential } = verification.registrationInfo;
  // Se vuelve a validar por si se vinculó otro dispositivo mientras se verificaba este
  assertCanAddDevice(personId);
  run(
    'INSERT INTO webauthn_credentials (id, person_id, public_key, counter, transports, label) VALUES (?, ?, ?, ?, ?, ?)',
    credential.id,
    personId,
    credential.publicKey,
    credential.counter,
    JSON.stringify(credential.transports ?? []),
    label || 'Dispositivo',
  );
}

export async function authenticationOptions(personId: string) {
  const credentials = many<Pick<CredentialRow, 'id' | 'transports'>>('SELECT id, transports FROM webauthn_credentials WHERE person_id = ?', personId);
  if (!credentials.length) throw badRequest('No tienes biometría vinculada en este momento.');
  const options = await generateAuthenticationOptions({
    rpID: config.rpID,
    allowCredentials: credentials.map(row => ({ id: row.id, transports: transportsOf(row) })),
    userVerification: 'required',
  });
  challenges.set(`auth:${personId}`, { challenge: options.challenge, expiresAt: Date.now() + CHALLENGE_TTL });
  return options;
}

/** Confirma la identidad con la huella o el rostro del dispositivo */
export async function verifyBiometric(personId: string, response: AuthenticationResponseJSON) {
  const expectedChallenge = consumeChallenge(`auth:${personId}`);
  const row = one<CredentialRow>('SELECT * FROM webauthn_credentials WHERE id = ? AND person_id = ?', response.id, personId);
  if (!row) throw badRequest('Este dispositivo no está vinculado a tu cuenta.');

  const verification = await verifyAuthenticationResponse({
    response,
    expectedChallenge,
    expectedOrigin: config.allowedOrigins,
    expectedRPID: config.rpID,
    credential: { id: row.id, publicKey: new Uint8Array(row.public_key), counter: row.counter, transports: transportsOf(row) },
    requireUserVerification: true,
  }).catch(() => null);

  if (!verification?.verified) throw badRequest('La verificación biométrica no fue válida.');
  run('UPDATE webauthn_credentials SET counter = ?, last_used_at = ? WHERE id = ?', verification.authenticationInfo.newCounter, nowIso(), row.id);
}
