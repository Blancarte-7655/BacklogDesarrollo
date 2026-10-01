import { browserSupportsWebAuthn, startRegistration } from '@simplewebauthn/browser';
import { BadgeCheck, Fingerprint, IdCard, KeyRound, Plus, ShieldCheck, Smartphone } from 'lucide-react';
import { useEffect, useState, type ReactNode } from 'react';
import { MAX_BIOMETRIC_DEVICES, PERSON_ROLE_LABELS } from '../../../../shared/rules';
import { ApiError } from '../../../api/http';
import { useAsync } from '../../../hooks/useAsync';
import { deviceLabel } from '../../../lib/geo';
import { formatDate, relativeTime } from '../../../lib/format';
import { Button } from '../../../ui/Button';
import { Avatar, Badge, ErrorState, PageHeader, PageLoader, SectionCard } from '../../../ui/Display';
import { Field } from '../../../ui/Field';
import { Modal, ModalBody, ModalFooter } from '../../../ui/Modal';
import { useToast } from '../../../ui/toast';
import { personApi } from '../api';

export default function PersonProfile() {
  const { data, loading, error, reload } = useAsync(() => personApi.overview(), []);

  if (!data) return loading ? <PageLoader /> : <ErrorState message={error ?? ''} onRetry={reload} />;
  const { profile } = data;

  return (
    <>
      <PageHeader eyebrow="Mi cuenta" title="Perfil y biometría" description="Los datos con los que te identificas en los accesos del campus." />

      <div className="grid gap-5 lg:grid-cols-5">
        <div className="lg:col-span-3">
          <SectionCard title="Credencial digital" icon={IdCard}>
            <div className="flex items-center gap-4 border-b border-stone-100 px-5 py-4">
              <Avatar name={profile.fullName} size="xl" />
              <div className="min-w-0">
                <p className="font-display text-lg font-extrabold text-stone-900">{profile.fullName}</p>
                <p className="font-mono text-sm text-stone-500">{profile.code}</p>
                <div className="mt-1.5 flex flex-wrap gap-1.5">
                  <Badge tone="verde">{PERSON_ROLE_LABELS[profile.role]}</Badge>
                  {data.credentialValid ? (
                    <Badge tone="blue" icon={BadgeCheck}>
                      Credencial vigente
                    </Badge>
                  ) : (
                    <Badge tone="red">Credencial no vigente</Badge>
                  )}
                </div>
              </div>
            </div>
            <dl className="grid gap-x-6 gap-y-4 px-5 py-4 sm:grid-cols-2">
              <Info label="Correo institucional">{profile.email}</Info>
              <Info label="Carrera o adscripción">{profile.program || '—'}</Info>
              <Info label="Vigencia de la credencial">
                {profile.credentialExpiresAt ? formatDate(profile.credentialExpiresAt, 'long') : 'Sin vencimiento'}
              </Info>
              <Info label="Último acceso">{profile.lastAccessAt ? relativeTime(profile.lastAccessAt) : 'Sin registros'}</Info>
            </dl>
            <p className="flex items-center gap-2 border-t border-stone-100 bg-stone-50/70 px-5 py-3 text-xs text-stone-500">
              <KeyRound className="size-4 shrink-0" />
              Tu contraseña la genera la administración del sistema. Si la perdiste, acude a la caseta de vigilancia.
            </p>
          </SectionCard>
        </div>

        <div className="lg:col-span-2">
          <BiometricsCard onChange={reload} />
        </div>
      </div>
    </>
  );
}

const Info = ({ label, children }: { label: string; children: ReactNode }) => (
  <div className="min-w-0">
    <dt className="text-xs font-medium text-stone-500">{label}</dt>
    <dd className="mt-0.5 text-sm font-semibold break-words text-stone-800">{children}</dd>
  </div>
);

function BiometricsCard({ onChange }: { onChange: () => unknown }) {
  const toast = useToast();
  const supported = browserSupportsWebAuthn();
  const [platformReady, setPlatformReady] = useState<boolean | null>(null);
  const { data, setData } = useAsync(() => personApi.biometrics(), []);
  const [adding, setAdding] = useState(false);
  const [label, setLabel] = useState(deviceLabel());
  const [busy, setBusy] = useState(false);
  const canAdd = (data?.length ?? 0) < MAX_BIOMETRIC_DEVICES;

  useEffect(() => {
    const check = window.PublicKeyCredential?.isUserVerifyingPlatformAuthenticatorAvailable;
    if (!check) {
      setPlatformReady(false);
      return;
    }
    check
      .call(window.PublicKeyCredential)
      .then(setPlatformReady)
      .catch(() => setPlatformReady(false));
  }, []);

  const register = async () => {
    setBusy(true);
    try {
      const optionsJSON = await personApi.registrationOptions();
      const response = await startRegistration({ optionsJSON });
      setData(await personApi.registerBiometric(response, label));
      setAdding(false);
      onChange();
      toast.notify('Biometría vinculada. Ya puedes registrar tu acceso.', 'success');
    } catch (err) {
      const name = (err as Error).name;
      toast.notify(
        err instanceof ApiError
          ? err.message
          : name === 'InvalidStateError'
            ? 'Este dispositivo ya está vinculado a tu cuenta.'
            : name === 'NotAllowedError'
              ? 'Se canceló la vinculación o expiró el tiempo.'
              : 'No se pudo vincular la biometría en este dispositivo.',
        'error',
      );
    } finally {
      setBusy(false);
    }
  };

  return (
    <SectionCard
      title="Biometría"
      description="Huella o rostro de tu dispositivo"
      icon={Fingerprint}
      action={
        supported &&
        canAdd && (
          <Button size="sm" variant="primary" icon={<Plus className="size-3.5" />} onClick={() => setAdding(true)}>
            Vincular
          </Button>
        )
      }
    >
      <div className="px-5 py-4 text-sm text-stone-600">
        <p>
          Al vincular tu teléfono, cada registro de acceso se confirma con tu huella o tu rostro. Tus datos biométricos nunca salen del
          dispositivo: el sistema solo guarda una llave de verificación.
        </p>
        {!supported && (
          <p className="mt-3 rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-800">
            Este navegador no admite biometría. Usa Chrome, Safari o Edge actualizados, con conexión segura (HTTPS).
          </p>
        )}
        {supported && platformReady === false && (
          <p className="mt-3 rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-800">
            No detectamos lector de huella ni cámara facial en este dispositivo. Intenta desde tu celular.
          </p>
        )}
      </div>

      {data && data.length > 0 ? (
        <ul className="divide-y divide-stone-100 border-t border-stone-100">
          {data.map(credential => (
            <li key={credential.id} className="flex items-center gap-3 px-5 py-3">
              <span className="grid size-9 place-items-center rounded-lg bg-verde-50 text-verde-700">
                <Smartphone className="size-4" />
              </span>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold text-stone-800">{credential.label}</p>
                <p className="text-xs text-stone-500">
                  Vinculado {formatDate(credential.createdAt)} ·{' '}
                  {credential.lastUsedAt ? `último uso ${relativeTime(credential.lastUsedAt)}` : 'sin usar'}
                </p>
              </div>
            </li>
          ))}
          <li className="px-5 py-3 text-xs text-stone-500">
            ¿Cambiaste o perdiste tu teléfono? Acude a la Coordinación de Seguridad y Accesos para desvincularlo y poder vincular el nuevo.
          </li>
        </ul>
      ) : (
        <p className="flex items-center gap-2 border-t border-stone-100 px-5 py-3 text-xs text-stone-500">
          <ShieldCheck className="size-4" />
          Aún no vinculas ningún dispositivo.
        </p>
      )}

      <Modal open={adding} onClose={() => setAdding(false)} size="sm" title="Vincular este dispositivo" description="Tu teléfono pedirá tu huella, rostro o PIN.">
        <ModalBody>
          <Field label="Nombre del dispositivo" hint="Para identificarlo en tu perfil. Solo puedes tener un dispositivo vinculado.">
            <input className="input" value={label} maxLength={60} onChange={event => setLabel(event.target.value)} />
          </Field>
        </ModalBody>
        <ModalFooter>
          <Button variant="ghost" onClick={() => setAdding(false)}>
            Cancelar
          </Button>
          <Button variant="primary" icon={<Fingerprint className="size-4" />} loading={busy} onClick={register}>
            Vincular biometría
          </Button>
        </ModalFooter>
      </Modal>
    </SectionCard>
  );
}
