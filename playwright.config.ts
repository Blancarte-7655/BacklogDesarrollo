/**
 * Pruebas de aceptación de extremo a extremo (E2E) con Playwright.
 * Levantan la aplicación compilada con una base de datos temporal y recorren los flujos
 * de las historias de usuario en un navegador real. Ver docs/CASOS_DE_PRUEBA.md.
 */
import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { defineConfig, devices } from '@playwright/test';

import { ADMIN, BIO_PORT, PORT } from './e2e/env';

const server = (port: number, requireBiometric: boolean) => ({
  command: `npx tsx server/src/index.ts --production`,
  // Responde 401 sin sesión: para Playwright eso ya cuenta como servidor listo
  url: `http://localhost:${port}/api/staff/session`,
  reuseExistingServer: false,
  timeout: 60_000,
  env: {
    PORT: String(port),
    APP_ORIGIN: `http://localhost:${port}`,
    DATA_DIR: mkdtempSync(path.join(tmpdir(), 'uniaccess-e2e-')),
    REQUIRE_BIOMETRIC: String(requireBiometric),
    ENFORCE_GEOFENCE: 'true',
    SEED_ADMIN_EMAIL: ADMIN.email,
    SEED_ADMIN_PASSWORD: ADMIN.password,
    SEED_ADMIN_NAME: 'Administración de Pruebas',
    TZ: 'America/Mexico_City',
  },
});

export default defineConfig({
  testDir: './e2e',
  // Comparten una base de datos por servidor: se ejecutan en orden para que sean deterministas
  fullyParallel: false,
  workers: 1,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? [['list'], ['html', { open: 'never' }]] : [['list']],
  timeout: 30_000,
  use: {
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    locale: 'es-MX',
    timezoneId: 'America/Mexico_City',
    // Las animaciones (WebGL, partículas) respetan "reducir movimiento": así las pruebas no esperan por ellas
    reducedMotion: 'reduce',
  },
  expect: { timeout: 10_000 },
  projects: [
    {
      name: 'aceptacion',
      testIgnore: /biometria\.spec\.ts/,
      use: { ...devices['Desktop Chrome'], baseURL: `http://localhost:${PORT}` },
    },
    {
      name: 'biometria',
      testMatch: /biometria\.spec\.ts/,
      use: { ...devices['Desktop Chrome'], baseURL: `http://localhost:${BIO_PORT}` },
    },
  ],
  // La app se compila antes con `npm run build` (lo hace `npm run test:e2e`)
  webServer: [server(PORT, false), server(BIO_PORT, true)],
});
