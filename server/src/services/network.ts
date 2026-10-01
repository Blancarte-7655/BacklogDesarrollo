import { BlockList, isIP } from 'node:net';
import type { NetworkSettings } from '../../../shared/contracts.ts';
import { nowIso, one, run } from '../db/index.ts';
import { badRequest } from '../lib/http.ts';

/**
 * Restricción opcional por red:
 * - campusNetworks: el registro de entrada y salida solo se acepta desde la red del campus.
 * - staffNetworks: el portal institucional solo abre desde las computadoras autorizadas.
 * Una lista vacía no restringe nada. Las solicitudes desde el propio servidor (localhost)
 * siempre se aceptan, para que la administración no pueda quedarse fuera.
 */

type NetworkKind = 'campusNetworks' | 'staffNetworks';

/** Quita el prefijo IPv4 dentro de IPv6 (::ffff:192.168.1.10 → 192.168.1.10) */
export const normalizeIp = (ip: string) => ip.replace(/^::ffff:(?=\d+\.\d+\.\d+\.\d+$)/i, '');

const isLoopback = (ip: string) => ip === '::1' || ip.startsWith('127.');

/** Valida y normaliza una entrada: "10.20.0.0/16", "192.168.1.25" o una red IPv6 */
export function parseNetwork(entry: string): { address: string; prefix: number; family: 'ipv4' | 'ipv6' } {
  const [rawAddress, rawPrefix] = entry.trim().split('/');
  const address = normalizeIp(rawAddress ?? '');
  const version = isIP(address);
  if (!version) throw badRequest(`"${entry}" no es una IP ni un rango válido. Ejemplos: 192.168.10.0/24 o 10.0.5.12.`);
  const max = version === 4 ? 32 : 128;
  const prefix = rawPrefix === undefined ? max : Number(rawPrefix);
  if (!Number.isInteger(prefix) || prefix < 0 || prefix > max) throw badRequest(`El prefijo de "${entry}" debe ir de 0 a ${max}.`);
  return { address, prefix, family: version === 4 ? 'ipv4' : 'ipv6' };
}

export function ipAllowed(ip: string | undefined, networks: string[]): boolean {
  if (!networks.length) return true;
  if (!ip) return false;
  const address = normalizeIp(ip);
  if (isLoopback(address)) return true;
  const family = isIP(address) === 6 ? 'ipv6' : 'ipv4';
  const list = new BlockList();
  for (const entry of networks) {
    const network = parseNetwork(entry);
    list.addSubnet(network.address, network.prefix, network.family);
  }
  return list.check(address, family);
}

function readList(kind: NetworkKind): string[] {
  const row = one<{ value: string }>('SELECT value FROM settings WHERE key = ?', kind);
  return row ? (JSON.parse(row.value) as string[]) : [];
}

export const campusNetworks = () => readList('campusNetworks');
export const staffNetworks = () => readList('staffNetworks');

export function getNetworkSettings(ip: string | undefined): NetworkSettings {
  return { campusNetworks: campusNetworks(), staffNetworks: staffNetworks(), yourIp: normalizeIp(ip ?? '') };
}

/** Guarda las listas. Rechaza una lista de portal que dejaría fuera a quien la está guardando. */
export function saveNetworkSettings(input: { campusNetworks: string[]; staffNetworks: string[] }, ip: string | undefined) {
  const clean = (list: string[]) =>
    [...new Set(list.map(entry => entry.trim()).filter(Boolean))].map(entry => {
      const network = parseNetwork(entry);
      return `${network.address}/${network.prefix}`;
    });
  const campus = clean(input.campusNetworks);
  const staff = clean(input.staffNetworks);
  if (!ipAllowed(ip, staff)) {
    throw badRequest(`Esa lista dejaría fuera tu propia conexión (${normalizeIp(ip ?? '')}). Agrégala para no perder el acceso al portal.`);
  }
  const timestamp = nowIso();
  for (const [key, value] of [['campusNetworks', campus], ['staffNetworks', staff]] as const) {
    run(
      'INSERT INTO settings (key, value, updated_at) VALUES (?, ?, ?) ON CONFLICT (key) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at',
      key,
      JSON.stringify(value),
      timestamp,
    );
  }
  return { campusNetworks: campus, staffNetworks: staff };
}
