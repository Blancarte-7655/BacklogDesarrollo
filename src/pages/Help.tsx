import { ArrowLeft, ArrowRight, Check, ChevronDown, CircleHelp, Search } from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';
import { useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { PublicShell } from '../brand/PublicShell';
import { normalize } from '../lib/text';
import { Button, buttonStyles } from '../ui/Button';
import { IconInput } from '../ui/Inputs';
import { Segmented } from '../ui/Segmented';
import { HELP_FAQ, HELP_GUIDES, HELP_ROLES, type HelpGuide, type HelpRole } from './helpContent';

/** Manual de usuario interactivo: guías paso a paso por tipo de usuario, con buscador */
export default function Help() {
  const [params, setParams] = useSearchParams();
  const role = (HELP_ROLES.find(r => r.value === params.get('rol'))?.value ?? 'alumno') as HelpRole;
  const [search, setSearch] = useState('');
  const [open, setOpen] = useState<string | null>(null);

  const guides = useMemo(() => {
    const term = normalize(search.trim());
    return HELP_GUIDES.filter(guide => guide.roles.includes(role)).filter(
      guide => !term || normalize([guide.title, guide.summary, ...guide.steps.map(s => `${s.title} ${s.text}`)].join(' ')).includes(term),
    );
  }, [role, search]);
  const faq = HELP_FAQ.filter(item => !item.roles || item.roles.includes(role));

  return (
    <PublicShell eyebrow="Ayuda" title="Manual de usuario" description="Elige qué tipo de usuario eres y sigue cada guía paso a paso.">
      <div className="card p-4 sm:p-5">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <Segmented
            id="help-role"
            options={HELP_ROLES}
            value={role}
            onChange={value => {
              setParams({ rol: value }, { replace: true });
              setOpen(null);
            }}
          />
          <div className="sm:w-72">
            <IconInput icon={Search} value={search} onChange={event => setSearch(event.target.value)} placeholder="Buscar: QR, horario, equipo…" aria-label="Buscar en el manual" />
          </div>
        </div>
      </div>

      <div className="mt-5 space-y-3">
        {guides.map(guide => (
          <GuideCard key={guide.id} guide={guide} open={open === guide.id} onToggle={() => setOpen(current => (current === guide.id ? null : guide.id))} />
        ))}
        {!guides.length && <p className="card px-5 py-10 text-center text-sm text-stone-500">No encontramos guías con "{search}". Prueba con otra palabra.</p>}
      </div>

      <section className="mt-10">
        <h2 className="flex items-center gap-2 font-display text-xl font-bold text-stone-900">
          <CircleHelp className="size-5 text-verde-700" />
          Preguntas frecuentes
        </h2>
        <div className="card mt-3 divide-y divide-stone-100">
          {faq.map(item => (
            <details key={item.q} className="group px-5 py-4">
              <summary className="flex cursor-pointer list-none items-center justify-between gap-3 font-semibold text-stone-800">
                {item.q}
                <ChevronDown className="size-4 shrink-0 text-stone-400 transition group-open:rotate-180" />
              </summary>
              <p className="mt-2 text-sm leading-relaxed text-stone-600">{item.a}</p>
            </details>
          ))}
        </div>
        <p className="mt-4 text-sm text-stone-500">
          ¿Dudas sobre tus datos? Consulta el{' '}
          <Link to="/privacidad" className="font-semibold text-verde-700 hover:underline">
            aviso de privacidad
          </Link>
          .
        </p>
      </section>
    </PublicShell>
  );
}

function GuideCard({ guide, open, onToggle }: { guide: HelpGuide; open: boolean; onToggle: () => void }) {
  const [step, setStep] = useState(0);
  const last = step === guide.steps.length - 1;
  const current = guide.steps[step];

  return (
    <article className={`card overflow-hidden transition ${open ? 'ring-2 ring-brand/20' : ''}`}>
      <button type="button" onClick={onToggle} aria-expanded={open} className="flex w-full items-center gap-4 px-5 py-4 text-left">
        <span className="grid size-10 shrink-0 place-items-center rounded-lg bg-verde-50 font-display font-bold text-verde-700">{guide.steps.length}</span>
        <span className="min-w-0 flex-1">
          <span className="block font-display font-bold text-stone-900">{guide.title}</span>
          <span className="block text-sm text-stone-500">{guide.summary}</span>
        </span>
        <ChevronDown className={`size-5 shrink-0 text-stone-400 transition ${open ? 'rotate-180' : ''}`} />
      </button>

      <AnimatePresence initial={false}>
        {open && (
          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
            <div className="border-t border-stone-100 px-5 py-5">
              {/* Indicador de pasos */}
              <ol className="flex gap-1.5" aria-label="Pasos">
                {guide.steps.map((s, index) => (
                  <li key={s.title} className="flex-1">
                    <button
                      type="button"
                      onClick={() => setStep(index)}
                      aria-label={`Paso ${index + 1}: ${s.title}`}
                      aria-current={index === step ? 'step' : undefined}
                      className={`h-1.5 w-full rounded-full transition ${index <= step ? 'bg-brand' : 'bg-stone-200'}`}
                    />
                  </li>
                ))}
              </ol>

              <div className="mt-5 flex gap-4" aria-live="polite">
                <span className="grid size-9 shrink-0 place-items-center rounded-full bg-brand font-display text-sm font-bold text-white">{step + 1}</span>
                <div>
                  <p className="text-xs font-semibold text-stone-500">
                    Paso {step + 1} de {guide.steps.length}
                  </p>
                  <h3 className="font-display text-lg font-bold text-stone-900">{current.title}</h3>
                  <p className="mt-1 text-sm leading-relaxed text-stone-600">{current.text}</p>
                </div>
              </div>

              <div className="mt-6 flex flex-wrap items-center justify-between gap-2">
                <Button size="sm" variant="ghost" icon={<ArrowLeft className="size-3.5" />} disabled={step === 0} onClick={() => setStep(s => s - 1)}>
                  Anterior
                </Button>
                <div className="flex flex-wrap gap-2">
                  {guide.link && (
                    <Link to={guide.link.to} className={buttonStyles('secondary', 'sm')}>
                      {guide.link.label}
                    </Link>
                  )}
                  {last ? (
                    <Button size="sm" variant="primary" icon={<Check className="size-3.5" />} onClick={() => setStep(0)}>
                      Listo
                    </Button>
                  ) : (
                    <Button size="sm" variant="primary" onClick={() => setStep(s => s + 1)}>
                      Siguiente
                      <ArrowRight className="size-3.5" />
                    </Button>
                  )}
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </article>
  );
}
