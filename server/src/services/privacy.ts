import { PRIVACY_VERSION } from '../../../shared/campus.ts';
import { one, run } from '../db/index.ts';
import type { SubjectType } from '../lib/sessions.ts';

export const privacyAccepted = (type: SubjectType, id: string) =>
  !!one('SELECT 1 AS ok FROM privacy_consents WHERE subject_type = ? AND subject_id = ? AND version = ?', type, id, PRIVACY_VERSION);

export function acceptPrivacy(type: SubjectType, id: string) {
  run('INSERT OR IGNORE INTO privacy_consents (subject_type, subject_id, version) VALUES (?, ?, ?)', type, id, PRIVACY_VERSION);
}
