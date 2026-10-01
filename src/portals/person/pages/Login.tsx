import { Fingerprint, MapPin, Timer, TriangleAlert, UserRound, UserRoundCheck } from 'lucide-react';
import { useState, type FormEvent } from 'react';
import { Link, Navigate, useLocation, useNavigate } from 'react-router-dom';
import { errorMessage } from '../../../api/http';
import { AuthShell } from '../../../brand/AuthShell';
import { Button } from '../../../ui/Button';
import { FullPageLoader } from '../../../ui/Display';
import { Field, FormError } from '../../../ui/Field';
import { IconInput, PasswordInput } from '../../../ui/Inputs';
import { useSession } from '../session';

export default function PersonLogin() {
  const { status, expired, signIn } = useSession();
  const location = useLocation();
  const navigate = useNavigate();
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const from = (location.state as { from?: string } | null)?.from ?? '/acceso';
  if (status === 'loading') return <FullPageLoader />;
  if (status === 'authenticated') return <Navigate to={from} replace />;

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setLoading(true);
    setError(null);
    try {
      await signIn({ identifier, password });
      navigate(from, { replace: true });
    } catch (err) {
      setError(errorMessage(err));
      setLoading(false);
    }
  };

  return (
    <AuthShell
      portal="person"
      badge="Portal de acceso"
      badgeIcon={UserRoundCheck}
      title="Entra al campus sin hacer fila"
      description="Registra tu entrada y tu salida desde tu celular; tu credencial digital se valida en segundos."
      highlights={[
        { icon: Fingerprint, text: 'Tu identidad se confirma con la huella o el rostro de tu teléfono' },
        { icon: MapPin, text: 'El registro solo cuenta cuando estás en el acceso' },
        { icon: Timer, text: 'Historial completo de tus entradas y salidas' },
      ]}
    >
      <div className="p-7 sm:p-8">
        <div className="flex items-center gap-3">
          <span className="grid size-11 place-items-center rounded-xl bg-brand text-white">
            <UserRoundCheck className="size-6" />
          </span>
          <div>
            <p className="eyebrow text-verde-700">Portal de acceso</p>
            <h1 className="font-display text-2xl font-extrabold text-stone-900">Iniciar sesión</h1>
          </div>
        </div>

        {expired && (
          <p className="mt-5 flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800">
            <TriangleAlert className="mt-0.5 size-4 shrink-0" />
            Tu sesión se cerró. Inicia sesión otra vez para registrar tu acceso.
          </p>
        )}

        <form onSubmit={submit} className="mt-6 space-y-4">
          <Field label="Matrícula, código o correo institucional">
            <IconInput
              icon={UserRound}
              value={identifier}
              onChange={event => setIdentifier(event.target.value)}
              placeholder="220935928 o nombre@alumnos.udg.mx"
              autoComplete="username"
              autoFocus
              required
            />
          </Field>
          <Field label="Contraseña">
            <PasswordInput value={password} onChange={event => setPassword(event.target.value)} autoComplete="current-password" required />
          </Field>
          <FormError message={error} />
          <Button type="submit" variant="primary" size="lg" loading={loading} className="w-full">
            Ingresar
          </Button>
        </form>

        <div className="mt-6 rounded-lg bg-stone-50 px-4 py-3 text-xs leading-relaxed text-stone-500">
          Tu contraseña la entrega la administración del sistema al darte de alta. Si la perdiste o tu credencial venció, acude a la caseta de
          vigilancia. ¿Eres vigilancia o administración?{' '}
          <Link to="/control/entrar" className="font-semibold text-terracota-600 hover:underline">
            Ir al portal institucional
          </Link>
        </div>
      </div>
    </AuthShell>
  );
}
