import { config } from './config.ts';

import { existsSync } from 'node:fs';
import path from 'node:path';
import express from 'express';
import { z } from 'zod';
import { nowIso, run } from './db/index.ts';
import { seedInitialData } from './db/seed.ts';
import { errorHandler, requireJsonBody } from './lib/http.ts';
import { requirePerson, requireStaff } from './middleware/auth.ts';
import { authRouter } from './routes/auth.ts';
import { personRouter } from './routes/person.ts';
import { publicRouter } from './routes/public.ts';
import { staffRouter } from './routes/staff/index.ts';
import { closeStaleRecords } from './services/access.ts';
import { generateScheduledNotifications } from './services/notifications.ts';
import { closeStaleSessions } from './services/stations.ts';

z.config(z.locales.es());

const app = express();
app.disable('x-powered-by');
app.set('trust proxy', 'loopback');

app.use((_req, res, next) => {
  res.set({
    'X-Content-Type-Options': 'nosniff',
    'X-Frame-Options': 'DENY',
    'Referrer-Policy': 'same-origin',
    'Permissions-Policy': 'geolocation=(self), publickey-credentials-get=(self), publickey-credentials-create=(self), camera=(self)',
  });
  next();
});

app.use('/api', express.json({ limit: '1mb' }), requireJsonBody);
app.use('/api/auth', authRouter);
app.use('/api/public', publicRouter);
app.use('/api/person', requirePerson, personRouter);
app.use('/api/staff', requireStaff, staffRouter);
app.use('/api', (_req, res) => {
  res.status(404).json({ error: 'Recurso no encontrado.' });
});

// En producción el mismo servidor entrega los portales ya compilados
if (config.production && existsSync(config.distDir)) {
  app.use(express.static(config.distDir, { index: false }));
  app.use((req, res, next) => {
    if (req.method !== 'GET') return next();
    res.sendFile(path.join(config.distDir, 'index.html'));
  });
}

app.use(errorHandler);

function housekeeping() {
  try {
    closeStaleRecords();
    closeStaleSessions();
    generateScheduledNotifications();
    run('DELETE FROM sessions WHERE expires_at < ?', nowIso());
  } catch (error) {
    console.error('Error en tareas programadas:', error);
  }
}

await seedInitialData();
housekeeping();
setInterval(housekeeping, 10 * 60 * 1000);

const server = app.listen(config.port, () => {
  console.log(`✔  API de UniAccess escuchando en http://localhost:${config.port}`);
  if (!config.production) console.log(`   Portales en ${config.appOrigin}`);
});

server.on('error', (error: NodeJS.ErrnoException) => {
  if (error.code === 'EADDRINUSE') {
    console.error(`✖  El puerto ${config.port} ya está en uso por otro programa. Cambia API_PORT en .env (y el proxy en vite.config.ts).`);
    process.exit(1);
  }
  throw error;
});
