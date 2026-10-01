import { BellRing, ClipboardCheck, Mail, Radio, ShieldCheck, TriangleAlert } from 'lucide-react';
import { useState, type FormEvent } from 'react';
import { Link, Navigate, useLocation, useNavigate } from 'react-router-dom';
import { errorMessage } from '../../../api/http';
import { AuthShell } from '../../../brand/AuthShell';
import { Button } from '../../../ui/Button';
import { FullPageLoader } from '../../../ui/Display';
import { Field, FormError } from '../../../ui/Field';
import { IconInput, PasswordInput } from '../../../ui/Inputs';
import { useSession } from '../session';

export default function StaffLogin() {
  const { status, expired, signIn } = useSession();
  const location = useLocation();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const from = (location.state as { from?: string } | null)?.from ?? '/control';
  if (status === 'loading') return <FullPageLoader />;
  if (status === 'authenticated') return <Navigate to={from} replace />;

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setLoading(true);
    setError(null);
    try {
      await signIn({ email, password });
      navigate(from, { replace: true });
    } catch (err) {
      setError(errorMessage(err));
      setLoading(false);
    }
  };

  return (
    <AuthShell
      portal="staff"
      badge="Portal institucional"
      badgeIcon={ShieldCheck}
      title="Quién está dentro del campus, en tiempo real"
      description="Acceso exclusivo para vigilancia y la administración del sistema."
      highlights={[
        { icon: Radio, text: 'Tablero en vivo de personas dentro del campus' },
        { icon: ClipboardCheck, text: 'Pases de invitado y registro manual de respaldo' },
        { icon: BellRing, text: 'Alertas de accesos denegados e incidencias' },
      ]}
    >
      <div className="p-7 sm:p-8">
        <div className="flex items-center gap-3">
          <span className="grid size-11 place-items-center rounded-xl bg-cafe-solid text-white">
            <ShieldCheck className="size-6" />
          </span>
          <div>
            <p className="eyebrow text-terracota-600">Portal institucional</p>
            <h1 className="font-display text-2xl font-extrabold text-stone-900">Iniciar sesión</h1>
          </div>
        </div>

        {expired && (
          <p className="mt-5 flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800">
            <TriangleAlert className="mt-0.5 size-4 shrink-0" />
            Tu sesión expiró por seguridad. Vuelve a ingresar.
          </p>
        )}

        <form onSubmit={submit} className="mt-6 space-y-4">
          <Field label="Correo institucional">
            <IconInput
              icon={Mail}
              type="email"
              value={email}
              onChange={event => setEmail(event.target.value)}
              placeholder="nombre.apellido@udg.mx"
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
            Ingresar al portal
          </Button>
        </form>

        <div className="mt-6 rounded-lg bg-stone-50 px-4 py-3 text-xs leading-relaxed text-stone-500">
          Solo pueden ingresar los correos registrados por la administración del sistema. ¿Eres alumno, docente o personal?{' '}
          <Link to="/acceso/entrar" className="font-semibold text-verde-700 hover:underline">
            Ir al portal de acceso
          </Link>
        </div>
      </div>
    </AuthShell>
  );
}
