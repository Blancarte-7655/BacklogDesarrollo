/**
 * Prueba de aceptación de la biometría del dispositivo (historia 1, ADR 0001) · caso CP-16.
 *
 * Corre contra un servidor con REQUIRE_BIOMETRIC=true. Chromium simula la huella o el rostro del
 * teléfono con un autenticador virtual de WebAuthn (DevTools Protocol), así el flujo completo
 * —vincular el dispositivo y confirmar la entrada— se ejecuta sin hardware.
 * La prueba en un celular físico sigue siendo manual (ver docs/CASOS_DE_PRUEBA.md).
 */
import { expect, test } from '@playwright/test';
import { createPerson, expectRegistered, loginPerson, phoneContext, registerFromPhone } from './helpers';

test('CP-16 · con biometría vinculada, la entrada exige la verificación del dispositivo', async ({ browser, request, baseURL }) => {
  const person = await createPerson(request, { fullName: 'Bruno Biometría Prueba' });
  const phone = await phoneContext(browser, baseURL!);
  const page = await phone.newPage();

  // Autenticador de plataforma (como el lector de huella del teléfono) que verifica al usuario
  const cdp = await phone.newCDPSession(page);
  await cdp.send('WebAuthn.enable');
  const { authenticatorId } = await cdp.send('WebAuthn.addVirtualAuthenticator', {
    options: { protocol: 'ctap2', transport: 'internal', hasResidentKey: true, hasUserVerification: true, isUserVerified: true, automaticPresenceSimulation: true },
  });

  await loginPerson(page, person);

  // Sin biometría vinculada, el servidor no permite registrar la entrada
  await registerFromPhone(page, 'entrada');
  await expect(page.getByText(/vincula la biometría de tu dispositivo/i).first()).toBeVisible();
  await page.getByRole('dialog').getByRole('button', { name: 'Cancelar' }).click();

  // Vincula el dispositivo desde su perfil
  await page.goto('/acceso/perfil');
  await page.getByRole('button', { name: 'Vincular', exact: true }).click();
  await page.getByRole('dialog').getByRole('button', { name: 'Vincular biometría' }).click();
  await expect(page.getByText('Biometría vinculada. Ya puedes registrar tu acceso.')).toBeVisible();
  const { credentials } = await cdp.send('WebAuthn.getCredentials', { authenticatorId });
  expect(credentials).toHaveLength(1);

  // La entrada pide la verificación del dispositivo y queda registrada con biometría
  await page.goto('/acceso');
  await expectRegistered(await registerFromPhone(page, 'entrada'), 'Entrada');
  const records = await (await page.request.get('/api/person/records')).json();
  expect(records[0].biometric).toBeTruthy();
  const after = await cdp.send('WebAuthn.getCredentials', { authenticatorId });
  expect(after.credentials[0].signCount).toBeGreaterThan(credentials[0].signCount);
  await phone.close();
});
