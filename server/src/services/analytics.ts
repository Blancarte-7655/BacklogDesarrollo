import type { AccessAnalytics, AlertType, PersonRole } from '../../../shared/contracts.ts';
import { many } from '../db/index.ts';
import { addDays, dateKey, dayBounds, minutesBetween } from '../lib/dates.ts';

interface AnalyticsRow {
  check_in: string | null;
  check_out: string | null;
  role: PersonRole | null;
  guest_pass_id: string | null;
  access_point_name: string | null;
}

/**
 * Afluencia de los últimos `days` días (incluido hoy), agrupada en la hora local del campus.
 * Se agrupa en JavaScript para respetar la zona horaria de Guadalajara.
 */
export function accessAnalytics(days: number, now = new Date()): AccessAnalytics {
  const firstDay = dateKey(addDays(now, -(days - 1)));
  const start = dayBounds(firstDay).start;
  const end = dayBounds(dateKey(now)).end;
  const todayKey = dateKey(now);

  const rows = many<AnalyticsRow>(
    `SELECT r.check_in, r.check_out, p.role, r.guest_pass_id, ap.name AS access_point_name
       FROM access_records r
       LEFT JOIN people p ON p.id = r.person_id
       LEFT JOIN access_points ap ON ap.id = r.access_point_id
      WHERE (r.check_in BETWEEN ? AND ?) OR (r.check_out BETWEEN ? AND ?)`,
    start,
    end,
    start,
    end,
  );

  const hourly = Array.from({ length: 24 }, (_, hour) => ({ hour, entries: 0, exits: 0 }));
  const dailyMap = new Map<string, { date: string; entries: number; exits: number }>();
  for (let i = 0; i < days; i++) {
    const key = dateKey(addDays(now, -(days - 1) + i));
    dailyMap.set(key, { date: key, entries: 0, exits: 0 });
  }
  const byRole = new Map<PersonRole | 'invitado', number>();
  const byPoint = new Map<string, number>();
  const entriesByHour = new Array<number>(24).fill(0);
  let stayTotal = 0;
  let stayCount = 0;
  let totalEntries = 0;

  for (const row of rows) {
    if (row.check_in && row.check_in >= start && row.check_in <= end) {
      const at = new Date(row.check_in);
      const key = dateKey(at);
      totalEntries++;
      dailyMap.get(key)!.entries++;
      entriesByHour[at.getHours()]++;
      if (key === todayKey) hourly[at.getHours()].entries++;
      const role = row.role ?? (row.guest_pass_id ? 'invitado' : null);
      if (role) byRole.set(role, (byRole.get(role) ?? 0) + 1);
      const point = row.access_point_name ?? 'Acceso eliminado';
      byPoint.set(point, (byPoint.get(point) ?? 0) + 1);
      if (row.check_out) {
        stayTotal += minutesBetween(row.check_in, row.check_out);
        stayCount++;
      }
    }
    if (row.check_out && row.check_out >= start && row.check_out <= end) {
      const at = new Date(row.check_out);
      const key = dateKey(at);
      dailyMap.get(key)!.exits++;
      if (key === todayKey) hourly[at.getHours()].exits++;
    }
  }

  const denied = many<{ type: AlertType; count: number }>(
    `SELECT type, COUNT(*) AS count FROM alerts
      WHERE created_at BETWEEN ? AND ? AND type IN ('credencial_invalida', 'area_no_permitida', 'fuera_de_area', 'red_no_permitida')
      GROUP BY type ORDER BY count DESC`,
    start,
    end,
  );

  const peak = entriesByHour.reduce((best, count, hour) => (count > (best === null ? 0 : entriesByHour[best]) ? hour : best), null as number | null);

  return {
    days,
    hourly,
    daily: [...dailyMap.values()],
    byRole: [...byRole].map(([role, entries]) => ({ role, entries })).sort((a, b) => b.entries - a.entries),
    byAccessPoint: [...byPoint].map(([name, entries]) => ({ name, entries })).sort((a, b) => b.entries - a.entries),
    denied,
    averageMinutes: stayCount ? Math.round(stayTotal / stayCount) : 0,
    peakHour: peak,
    totalEntries,
  };
}
