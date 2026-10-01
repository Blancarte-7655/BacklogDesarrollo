import assert from 'node:assert/strict';
import { describe, test } from 'node:test';
import { checkGeofence, CODE_RE, credentialValid, distanceMeters, INSTITUTIONAL_EMAIL_RE, MAX_GEO_ACCURACY_METERS } from '../../shared/rules.ts';

describe('distanceMeters', () => {
  test('la distancia a sí mismo es cero', () => {
    assert.equal(distanceMeters({ lat: 20.6, lng: -103.3 }, { lat: 20.6, lng: -103.3 }), 0);
  });

  test('0.001° de latitud equivale a unos 111 m', () => {
    assert.equal(distanceMeters({ lat: 20.6, lng: -103.3 }, { lat: 20.601, lng: -103.3 }), 111);
  });
});

describe('checkGeofence', () => {
  const gate = { lat: 20.6, lng: -103.3, radiusMeters: 100 };

  test('acepta una ubicación precisa dentro del radio', () => {
    assert.equal(checkGeofence({ lat: 20.6005, lng: -103.3, accuracy: 15 }, gate).ok, true);
  });

  test('el margen de error del GPS se suma al radio', () => {
    // ~111 m del acceso: fuera del radio de 100 m, pero dentro con ±20 m de precisión
    assert.equal(checkGeofence({ lat: 20.601, lng: -103.3, accuracy: 20 }, gate).ok, true);
  });

  test('rechaza una ubicación lejana', () => {
    assert.deepEqual(checkGeofence({ lat: 20.61, lng: -103.3, accuracy: 15 }, gate), { ok: false, reason: 'lejos', distance: 1112 });
  });

  test('rechaza una precisión enorme aunque prometa cubrir la distancia', () => {
    // Antes se aceptaba: radio + 100 000 m de "precisión" cubría cualquier distancia
    const result = checkGeofence({ lat: 21.5, lng: -103.3, accuracy: 100000 }, gate);
    assert.equal(result.ok, false);
    assert.equal(!result.ok && result.reason, 'imprecisa');
  });

  test(`acepta justo el límite de ±${MAX_GEO_ACCURACY_METERS} m`, () => {
    assert.equal(checkGeofence({ lat: 20.6, lng: -103.3, accuracy: MAX_GEO_ACCURACY_METERS }, gate).ok, true);
  });
});

describe('credentialValid', () => {
  const today = new Date(2026, 8, 30); // 30 de septiembre de 2026

  test('sin fecha de vigencia, la credencial es válida', () => {
    assert.equal(credentialValid({ active: true, credentialExpiresAt: null }, today), true);
  });

  test('es válida hasta el último día de su vigencia', () => {
    assert.equal(credentialValid({ active: true, credentialExpiresAt: '2026-09-30' }, today), true);
  });

  test('vencida un día antes, ya no es válida', () => {
    assert.equal(credentialValid({ active: true, credentialExpiresAt: '2026-09-29' }, today), false);
  });

  test('una persona dada de baja no tiene credencial válida aunque esté vigente', () => {
    assert.equal(credentialValid({ active: false, credentialExpiresAt: '2030-01-01' }, today), false);
  });
});

describe('validación de datos institucionales', () => {
  test('acepta correos de la UdeG y sus subdominios', () => {
    assert.match('ana.lopez@alumnos.udg.mx', INSTITUTIONAL_EMAIL_RE);
    assert.match('jperez@udg.mx', INSTITUTIONAL_EMAIL_RE);
  });

  test('rechaza correos externos o que imitan el dominio', () => {
    assert.doesNotMatch('ana@gmail.com', INSTITUTIONAL_EMAIL_RE);
    assert.doesNotMatch('ana@udg.mx.evil.com', INSTITUTIONAL_EMAIL_RE);
  });

  test('la matrícula tiene de 6 a 10 dígitos', () => {
    assert.match('221234567', CODE_RE);
    assert.doesNotMatch('12345', CODE_RE);
    assert.doesNotMatch('A21234567', CODE_RE);
  });
});
