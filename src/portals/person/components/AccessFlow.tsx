import { browserSupportsWebAuthn, startAuthentication } from '@simplewebauthn/browser';
import { CircleCheck, Fingerprint, LoaderCircle, LogIn, LogOut, MapPin, MapPinOff, TriangleAlert } from 'lucide-react';
import { motion } from 'motion/react';
import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import type { AccessDirection, AccessPoint, CheckResult, GeoPoint } from '../../../../shared/contracts';
import { ApiError, errorMessage } from '../../../api/http';
import { getCurrentPosition } from '../../../lib/geo';
import { MAX_GEO_ACCURACY_METERS } from '../../../../shared/rules';
import { formatTime } from '../../../lib/format';
import { Button } from '../../../ui/Button';
import { FormError } from '../../../ui/Field';
import { Modal, ModalBody, ModalFooter } from '../../../ui/Modal';
import { personApi } from '../api';

interface AccessFlowProps {
  open: boolean;
  direction: AccessDirection;
  accessPoint: AccessPoint | null;
  hasBiometrics: boolean;
  onClose: () => void;
  onDone: (result: CheckResult) => void;
}

/** Confirmación del acceso: ubicación + biometría del dispositivo */
export function AccessFlow(props: AccessFlowProps) {
  const entering = props.direction === 'in';
  return (
    <Modal
      open={props.open}
      onClose={props.onClose}
      size="sm"
      title={entering ? 'Registrar entrada' : 'Registrar salida'}
      description={props.accessPoint ? props.accessPoint.name : undefined}
    >
      {props.accessPoint && <AccessFlowBody {...props} accessPoint={props.accessPoint} />}
    </Modal>
  );
}

function AccessFlowBody({ direction, accessPoint, hasBiometrics, onClose, onDone }: AccessFlowProps & { accessPoint: AccessPoint }) {
  const entering = direction === 'in';
  const [geo, setGeo] = useState<{ status: 'pending' | 'ok' | 'denied'; point: GeoPoint | null }>({ status: 'pending', point: null });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<CheckResult | null>(null);
  const needsGeo = accessPoint.lat !== null && accessPoint.lng !== null;
  const imprecise = needsGeo && geo.status === 'ok' && geo.point!.accuracy > MAX_GEO_ACCURACY_METERS;

  const locate = () => {
    setGeo({ status: 'pending', point: null });
    getCurrentPosition()
      .then(point => setGeo({ status: 'ok', point }))
      .catch(() => setGeo({ status: 'denied', point: null }));
  };

  useEffect(locate, []);

  const submit = async () => {
    setBusy(true);
    setError(null);
    try {
      let biometric: Record<string, unknown> | null = null;
      if (hasBiometrics && browserSupportsWebAuthn()) {
        const optionsJSON = await personApi.authenticationOptions();
        biometric = (await startAuthentication({ optionsJSON })) as unknown as Record<string, unknown>;
      }
      const response = await personApi.access({ direction, accessPointId: accessPoint.id, geo: geo.point, biometric });
      setResult(response);
      onDone(response);
    } catch (err) {
      const name = (err as Error).name;
      setError(
        err instanceof ApiError
          ? err.message
          : name === 'NotAllowedError'
            ? 'Se canceló la verificación biométrica o expiró el tiempo.'
            : errorMessage(err),
      );
    } finally {
      setBusy(false);
    }
  };

  if (result) {
    const stamp = result.direction === 'in' ? result.record.checkIn : result.record.checkOut;
    return (
      <>
        <ModalBody className="text-center">
          <motion.span
            initial={{ scale: 0, rotate: -30 }}
            animate={{ scale: 1, rotate: 0 }}
            transition={{ type: 'spring', stiffness: 260, damping: 15 }}
            className={`mx-auto grid size-20 place-items-center rounded-full text-white ring-8 ${
              result.incident ? 'bg-amber-500 ring-amber-100' : result.direction === 'in' ? 'bg-verde-600 ring-verde-100' : 'bg-terracota-500 ring-terracota-100'
            }`}
          >
            {result.direction === 'in' ? <LogIn className="size-9" /> : <LogOut className="size-9" />}
          </motion.span>
          <p className={`eyebrow mt-5 ${result.direction === 'in' ? 'text-verde-700' : 'text-terracota-600'}`}>
            {result.direction === 'in' ? 'Entrada registrada' : 'Salida registrada'}
          </p>
          {stamp && <p className="mt-1 font-display text-4xl font-extrabold text-stone-900">{formatTime(stamp)}</p>}
          <p className="mt-3 text-sm text-stone-600">{result.message}</p>
        </ModalBody>
        <ModalFooter>
          <Button variant="primary" onClick={onClose} className="w-full sm:w-auto">
            Listo
          </Button>
        </ModalFooter>
      </>
    );
  }

  return (
    <>
      <ModalBody className="space-y-3">
        <Row
          icon={geo.status === 'denied' ? MapPinOff : MapPin}
          tone={imprecise ? 'warn' : geo.status === 'ok' ? 'ok' : geo.status === 'pending' ? 'pending' : needsGeo ? 'warn' : 'muted'}
          title="Ubicación"
          detail={
            imprecise
              ? `Precisión muy baja (±${geo.point!.accuracy} m). Activa la ubicación precisa o sal a un lugar abierto.`
              : geo.status === 'ok'
              ? `Obtenida con precisión de ±${geo.point!.accuracy} m`
              : geo.status === 'pending'
                ? 'Obteniendo tu ubicación…'
                : needsGeo
                  ? 'Este acceso valida la ubicación: permite el permiso y vuelve a intentarlo.'
                  : 'No disponible. Este acceso no la exige.'
          }
        />
        {needsGeo && (imprecise || geo.status === 'denied') && (
          <button type="button" onClick={locate} className="block w-full text-center text-sm font-semibold text-verde-700 hover:underline">
            Volver a obtener mi ubicación
          </button>
        )}
        <Row
          icon={Fingerprint}
          tone={hasBiometrics ? 'ok' : 'warn'}
          title="Biometría del dispositivo"
          detail={
            hasBiometrics
              ? 'Al confirmar, tu teléfono pedirá tu huella o rostro.'
              : 'Aún no vinculas este dispositivo. Hazlo desde Mi perfil para poder registrar tu acceso.'
          }
        />
        <FormError message={error} />
        {!hasBiometrics && (
          <Link to="/acceso/perfil" onClick={onClose} className="block text-center text-sm font-semibold text-verde-700 hover:underline">
            Vincular mi biometría ahora
          </Link>
        )}
      </ModalBody>
      <ModalFooter>
        <Button variant="ghost" onClick={onClose} disabled={busy}>
          Cancelar
        </Button>
        <Button
          variant={entering ? 'primary' : 'accent'}
          loading={busy}
          disabled={geo.status === 'pending'}
          icon={entering ? <LogIn className="size-4" /> : <LogOut className="size-4" />}
          onClick={submit}
        >
          {entering ? 'Confirmar entrada' : 'Confirmar salida'}
        </Button>
      </ModalFooter>
    </>
  );
}

function Row({ icon: Icon, title, detail, tone }: { icon: typeof MapPin; title: string; detail: string; tone: 'ok' | 'pending' | 'warn' | 'muted' }) {
  const tones = {
    ok: 'bg-verde-50 text-verde-700',
    pending: 'bg-sky-50 text-sky-700',
    warn: 'bg-amber-50 text-amber-700',
    muted: 'bg-stone-100 text-stone-500',
  };
  return (
    <div className="flex items-start gap-3 rounded-xl border border-stone-200 p-3">
      <span className={`grid size-9 shrink-0 place-items-center rounded-lg ${tones[tone]}`}>
        {tone === 'pending' ? <LoaderCircle className="size-4 animate-spin" /> : tone === 'warn' ? <TriangleAlert className="size-4" /> : <Icon className="size-4" />}
      </span>
      <div className="min-w-0 text-sm">
        <p className="font-semibold text-stone-800">{title}</p>
        <p className="text-xs text-stone-500">{detail}</p>
      </div>
      {tone === 'ok' && <CircleCheck className="ml-auto size-5 shrink-0 text-verde-600" />}
    </div>
  );
}
