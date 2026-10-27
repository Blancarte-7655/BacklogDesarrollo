/**
 * Pruebas de aceptación del portal de acceso (celular).
 * Historias 1, 2, 3, 4 y 9 de docs/ALCANCE.md · casos CP-01 a CP-08, CP-14 y CP-15.
 */
import { expect, test } from '@playwright/test';
import { CAMPUS, createAccessPoint, createPerson, expectRegistered, insideSection, loginPerson, loginStaff, phoneContext, registerFromPhone, staffPage } from './helpers';

test.describe('Historia 1 · Registrar entrada', () => {
  test('CP-01 · una entrada válida se confirma y aparece en el tablero en vivo (CP-08)', async ({ browser, request, baseURL }) => {
    const person = await createPerson(request, { fullName: 'Lucía Entrada Válida' });
    const phone = await phoneContext(browser, baseURL!);
    const page = await phone.newPage();

    await loginPerson(page, person);
    await expect(page.getByText('Fuera del campus').first()).toBeVisible();
    await expectRegistered(await registerFromPhone(page, 'entrada'), 'Entrada');
    await expect(page.getByText('Dentro del campus').first()).toBeVisible();

    // Vigilancia la ve dentro del campus en el tablero en vivo y puede filtrar por rol
    const staff = await staffPage(browser, baseURL!);
    await loginStaff(staff);
    const inside = insideSection(staff);
    await expect(inside.getByText(person.fullName)).toBeVisible();
    // CP-08: el filtro por rol muestra solo a las personas de ese rol
    await inside.getByRole('button', { name: /^Docente/ }).click();
    await expect(inside.getByText(person.fullName)).toHaveCount(0);
    await inside.getByRole('button', { name: /^Alumno/ }).click();
    await expect(inside.getByText(person.fullName)).toBeVisible();
    await phone.close();
  });

  test('CP-02 · con una entrada abierta ya no se ofrece ni se acepta otra entrada', async ({ browser, request, baseURL }) => {
    const person = await createPerson(request);
    const phone = await phoneContext(browser, baseURL!);
    const page = await phone.newPage();
    await loginPerson(page, person);
    await expectRegistered(await registerFromPhone(page, 'entrada'), 'Entrada');

    // La interfaz solo ofrece la salida
    await expect(page.getByRole('button', { name: 'Registrar salida' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Registrar entrada' })).toHaveCount(0);

    // Y el servidor rechaza una segunda entrada aunque se intente directamente
    const overview = await (await page.request.get('/api/person/overview')).json();
    const res = await page.request.post('/api/person/access', {
      data: { direction: 'in', accessPointId: overview.openRecord?.accessPointId ?? overview.accessPoints?.[0]?.id, geo: { lat: CAMPUS.latitude, lng: CAMPUS.longitude, accuracy: 10 }, biometric: null },
    });
    expect(res.status()).toBe(409);
    await phone.close();
  });

  test('CP-03 · una credencial vencida no puede iniciar sesión y se indica la fecha', async ({ browser, request, baseURL }) => {
    const person = await createPerson(request, { credentialExpiresAt: '2025-01-31' });
    const phone = await phoneContext(browser, baseURL!);
    const page = await phone.newPage();
    await loginPerson(page, person, { expectSuccess: false });
    await expect(page.getByText(/Tu credencial venció el 2025-01-31/)).toBeVisible();
    await phone.close();
  });

  test('CP-15 · lejos de un acceso con geocerca, la entrada se rechaza con la distancia y genera alerta', async ({ browser, request, baseURL }) => {
    const point = await createAccessPoint(request, { name: 'Acceso con geocerca E2E', geofence: true });
    const person = await createPerson(request);
    // ~2 km al norte del acceso
    const phone = await phoneContext(browser, baseURL!, { latitude: CAMPUS.latitude + 0.018, longitude: CAMPUS.longitude });
    const page = await phone.newPage();
    await loginPerson(page, person);
    await registerFromPhone(page, 'entrada', point.name);
    await expect(page.getByText(new RegExp(`Estás a \\d+ m de ${point.name}`)).first()).toBeVisible();
    await phone.close();

    const staff = await staffPage(browser, baseURL!);
    await loginStaff(staff);
    await staff.locator('a[href="/control/alertas"]').first().click();
    await expect(staff.getByText(person.fullName).first()).toBeVisible();
  });
});

test.describe('Historia 2 · Registrar salida', () => {
  test('CP-04 · la salida cierra la entrada abierta y la persona sale del tablero', async ({ browser, request, baseURL }) => {
    const person = await createPerson(request, { fullName: 'Mario Salida Normal' });
    const phone = await phoneContext(browser, baseURL!);
    const page = await phone.newPage();
    await loginPerson(page, person);
    await expectRegistered(await registerFromPhone(page, 'entrada'), 'Entrada');
    await expectRegistered(await registerFromPhone(page, 'salida'), 'Salida');
    await expect(page.getByText('Fuera del campus').first()).toBeVisible();
    await phone.close();

    const staff = await staffPage(browser, baseURL!);
    await loginStaff(staff);
    await expect(insideSection(staff)).toBeVisible();
    await expect(insideSection(staff).getByText(person.fullName)).toHaveCount(0);
  });

  test('CP-05 y CP-06 · una salida sin entrada queda como incidencia y una segunda salida no se duplica', async ({ browser, request, baseURL }) => {
    const person = await createPerson(request, { fullName: 'Rosa Salida Sin Entrada' });
    const phone = await phoneContext(browser, baseURL!);
    const page = await phone.newPage();
    await loginPerson(page, person);
    const overview = await (await page.request.get('/api/person/overview')).json();
    const accessPointId = overview.accessPoints.find((point: { name: string }) => point.name === 'Acceso principal').id;
    const exit = () =>
      page.request.post('/api/person/access', {
        data: { direction: 'out', accessPointId, geo: { lat: CAMPUS.latitude, lng: CAMPUS.longitude, accuracy: 10 }, biometric: null },
      });

    // CP-06: salida sin entrada abierta → se registra con incidencia
    const first = await exit();
    expect(first.ok(), await first.text()).toBeTruthy();
    // CP-05: segunda salida el mismo día → aviso, sin duplicar
    const second = await exit();
    expect(second.status()).toBe(409);
    await phone.close();

    const staff = await staffPage(browser, baseURL!);
    await loginStaff(staff);
    await staff.locator('a[href="/control/alertas"]').first().click();
    await expect(staff.getByText(person.fullName).first()).toBeVisible();
    await staff.locator('a[href="/control/registros"]').first().click();
    // Un solo registro (la segunda salida no se duplicó), marcado como incidencia
    const rows = staff.getByRole('row').filter({ hasText: person.fullName });
    await expect(rows).toHaveCount(1);
    await expect(rows.getByText('Salida sin entrada registrada', { exact: true })).toBeVisible();
  });
});

test.describe('Historia 3 · Acceso según el rol', () => {
  test('CP-07 · un alumno no puede entrar por un acceso solo para personal y se alerta a vigilancia', async ({ browser, request, baseURL }) => {
    const point = await createAccessPoint(request, { name: 'Acceso solo personal E2E', roles: ['personal'] });
    const person = await createPerson(request, { fullName: 'Pedro Rol No Permitido' });
    const phone = await phoneContext(browser, baseURL!);
    const page = await phone.newPage();
    await loginPerson(page, person);

    // El portal no le ofrece ese acceso…
    await expect(page.getByRole('button', { name: new RegExp(point.name) })).toHaveCount(0);
    // …y el servidor lo rechaza si se intenta directamente
    const res = await page.request.post('/api/person/access', {
      data: { direction: 'in', accessPointId: point.id, geo: { lat: CAMPUS.latitude, lng: CAMPUS.longitude, accuracy: 10 }, biometric: null },
    });
    expect(res.status()).toBe(403);
    await phone.close();

    const staff = await staffPage(browser, baseURL!);
    await loginStaff(staff);
    await staff.locator('a[href="/control/alertas"]').first().click();
    await expect(staff.getByText(person.fullName).first()).toBeVisible();
  });
});

test.describe('Historia 9 · Historial personal', () => {
  test('CP-14 · cada persona ve solo sus propios registros', async ({ browser, request, baseURL }) => {
    const ana = await createPerson(request, { fullName: 'Ana Historial Propio' });
    const beto = await createPerson(request, { fullName: 'Beto Historial Ajeno' });

    for (const person of [ana, beto]) {
      const phone = await phoneContext(browser, baseURL!);
      const page = await phone.newPage();
      await loginPerson(page, person);
      await expectRegistered(await registerFromPhone(page, 'entrada'), 'Entrada');
      await phone.close();
    }

    const phone = await phoneContext(browser, baseURL!);
    const page = await phone.newPage();
    await loginPerson(page, ana);
    await page.getByRole('link', { name: 'Ver historial' }).click();
    await expect(page).toHaveURL(/historial/);
    const records = await (await page.request.get('/api/person/records')).json();
    expect(records.length).toBe(1);
    expect(records.every((record: { personId?: string }) => !record.personId || record.personId === ana.id)).toBeTruthy();
    await expect(page.getByText(beto.fullName)).toHaveCount(0);
    await phone.close();
  });
});
