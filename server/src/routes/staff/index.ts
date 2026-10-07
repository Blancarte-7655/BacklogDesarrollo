import { Router } from 'express';
import type { AdminMeta } from '../../../../shared/contracts.ts';
import { config } from '../../config.ts';
import { many } from '../../db/index.ts';
import { smtpConfigured } from '../../lib/mailer.ts';
import { requireAdmin } from '../../middleware/auth.ts';
import { listAccessPoints } from '../../services/access.ts';
import { privacyAccepted } from '../../services/privacy.ts';
import { campusRouter } from './campus.ts';
import { operationsRouter } from './operations.ts';
import { peopleLookupRouter, peopleRouter } from './people.ts';
import { settingsRouter } from './settings.ts';

export const staffRouter = Router();

staffRouter.get('/session', (req, res) => {
  res.json({ ...req.staff, privacyAccepted: privacyAccepted('staff', req.staff!.id) });
});

staffRouter.get('/meta', (_req, res) => {
  const meta: AdminMeta = {
    programs: many<{ program: string }>("SELECT DISTINCT program FROM people WHERE program <> '' ORDER BY program COLLATE NOCASE").map(row => row.program),
    accessPoints: listAccessPoints(),
    smtpConfigured: smtpConfigured(),
    portalUrl: config.appOrigin,
  };
  res.json(meta);
});

// Vigilancia y administración
staffRouter.use('/people-lookup', peopleLookupRouter);
staffRouter.use(operationsRouter);
staffRouter.use(campusRouter);

// Solo administración
staffRouter.use('/people', requireAdmin, peopleRouter);
staffRouter.use(requireAdmin, settingsRouter);
