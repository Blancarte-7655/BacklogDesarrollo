import { Router } from 'express';
import { z } from 'zod';
import { parse } from '../lib/http.ts';
import { hitRateLimit, MINUTE } from '../lib/rateLimit.ts';
import { displayInfo, verifyDisplayPin } from '../services/displays.ts';
import { publicInvitation } from '../services/invitations.ts';

/** Rutas sin sesión: la liga del invitado y la pantalla del salón */
export const publicRouter = Router();

// Liga que recibe el invitado (el token es largo y aleatorio)
publicRouter.get('/invitations/:token', (req, res) => {
  res.json(publicInvitation(req.params.token));
});

// Simulador de la pantalla del salón: pide el PIN que solo ve el docente de la clase
publicRouter.get('/displays/:roomId', (req, res) => {
  res.json(displayInfo(req.params.roomId));
});

publicRouter.post('/displays/:roomId/connect', (req, res) => {
  const { pin } = parse(z.object({ pin: z.string().regex(/^\d{6}$/, 'El PIN tiene 6 dígitos.') }), req.body);
  // Con 6 dígitos y 5 intentos cada 5 minutos, adivinar el PIN dentro de una clase es prácticamente imposible
  hitRateLimit(`display:${req.ip}:${req.params.roomId}`, 5, 5 * MINUTE);
  const ok = verifyDisplayPin(req.params.roomId, pin);
  res.json({ ok, message: ok ? 'Pantalla conectada.' : 'PIN incorrecto. Pídele el PIN al docente de la clase.' });
});
