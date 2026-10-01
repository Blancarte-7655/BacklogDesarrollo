import {
  ArrowRight,
  BadgeCheck,
  Fingerprint,
  LogIn,
  MapPin,
  Radio,
  ShieldCheck,
  Timer,
  UserRoundCheck,
  type LucideIcon,
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { BrandBackdrop } from '../brand/BrandBackdrop';
import { SiteFooter, SiteHeader } from '../brand/Chrome';
import AnimatedContent from '../components/reactbits/AnimatedContent/AnimatedContent';
import BlurText from '../components/reactbits/BlurText/BlurText';
import GlareHover from '../components/reactbits/GlareHover/GlareHover';
import RotatingText from '../components/reactbits/RotatingText/RotatingText';

const FEATURES: Array<{ icon: LucideIcon; title: string; text: string }> = [
  { icon: Timer, title: 'Acceso en segundos', text: 'Sin filas ni revisión manual de credencial en la entrada.' },
  { icon: Fingerprint, title: 'Identidad verificada', text: 'La huella o el rostro del propio teléfono confirma quién registra.' },
  { icon: MapPin, title: 'Registro en el campus', text: 'Cada acceso valida que la persona esté realmente en la entrada.' },
  { icon: Radio, title: 'Vigilancia informada', text: 'Tablero en vivo de quién está dentro y alertas de cada incidencia.' },
];

export default function Landing() {
  return (
    <div className="min-h-dvh bg-page">
      <section className="relative isolate overflow-hidden">
        <BrandBackdrop />
        <SiteHeader />

        <div className="mx-auto grid max-w-7xl items-center gap-12 px-5 pt-8 pb-20 sm:px-8 lg:grid-cols-[1.15fr_1fr] lg:pt-14 lg:pb-28">
          <div className="text-white">
            <span className="inline-flex items-center gap-2 rounded-full bg-white/15 px-3 py-1.5 text-xs font-semibold tracking-wide ring-1 ring-white/25 backdrop-blur">
              <span className="size-1.5 rounded-full bg-leaf" />
              Control de acceso universitario
            </span>
            <BlurText
              text="UniAccess"
              delay={80}
              animateBy="letters"
              animationFrom={{ filter: 'blur(12px)', opacity: 0, y: 24 }}
              animationTo={[{ filter: 'blur(0px)', opacity: 1, y: 0 }]}
              className="mt-6 font-display text-6xl leading-none font-extrabold tracking-tight sm:text-7xl"
            />
            <div className="mt-4 flex flex-wrap items-center gap-x-3 gap-y-2 font-display text-lg font-semibold sm:text-2xl">
              <span className="text-white/85">Entra al campus y</span>
              <RotatingText
                texts={['registra tu entrada', 'confirma tu identidad', 'evita las filas', 'deja constancia']}
                mainClassName="overflow-hidden rounded-lg bg-surface px-3 py-1 text-verde-700 shadow-lg shadow-black/10"
                splitLevelClassName="overflow-hidden pb-0.5"
                staggerFrom="last"
                staggerDuration={0.018}
                rotationInterval={2600}
                transition={{ type: 'spring', damping: 30, stiffness: 400 }}
              />
            </div>
            <p className="mt-6 max-w-xl text-base leading-relaxed text-white/80 sm:text-lg">
              Check-in y check-out digital para alumnos, docentes, personal e invitados del Centro Universitario de Tlaquepaque. Sin filas en
              horas pico y con un historial consultable de cada acceso.
            </p>
          </div>

          <div className="grid gap-4">
            <PortalCard
              to="/acceso"
              icon={UserRoundCheck}
              eyebrow="Alumnos, docentes y personal"
              title="Portal de acceso"
              description="Registra tu entrada y salida desde tu celular, con la biometría de tu propio dispositivo."
              cta="Registrar mi acceso"
              accent="verde"
            />
            <PortalCard
              to="/control"
              icon={ShieldCheck}
              eyebrow="Vigilancia y administración"
              title="Portal institucional"
              description="Consulta quién está dentro, emite pases de invitado, atiende alertas y audita el historial."
              cta="Entrar al portal"
              accent="terracota"
            />
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-5 py-16 sm:px-8">
        <div className="max-w-2xl">
          <p className="eyebrow text-terracota-600">Cómo funciona</p>
          <h2 className="mt-2 font-display text-3xl font-extrabold tracking-tight text-stone-900">Un solo ciclo: entrada y salida</h2>
        </div>
        <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {FEATURES.map(({ icon: Icon, title, text }, index) => (
            <AnimatedContent key={title} distance={40} duration={0.7} delay={index * 0.08} className="card p-5">
              <span className="grid size-10 place-items-center rounded-lg bg-verde-50 text-verde-700">
                <Icon className="size-5" />
              </span>
              <h3 className="mt-4 font-display text-[0.9375rem] font-bold text-stone-900">{title}</h3>
              <p className="mt-1.5 text-sm leading-relaxed text-stone-500">{text}</p>
            </AnimatedContent>
          ))}
        </div>
        <div className="mt-6 flex items-center gap-3 rounded-xl border border-cafe-100 bg-cafe-50 px-5 py-4 text-sm text-cafe-700">
          <BadgeCheck className="size-5 shrink-0" />
          ¿No tienes credencial institucional? Los visitantes se registran en la caseta de vigilancia con un pase temporal del día.
        </div>
      </section>

      <SiteFooter />
    </div>
  );
}

interface PortalCardProps {
  to: string;
  icon: LucideIcon;
  eyebrow: string;
  title: string;
  description: string;
  cta: string;
  accent: 'verde' | 'terracota';
}

function PortalCard({ to, icon: Icon, eyebrow, title, description, cta, accent }: PortalCardProps) {
  const verde = accent === 'verde';
  return (
    <Link to={to} className="group block rounded-2xl focus-visible:ring-4 focus-visible:ring-white/50 focus-visible:outline-none">
      <GlareHover
        width="100%"
        height="auto"
        background="var(--color-surface)"
        borderRadius="16px"
        borderColor="transparent"
        glareColor={verde ? '#8cc63f' : '#c9692f'}
        glareOpacity={0.16}
        glareSize={260}
        transitionDuration={800}
        className="shadow-2xl shadow-black/20 transition duration-300 group-hover:-translate-y-1"
      >
        <div className="flex w-full gap-5 p-6 text-left">
          <span className={`grid size-14 shrink-0 place-items-center rounded-xl text-white ${verde ? 'bg-brand' : 'bg-accent'}`}>
            <Icon className="size-7" />
          </span>
          <div className="min-w-0">
            <p className={`eyebrow ${verde ? 'text-verde-700' : 'text-terracota-600'}`}>{eyebrow}</p>
            <h2 className="mt-1 font-display text-xl font-extrabold text-stone-900">{title}</h2>
            <p className="mt-1.5 text-sm leading-relaxed text-stone-500">{description}</p>
            <span className={`mt-4 inline-flex items-center gap-1.5 text-sm font-semibold ${verde ? 'text-verde-700' : 'text-terracota-600'}`}>
              {verde && <LogIn className="size-4" />}
              {cta}
              <ArrowRight className="size-4 transition group-hover:translate-x-1" />
            </span>
          </div>
        </div>
      </GlareHover>
    </Link>
  );
}
