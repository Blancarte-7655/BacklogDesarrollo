import { ExternalLink, Eye, EyeOff, Tv } from 'lucide-react';
import { useEffect, useState } from 'react';
import type { DisplayPin } from '../../shared/contracts';
import { useNow } from '../hooks/useNow';
import { formatDuration, formatTime } from '../lib/format';
import { buttonStyles } from './Button';

/** Tarjeta con el PIN de la pantalla de un salón y el tiempo que le queda */
export function PinCard({ pin, onExpire, hideByDefault = false }: { pin: DisplayPin; onExpire?: () => void; hideByDefault?: boolean }) {
  const now = useNow(1000);
  const [visible, setVisible] = useState(!hideByDefault);
  const left = Math.max(0, Date.parse(pin.validUntil) - now.getTime());
  const expired = left === 0;
  useEffect(() => {
    if (expired) onExpire?.();
  }, [expired, onExpire]);

  return (
    <article className="card p-5">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="flex items-center gap-1.5 text-xs font-semibold text-stone-500">
            <Tv className="size-3.5" />
            {pin.building}
          </p>
          <h3 className="font-display text-lg font-bold text-stone-900">{pin.roomName}</h3>
          <p className="truncate text-xs text-stone-500">{pin.currentClass ? `${pin.currentClass.subject} · ${pin.currentClass.teacher}` : 'Sin clase: el PIN cambia cada hora'}</p>
        </div>
        <button type="button" onClick={() => setVisible(v => !v)} className="rounded-md p-1.5 text-stone-400 hover:bg-stone-100" aria-label={visible ? 'Ocultar PIN' : 'Mostrar PIN'}>
          {visible ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
        </button>
      </div>
      <p className="mt-4 font-mono text-4xl font-semibold tracking-[0.25em] text-verde-800" aria-live="polite">
        {visible ? `${pin.pin.slice(0, 3)} ${pin.pin.slice(3)}` : '••• •••'}
      </p>
      <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-stone-100">
        <div className="h-full rounded-full bg-brand transition-all" style={{ width: `${Math.min(100, (left / (60 * 60 * 1000)) * 100)}%` }} />
      </div>
      <div className="mt-2 flex items-center justify-between gap-2 text-xs text-stone-500">
        <span>
          Vence a las {formatTime(pin.validUntil)} ({formatDuration(Math.ceil(left / 60000))})
        </span>
        <a href={`/pantalla/${pin.roomId}`} target="_blank" rel="noreferrer" className={buttonStyles('ghost', 'sm', '-mr-2')}>
          Simulador
          <ExternalLink className="size-3" />
        </a>
      </div>
    </article>
  );
}
