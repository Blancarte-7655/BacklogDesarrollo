import { Link } from 'react-router-dom';
import type { AccessRecord } from '../../../../shared/contracts';
import { PERSON_ROLE_LABELS } from '../../../../shared/rules';
import { RecordBadges } from '../../../components/RecordBadges';
import { capitalize, formatDate, formatDuration, formatTime } from '../../../lib/format';
import { Badge } from '../../../ui/Display';

export function AccessTable({ records, emptyMessage = 'No hay registros.' }: { records: AccessRecord[]; emptyMessage?: string }) {
  if (!records.length) return <p className="px-6 py-14 text-center text-sm text-stone-500">{emptyMessage}</p>;

  return (
    <div className="overflow-x-auto scrollbar-thin">
      <table className="w-full min-w-[900px] text-left text-sm">
        <thead>
          <tr className="border-b border-stone-200 bg-stone-50 text-[0.8125rem] font-semibold text-stone-600">
            <th className="px-5 py-2.5">Fecha</th>
            <th className="px-5 py-2.5">Persona</th>
            <th className="px-5 py-2.5">Acceso</th>
            <th className="px-5 py-2.5">Entrada</th>
            <th className="px-5 py-2.5">Salida</th>
            <th className="px-5 py-2.5">Tiempo</th>
            <th className="px-5 py-2.5">Estado</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-stone-100">
          {records.map(record => (
            <tr key={record.id} className={`transition hover:bg-stone-50/80 ${record.incident ? 'bg-amber-50/40' : ''}`}>
              <td className="px-5 py-3 whitespace-nowrap text-stone-700">{capitalize(formatDate(record.checkIn ?? record.checkOut!, 'weekday'))}</td>
              <td className="px-5 py-3">
                {record.personId ? (
                  <Link to={`/control/registros?personId=${record.personId}`} className="group block">
                    <span className="block font-semibold text-stone-800 group-hover:text-verde-700">{record.personName}</span>
                    <span className="font-mono text-xs text-stone-500">{record.personCode}</span>
                  </Link>
                ) : (
                  <div>
                    <span className="block font-semibold text-stone-800">{record.personName}</span>
                    <Badge tone="blue">Invitado</Badge>
                  </div>
                )}
              </td>
              <td className="px-5 py-3">
                <p className="text-stone-700">{record.accessPointName}</p>
                {record.personRole && <p className="text-xs text-stone-500">{PERSON_ROLE_LABELS[record.personRole]}</p>}
              </td>
              <td className="px-5 py-3 font-mono text-stone-800">{record.checkIn ? formatTime(record.checkIn) : '—'}</td>
              <td className="px-5 py-3 font-mono text-stone-800">{record.checkOut ? formatTime(record.checkOut) : '—'}</td>
              <td className="px-5 py-3 font-medium whitespace-nowrap text-stone-800">{record.checkOut ? formatDuration(record.minutes) : '—'}</td>
              <td className="px-5 py-3">
                <div className="flex max-w-64 flex-wrap gap-1">
                  <RecordBadges record={record} />
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
