/**
 * Pruebas de aceptación del portal institucional (vigilancia y administración).
 * Historias 5, 6, 7, 8 y 10 de docs/ALCANCE.md · casos CP-09 a CP-13 y CP-19.
 */
import { readFileSync } from 'node:fs';
import { expect, test } from '@playwright/test';
import { createPerson, expectRegistered, loginPerson, loginStaff, phoneContext, registerFromPhone, staffPage } from './helpers';

test.describe('Historia 5 · Invitados', () => {
  test('CP-09 · vigilancia emite un pase de invitado, aparece dentro y luego registra su salida', async ({ browser, baseURL }) => {
    const page = await staffPage(browser, baseURL!);
    await loginStaff(page);
    await page.getByRole('link', { name: 'Invitados' }).click();
    await page.getByRole('button', { name: 'Emitir pase' }).first().click();

    const dialog = page.getByRole('dialog');
    await dialog.getByLabel(/Nombre del visitante/).fill('Visitante Prueba Externa');
    await dialog.getByLabel(/Persona o área que visita/).fill('Coordinación de Informática');
    await dialog.getByLabel(/Acceso/).selectOption({ label: 'Acceso principal' });
    await dialog.getByLabel(/Motivo de la visita/).fill('Entrevista de servicio social');
    await dialog.getByRole('button', { name: 'Emitir pase y registrar entrada' }).click();
    await expect(dialog).toHaveCount(0);

    const pass = page.getByRole('listitem').filter({ hasText: 'Visitante Prueba Externa' });
    await expect(pass.getByText(/Dentro desde/)).toBeVisible();
    await pass.getByRole('button', { name: 'Registrar salida' }).click();
    await expect(pass.getByText('Cerrado')).toBeVisible();
  });
});

test.describe('Historia 6 · Alta y baja de usuarios', () => {
  test('CP-11 · el alta rechaza un correo que no es institucional', async ({ browser, baseURL }) => {
    const page = await staffPage(browser, baseURL!);
    await loginStaff(page);
    await page.getByRole('link', { name: 'Personas' }).click();
    await page.getByRole('button', { name: /Dar de alta/ }).first().click();

    const dialog = page.getByRole('dialog');
    await dialog.getByLabel(/Código o matrícula/).fill('221122334');
    await dialog.getByLabel(/Nombre completo/).fill('Correo Externo Prueba');
    await dialog.getByLabel(/Correo institucional/).fill('correo.externo@gmail.com');
    await dialog.getByRole('button', { name: 'Dar de alta y generar contraseña' }).click();
    await expect(dialog.getByText('Usa el correo institucional de la UdeG.')).toBeVisible();

    // No se creó la persona
    await dialog.getByRole('button', { name: 'Cancelar' }).click();
    await expect(page.getByRole('row').filter({ hasText: 'Correo Externo Prueba' })).toHaveCount(0);
  });

  test('CP-10 · la baja cierra la sesión de la persona, le impide registrar acceso y conserva su historial', async ({ browser, request, baseURL }) => {
    const person = await createPerson(request, { fullName: 'Daniela Baja Prueba' });
    const phone = await phoneContext(browser, baseURL!);
    const phonePage = await phone.newPage();
    await loginPerson(phonePage, person);
    await expectRegistered(await registerFromPhone(phonePage, 'entrada'), 'Entrada');

    const page = await staffPage(browser, baseURL!);
    await loginStaff(page);
    await page.getByRole('link', { name: 'Personas' }).click();
    const row = page.getByRole('row').filter({ hasText: person.fullName });
    await row.getByRole('button', { name: 'Dar de baja' }).click();
    await page.getByRole('dialog').getByRole('button', { name: 'Dar de baja' }).click();
    // Pasa al filtro de bajas
    await page.getByRole('button', { name: /^Baja/ }).click();
    await expect(row.getByRole('button', { name: 'Reactivar' })).toBeVisible();

    // Su sesión en el celular quedó cerrada
    expect((await phonePage.request.get('/api/person/session')).status()).toBe(401);
    // Ya no puede volver a entrar
    await loginPerson(phonePage, person, { expectSuccess: false });
    await expect(phonePage.getByText('Mis últimos accesos')).toHaveCount(0);
    // Su historial se conserva
    await page.locator('a[href="/control/registros"]').first().click();
    await expect(page.getByRole('row').filter({ hasText: person.fullName })).toHaveCount(1);
    await phone.close();
  });
});

test.describe('Historia 7 · Alertas', () => {
  test('CP-12 · una alerta marcada como revisada deja de contarse como pendiente', async ({ browser, request, baseURL }) => {
    // Una salida sin entrada genera una alerta de incidencia
    const person = await createPerson(request, { fullName: 'Alerta Por Revisar' });
    const phone = await phoneContext(browser, baseURL!);
    const phonePage = await phone.newPage();
    await loginPerson(phonePage, person);
    const overview = await (await phonePage.request.get('/api/person/overview')).json();
    const accessPointId = overview.accessPoints.find((point: { name: string }) => point.name === 'Acceso principal').id;
    await phonePage.request.post('/api/person/access', { data: { direction: 'out', accessPointId, geo: null, biometric: null } });
    await phone.close();

    const page = await staffPage(browser, baseURL!);
    await loginStaff(page);
    const pending = async () => (await (await page.request.get('/api/staff/alerts/summary')).json()).unread as number;
    const before = await pending();

    await page.locator('a[href="/control/alertas"]').first().click();
    const alert = page.getByRole('listitem').filter({ hasText: person.fullName });
    await alert.getByRole('button', { name: 'Marcar revisada' }).click();
    await expect.poll(pending).toBe(before - 1);
  });
});

test.describe('Historia 8 · Historial con filtros y exportación', () => {
  test('CP-13 · el CSV exportado contiene solo los registros filtrados', async ({ browser, request, baseURL }) => {
    const elegida = await createPerson(request, { fullName: 'Exportación Persona Elegida' });
    const otra = await createPerson(request, { fullName: 'Exportación Persona Otra' });
    for (const person of [elegida, otra]) {
      const phone = await phoneContext(browser, baseURL!);
      const phonePage = await phone.newPage();
      await loginPerson(phonePage, person);
      await expectRegistered(await registerFromPhone(phonePage, 'entrada'), 'Entrada');
      await phone.close();
    }

    const page = await staffPage(browser, baseURL!);
    await loginStaff(page);
    await page.locator('a[href="/control/registros"]').first().click();
    await page.getByRole('button', { name: 'Hoy' }).click();
    const personFilter = page.locator('label').filter({ hasText: /^Persona/ }).locator('select');
    await personFilter.selectOption({ label: elegida.fullName });
    await expect(page.getByRole('row').filter({ hasText: otra.fullName })).toHaveCount(0);

    const downloadPromise = page.waitForEvent('download');
    await page.getByRole('button', { name: 'Exportar' }).click();
    const download = await downloadPromise;
    expect(download.suggestedFilename()).toMatch(/^accesos-.*\.csv$/);
    const csv = readFileSync((await download.path())!, 'utf8');
    const lines = csv.trim().split(/\r\n/);
    expect(lines[0]).toContain('Persona');
    expect(lines).toHaveLength(2); // encabezado + el registro de la persona elegida
    expect(csv).toContain(elegida.fullName);
    expect(csv).not.toContain(otra.fullName);

    // Un periodo sin registros no permite exportar
    await personFilter.selectOption({ label: 'Todas' });
    await page.getByLabel('Desde').fill('2020-01-01');
    await page.getByLabel('Hasta').fill('2020-01-02');
    await expect(page.getByRole('button', { name: 'Exportar' })).toBeDisabled();
  });
});

test.describe('Historia 10 · Afluencia', () => {
  test('CP-19 · al cambiar el periodo de las gráficas se actualizan y la tabla de datos coincide', async ({ browser, baseURL }) => {
    const page = await staffPage(browser, baseURL!);
    await loginStaff(page);
    const ranges: string[] = [];
    page.on('request', req => {
      const match = req.url().match(/\/api\/staff\/analytics\?days=(\d+)/);
      if (match) ranges.push(match[1]);
    });

    for (const days of ['7', '30', '14']) {
      const response = page.waitForResponse(res => res.url().includes(`/api/staff/analytics?days=${days}`) && res.ok());
      await page.getByRole('button', { name: `${days} días` }).click();
      const data = await (await response).json();

      // La tabla accesible de la gráfica diaria tiene un renglón por día y los mismos números que la API
      const caption = `Entradas y salidas por día, últimos ${days} días`;
      const table = page.locator('table').filter({ has: page.locator('caption', { hasText: caption }) });
      await expect(table).toBeAttached();
      const rows = table.locator('tbody tr');
      await expect(rows).toHaveCount(Number(days));
      const apiEntries = (data.daily as Array<{ entries: number }>).reduce((sum, day) => sum + day.entries, 0);
      const tableEntries = (await rows.evaluateAll(trs => trs.map(tr => Number(tr.children[1]?.textContent?.replace(/\D/g, '') || 0)))).reduce((a, b) => a + b, 0);
      expect(tableEntries).toBe(apiEntries);
    }
    expect(ranges).toEqual(expect.arrayContaining(['7', '30', '14']));
  });
});
