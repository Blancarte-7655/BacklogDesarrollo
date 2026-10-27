import { expect, type APIRequestContext, type Browser, type BrowserContextOptions, type Locator, type Page } from '@playwright/test';
import { ADMIN } from './env';

/** Ubicación de prueba: dentro de la geocerca de los accesos que se crean con coordenadas */
export const CAMPUS = { latitude: 20.5605, longitude: -103.2905 };

let counter = 0;
/** Matrícula única de 9 dígitos para cada persona de prueba */
export const uniqueCode = () => String(300000000 + ((Date.now() % 1_000_000) * 100) + (counter++ % 100)).slice(0, 9);

export interface TestPerson {
  id: string;
  code: string;
  fullName: string;
  email: string;
  password: string;
}

/** Inicia sesión como administrador en la API (para preparar datos de prueba) */
export async function adminApi(request: APIRequestContext) {
  const res = await request.post('/api/auth/staff/login', { data: ADMIN });
  expect(res.ok(), 'el administrador de pruebas debe poder iniciar sesión').toBeTruthy();
  return request;
}

/** Da de alta a una persona por la API y devuelve su contraseña generada */
export async function createPerson(
  request: APIRequestContext,
  overrides: Partial<{ role: string; fullName: string; credentialExpiresAt: string | null }> = {},
): Promise<TestPerson> {
  await adminApi(request);
  const code = uniqueCode();
  const fullName = overrides.fullName ?? `Prueba ${code}`;
  const email = `p${code}@alumnos.udg.mx`;
  const res = await request.post('/api/staff/people', {
    data: { code, fullName, email, role: overrides.role ?? 'alumno', program: 'Informática', credentialExpiresAt: overrides.credentialExpiresAt ?? null },
  });
  expect(res.status(), await res.text()).toBe(201);
  const body = await res.json();
  return { id: body.person.id, code, fullName, email, password: body.password };
}

/** Crea un acceso; con `geofence` queda ligado a las coordenadas de CAMPUS con radio de 100 m */
export async function createAccessPoint(request: APIRequestContext, options: { name: string; roles?: string[]; geofence?: boolean }) {
  await adminApi(request);
  const res = await request.post('/api/staff/access-points', {
    data: {
      name: options.name,
      description: 'Creado por las pruebas E2E',
      allowedRoles: options.roles ?? ['alumno', 'docente', 'personal'],
      lat: options.geofence ? CAMPUS.latitude : null,
      lng: options.geofence ? CAMPUS.longitude : null,
      radiusMeters: 100,
      active: true,
    },
  });
  expect(res.ok(), await res.text()).toBeTruthy();
  return (await res.json()) as { id: string; name: string };
}

/** Contexto de navegador "de celular" con la ubicación indicada (por defecto, dentro del campus) */
export async function phoneContext(browser: Browser, baseURL: string, geo = CAMPUS, extra: BrowserContextOptions = {}) {
  return browser.newContext({
    baseURL,
    viewport: { width: 412, height: 915 },
    geolocation: { ...geo, accuracy: 10 },
    permissions: ['geolocation'],
    locale: 'es-MX',
    timezoneId: 'America/Mexico_City',
    reducedMotion: 'reduce',
    ...extra,
  });
}

/** Inicio de sesión en el portal de acceso (celular) */
export async function loginPerson(page: Page, person: Pick<TestPerson, 'code' | 'password'>, options: { expectSuccess?: boolean } = {}) {
  await page.goto('/acceso');
  await page.getByLabel(/Matrícula, código/).fill(person.code);
  await page.getByLabel('Contraseña', { exact: true }).fill(person.password);
  await page.locator('button[type=submit]').click();
  if (options.expectSuccess !== false) await expect(page.getByText('Mis últimos accesos')).toBeVisible();
}

/** Página de escritorio para el portal institucional */
export async function staffPage(browser: Browser, baseURL: string) {
  const context = await browser.newContext({ baseURL, viewport: { width: 1366, height: 900 }, locale: 'es-MX', timezoneId: 'America/Mexico_City', reducedMotion: 'reduce' });
  return context.newPage();
}

/** Inicio de sesión en el portal institucional */
export async function loginStaff(page: Page) {
  await page.goto('/control');
  await page.getByLabel('Correo institucional').fill(ADMIN.email);
  await page.getByLabel('Contraseña', { exact: true }).fill(ADMIN.password);
  await page.getByRole('button', { name: 'Ingresar al portal' }).click();
  await expect(page.getByRole('link', { name: 'Personas' })).toBeVisible();
}

/** Sección "Dentro del campus" del tablero en vivo */
export const insideSection = (page: Page) =>
  page.locator('section').filter({ has: page.getByRole('heading', { name: 'Dentro del campus' }) });

/** Registra entrada o salida desde el portal de acceso eligiendo el acceso indicado */
export async function registerFromPhone(page: Page, direction: 'entrada' | 'salida', accessName = 'Acceso principal') {
  if (direction === 'entrada') await page.getByRole('group', { name: 'Acceso' }).getByRole('button', { name: new RegExp(accessName) }).click();
  await page.getByRole('button', { name: `Registrar ${direction}`, exact: true }).click();
  const dialog = page.getByRole('dialog');
  await dialog.getByRole('button', { name: `Confirmar ${direction}` }).click();
  return dialog;
}

/** Comprueba el mensaje de éxito del registro y cierra el diálogo */
export async function expectRegistered(dialog: Locator, direction: 'Entrada' | 'Salida') {
  await expect(dialog.getByText(`${direction} registrada`, { exact: true })).toBeVisible();
  // El aviso flotante puede tapar el botón en pantallas pequeñas: se dispara el clic directamente
  await dialog.getByRole('button', { name: 'Listo' }).dispatchEvent('click');
  await expect(dialog).toHaveCount(0);
}
