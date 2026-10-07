import { ShieldCheck } from 'lucide-react';
import { useState } from 'react';
import { Link } from 'react-router-dom';
import { errorMessage } from '../api/http';
import { Button } from './Button';
import { FormError } from './Field';
import { Modal, ModalBody, ModalFooter } from './Modal';

interface PrivacyConsentProps {
  open: boolean;
  /** Llama al endpoint de aceptación del portal */
  onAccept: () => Promise<unknown>;
  onSignOut: () => void;
  audience: 'person' | 'staff';
}

/** Primer ingreso: la persona debe conocer y aceptar el aviso de privacidad vigente */
export function PrivacyConsent({ open, onAccept, onSignOut, audience }: PrivacyConsentProps) {
  const [checked, setChecked] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const accept = async () => {
    setSaving(true);
    setError(null);
    try {
      await onAccept();
    } catch (err) {
      setError(errorMessage(err));
      setSaving(false);
    }
  };

  return (
    <Modal open={open} onClose={() => undefined} locked title="Aviso de privacidad" description="Antes de continuar, conoce cómo se usan tus datos.">
      <ModalBody className="space-y-4 text-sm leading-relaxed text-stone-600">
        <div className="flex gap-3 rounded-xl bg-verde-50 p-4 text-verde-800">
          <ShieldCheck className="mt-0.5 size-5 shrink-0" />
          <p>
            {audience === 'person'
              ? 'UniAccess registra tus entradas y salidas, el uso de equipos de laboratorio y, si lo activas, te envía avisos al celular.'
              : 'Como personal de la Coordinación tendrás acceso a datos personales de la comunidad universitaria. Úsalos solo para las finalidades del servicio.'}
          </p>
        </div>
        <ul className="list-disc space-y-1.5 pl-5">
          <li>Tu huella o rostro nunca salen de tu teléfono; UniAccess no los guarda.</li>
          <li>La ubicación solo se consulta al registrar el acceso; no hay rastreo.</li>
          <li>Los registros no se usan para calificar ni para fines comerciales.</li>
          <li>Puedes ejercer tus derechos ARCO ante la Unidad de Transparencia de la Universidad.</li>
        </ul>
        <Link to="/privacidad" target="_blank" className="inline-block font-semibold text-verde-700 hover:underline">
          Leer el aviso de privacidad completo
        </Link>
        <label className="flex cursor-pointer items-start gap-3 rounded-lg border border-stone-200 p-3">
          <input type="checkbox" checked={checked} onChange={event => setChecked(event.target.checked)} className="mt-0.5 size-4 accent-[var(--color-brand)]" />
          <span className="font-medium text-stone-800">
            {audience === 'person' ? 'Leí y acepto el aviso de privacidad.' : 'Leí el aviso de privacidad y me comprometo a tratar los datos con confidencialidad.'}
          </span>
        </label>
        <FormError message={error} />
      </ModalBody>
      <ModalFooter>
        <Button variant="ghost" onClick={onSignOut}>
          Salir
        </Button>
        <Button variant="primary" disabled={!checked} loading={saving} onClick={() => void accept()}>
          Aceptar y continuar
        </Button>
      </ModalFooter>
    </Modal>
  );
}
