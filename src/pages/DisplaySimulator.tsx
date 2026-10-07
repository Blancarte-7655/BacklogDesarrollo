import { Delete, MonitorSmartphone, MonitorX, Tv } from 'lucide-react';
import { useState, type ReactNode } from 'react';
import { useParams } from 'react-router-dom';
import { api, errorMessage } from '../api/http';
import { Wordmark } from '../brand/Logo';
import { useAsync } from '../hooks/useAsync';
import { useNow } from '../hooks/useNow';
import { formatTime } from '../lib/format';

interface DisplayInfo {
  roomName: string;
  building: string;
  validUntil: string;
  currentClass: { subject: string; teacher: string; group: string } | null;
}

/**
 * Simulador de la pantalla del salón para la demostración. En producción esta lógica vive en la
 * pantalla o en el transmisor (Chromecast, Miracast, etc.), que consulta a UniAccess antes de aceptar
 * una conexión. Aquí se ve cómo se comporta: sin el PIN de la clase, nadie puede proyectar.
 */
export default function DisplaySimulator() {
  const { roomId = '' } = useParams();
  const now = useNow(1000);
  const info = useAsync(() => api<DisplayInfo>(`/public/displays/${roomId}`), [roomId], { pollMs: 60_000 });
  const [pin, setPin] = useState('');
  const [state, setState] = useState<{ status: 'idle' | 'checking' | 'connected' | 'error'; message?: string }>({ status: 'idle' });

  const press = (digit: string) => {
    if (state.status === 'connected') return;
    setState({ status: 'idle' });
    setPin(current => (current.length < 6 ? current + digit : current));
  };

  const connect = async () => {
    setState({ status: 'checking' });
    try {
      const result = await api<{ ok: boolean; message: string }>(`/public/displays/${roomId}/connect`, { body: { pin } });
      setState({ status: result.ok ? 'connected' : 'error', message: result.message });
      if (!result.ok) setPin('');
    } catch (error) {
      setState({ status: 'error', message: errorMessage(error) });
      setPin('');
    }
  };

  const room = info.data;
  return (
    <div className="grid min-h-dvh place-items-center bg-[#0c1210] p-4 text-white">
      <div className="w-full max-w-3xl overflow-hidden rounded-3xl border-[10px] border-stone-800 bg-linear-to-br from-[#123d24] to-[#0b1f15] shadow-2xl">
        <div className="flex items-center justify-between px-6 pt-5 text-sm text-white/70">
          <Wordmark size="sm" tone="white" />
          <span className="font-mono">{formatTime(now.toISOString())}</span>
        </div>

        <div className="grid gap-8 px-6 py-8 sm:grid-cols-[1fr_auto] sm:px-10">
          <div>
            <p className="flex items-center gap-2 text-sm text-white/60">
              <Tv className="size-4" />
              Pantalla del salón
            </p>
            <h1 className="mt-1 font-display text-3xl font-extrabold">{room ? room.roomName : info.error ? 'Salón no encontrado' : 'Cargando…'}</h1>
            {room && <p className="text-white/60">{room.building}</p>}

            {room?.currentClass ? (
              <div className="mt-6 rounded-xl bg-white/10 p-4">
                <p className="text-xs text-white/60">Clase en curso</p>
                <p className="font-semibold">{room.currentClass.subject}</p>
                <p className="text-sm text-white/70">
                  {room.currentClass.teacher} · Grupo {room.currentClass.group}
                </p>
              </div>
            ) : (
              room && <p className="mt-6 rounded-xl bg-white/10 p-4 text-sm text-white/70">Sin clase en este momento.</p>
            )}

            <div className="mt-6" aria-live="polite">
              {state.status === 'connected' ? (
                <p className="flex items-center gap-2 rounded-xl bg-leaf/20 px-4 py-3 font-semibold text-lime-200">
                  <MonitorSmartphone className="size-5" />
                  Conectado. Proyectando hasta las {room && formatTime(room.validUntil)}.
                </p>
              ) : state.status === 'error' ? (
                <p className="flex items-center gap-2 rounded-xl bg-red-500/20 px-4 py-3 font-semibold text-red-200">
                  <MonitorX className="size-5" />
                  {state.message}
                </p>
              ) : (
                <p className="text-sm text-white/70">Para proyectar escribe el PIN que el docente ve en su UniAccess.</p>
              )}
            </div>
          </div>

          <div className="mx-auto w-64">
            <div className="mb-4 flex justify-center gap-2" aria-label={`PIN: ${pin.length} de 6 dígitos`}>
              {Array.from({ length: 6 }, (_, index) => (
                <span key={index} className={`size-4 rounded-full ${index < pin.length ? 'bg-white' : 'bg-white/20'}`} />
              ))}
            </div>
            <div className="grid grid-cols-3 gap-2">
              {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map(digit => (
                <KeyButton key={digit} onClick={() => press(digit)}>
                  {digit}
                </KeyButton>
              ))}
              <KeyButton onClick={() => setPin(current => current.slice(0, -1))} label="Borrar">
                <Delete className="mx-auto size-5" />
              </KeyButton>
              <KeyButton onClick={() => press('0')}>0</KeyButton>
              <KeyButton onClick={() => void connect()} disabled={pin.length !== 6 || state.status === 'checking' || state.status === 'connected'} primary>
                OK
              </KeyButton>
            </div>
          </div>
        </div>
      </div>
      <p className="mt-4 max-w-xl text-center text-xs text-white/40">
        Simulador para la demostración. En el salón, esta validación la hace la pantalla o el transmisor configurado por el área de sistemas.
      </p>
    </div>
  );
}

function KeyButton({ children, onClick, disabled, primary, label }: { children: ReactNode; onClick: () => void; disabled?: boolean; primary?: boolean; label?: string }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label={label}
      className={`h-14 rounded-xl font-display text-xl font-bold transition active:scale-95 disabled:opacity-40 ${primary ? 'bg-leaf text-[#0b1f15]' : 'bg-white/10 hover:bg-white/20'}`}
    >
      {children}
    </button>
  );
}
