import assert from 'node:assert/strict';
import { describe, test } from 'node:test';
import { ipAllowed, normalizeIp, parseNetwork } from '../src/services/network.ts';

describe('Restricción por red', () => {
  const campus = ['10.20.0.0/16', '192.168.1.25'];

  test('sin redes configuradas no se restringe nada', () => {
    assert.equal(ipAllowed('8.8.8.8', []), true);
  });

  test('acepta IPs dentro de los rangos y la IP exacta', () => {
    assert.equal(ipAllowed('10.20.3.4', campus), true);
    assert.equal(ipAllowed('192.168.1.25', campus), true);
  });

  test('rechaza IPs fuera de la red del campus', () => {
    assert.equal(ipAllowed('10.21.0.1', campus), false);
    assert.equal(ipAllowed('192.168.1.26', campus), false);
    assert.equal(ipAllowed(undefined, campus), false);
  });

  test('entiende IPv4 escrita como IPv6 (::ffff:)', () => {
    assert.equal(normalizeIp('::ffff:10.20.0.9'), '10.20.0.9');
    assert.equal(ipAllowed('::ffff:10.20.0.9', campus), true);
  });

  test('el propio servidor (localhost) siempre entra', () => {
    assert.equal(ipAllowed('127.0.0.1', campus), true);
    assert.equal(ipAllowed('::1', campus), true);
  });

  test('rechaza rangos mal escritos con un mensaje claro', () => {
    assert.throws(() => parseNetwork('10.20.0.0/40'), /prefijo/);
    assert.throws(() => parseNetwork('red-del-campus'), /no es una IP/);
  });
});
