/**
 * Pruebas de aceptación de accesibilidad y de la restricción por red del campus.
 * Casos CP-17, CP-18, CP-20 y CP-21 de docs/CASOS_DE_PRUEBA.md.
 *
 * La API confía en la cabecera X-Forwarded-For cuando la solicitud llega desde el propio equipo
 * (`trust proxy: loopback`), así que con ella simulamos un celular en datos móviles o una
 * computadora fuera de la red de vigilancia.
 */
import { expect, test } from '@playwright/test';
import { adminApi, createPerson, loginPerson, loginStaff, phoneContext, registerFromPhone, staffPage } from './helpers';

const CAMPUS_NETWORK = '10.0.0.0/8';
const MOBILE_DATA_IP = '203.0.113.50'; // rango reservado para documentación (TEST-NET-3)
const OUTSIDE_OFFICE_IP = '198.51.100.7'; // TEST-NET-2

test.describe('Red del campus', () => {
  test.afterEach(async ({ request }) => {
    // Deja las listas vacías para no afectar a las demás pruebas
    await adminApi(request);
    await request.put('/api/staff/network', { data: { campusNetworks: [], staffNetworks: [] } });
  });

  test('CP-17 · con la red del campus configurada, un registro desde datos móviles se rechaza y alerta', async ({ browser, request, baseURL }) => {
    await adminApi(request);
    const saved = await request.put('/api/staff/network', { data: { campusNetworks: [CAMPUS_NETWORK], staffNetworks: [] } });
    expect(saved.ok(), await saved.text()).toBeTruthy();

    const person = await createPerson(request, { fullName: 'Carla Datos Móviles' });
    const phone = await phoneContext(browser, baseURL!, undefined, { extraHTTPHeaders: { 'X-Forwarded-For': MOBILE_DATA_IP } });
    const page = await phone.newPage();
    await loginPerson(page, person);
    await registerFromPhone(page, 'entrada');
    await expect(page.getByText('Conéctate a la red WiFi del campus para registrar tu acceso.').first()).toBeVisible();
    await phone.close();

    const staff = await staffPage(browser, baseURL!);
    await loginStaff(staff);
    await staff.locator('a[href="/control/alertas"]').first().click();
    await expect(staff.getByText(person.fullName).first()).toBeVisible();
  });

  test('CP-18 · no se puede guardar una lista del portal que deje fuera a quien la guarda', async ({ browser, baseURL }) => {
    const context = await browser.newContext({ baseURL, reducedMotion: 'reduce', extraHTTPHeaders: { 'X-Forwarded-For': OUTSIDE_OFFICE_IP } });
    const page = await context.newPage();
    await loginStaff(page);
    await page.locator('a[href="/control/redes"]').first().click();
    await expect(page.getByText(OUTSIDE_OFFICE_IP).first()).toBeVisible();

    const portal = page.locator('section').filter({ has: page.getByRole('heading', { name: 'Portal institucional' }) });
    await portal.getByLabel('Agregar IP o rango').fill('10.20.0.0/16');
    await portal.getByRole('button', { name: 'Agregar', exact: true }).click();
    await page.getByRole('button', { name: 'Guardar redes' }).click();
    await expect(page.getByText(`Esa lista dejaría fuera tu propia conexión (${OUTSIDE_OFFICE_IP})`).first()).toBeVisible();

    // La lista guardada sigue vacía
    const settings = await (await page.request.get('/api/staff/network')).json();
    expect(settings.staffNetworks).toEqual([]);
    await context.close();
  });
});

test.describe('Accesibilidad', () => {
  test('CP-20 · el panel de Lectura cambia tema y tamaño sin recargar y la preferencia se conserva', async ({ browser, baseURL }) => {
    const context = await browser.newContext({ baseURL, reducedMotion: 'reduce' });
    const page = await context.newPage();
    await page.goto('/acceso');
    const html = page.locator('html');

    await page.getByRole('button', { name: /^Lectura/ }).click();
    await page.getByRole('group', { name: 'Tema' }).getByText('Oscuro').click();
    await page.getByRole('group', { name: 'Tamaño de texto' }).getByText('Muy grande').click();
    await expect(html).toHaveAttribute('data-theme', 'dark');
    await expect(html).toHaveAttribute('data-text', 'xl');

    // Se conserva al volver (otra página del sitio, misma persona)
    await page.goto('/control');
    await expect(html).toHaveAttribute('data-theme', 'dark');
    await expect(html).toHaveAttribute('data-text', 'xl');
    await context.close();
  });

  test('CP-21 · con teclado, el primer Tab muestra "Saltar al contenido" y el foco es visible', async ({ browser, baseURL, request }) => {
    const person = await createPerson(request);
    const context = await browser.newContext({ baseURL, reducedMotion: 'reduce' });
    const page = await context.newPage();
    await loginPerson(page, person);

    await page.keyboard.press('Tab');
    const skip = page.getByRole('link', { name: 'Saltar al contenido' });
    await expect(skip).toBeFocused();
    await expect(skip).toBeInViewport();
    const outline = await skip.evaluate(el => {
      const style = getComputedStyle(el);
      return { outline: style.outlineStyle, width: parseFloat(style.outlineWidth), shadow: style.boxShadow };
    });
    expect(outline.outline !== 'none' && outline.width > 0 || outline.shadow !== 'none').toBeTruthy();

    await page.keyboard.press('Enter');
    await expect(page).toHaveURL(/#contenido$/);
    await context.close();
  });
});
