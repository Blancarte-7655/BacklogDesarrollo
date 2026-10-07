import { FileText, Printer } from 'lucide-react';
import type { ReactNode } from 'react';
import { PRIVACY_VERSION } from '../../shared/campus';
import { PublicShell } from '../brand/PublicShell';
import { Button } from '../ui/Button';

const SECTIONS: Array<{ id: string; title: string; body: ReactNode }> = [
  {
    id: 'responsable',
    title: '1. Quién es responsable de tus datos',
    body: (
      <p>
        La Universidad de Guadalajara, a través del Centro Universitario de Tlaquepaque (CUTlaquepaque) y su Coordinación de Seguridad y Accesos, es
        responsable del tratamiento de los datos personales que se recaban en UniAccess. Como institución pública, la Universidad aplica la Ley de
        Protección de Datos Personales en Posesión de Sujetos Obligados del Estado de Jalisco y sus Municipios y la Ley General de Protección de Datos
        Personales en Posesión de Sujetos Obligados.
      </p>
    ),
  },
  {
    id: 'datos',
    title: '2. Qué datos usamos',
    body: (
      <ul className="list-disc space-y-1.5 pl-5">
        <li>
          <b>Identificación:</b> nombre, código o matrícula, correo institucional, tipo de persona (alumno, docente o personal), carrera o área y vigencia
          de la credencial.
        </li>
        <li>
          <b>Accesos:</b> fecha y hora de cada entrada y salida, el acceso utilizado y, cuando el acceso tiene geocerca, la ubicación reportada en ese momento.
        </li>
        <li>
          <b>Dispositivo biométrico:</b> solo una <b>llave pública</b> que identifica a tu celular. Tu huella o tu rostro <b>nunca salen de tu teléfono</b>{' '}
          y UniAccess no los recibe ni los guarda.
        </li>
        <li>
          <b>Horario:</b> materias, salones y horarios, cuando el sistema se conecte con Control Escolar. En esta demostración el horario es ficticio.
        </li>
        <li>
          <b>Laboratorios:</b> qué equipo usaste, de qué hora a qué hora y las fallas reportadas sobre ese equipo.
        </li>
        <li>
          <b>Invitados:</b> nombre, motivo de la visita y, si se proporciona, correo para enviarle su invitación.
        </li>
        <li>
          <b>Datos técnicos:</b> dirección IP y bitácora de acciones, para seguridad y auditoría.
        </li>
      </ul>
    ),
  },
  {
    id: 'finalidades',
    title: '3. Para qué los usamos',
    body: (
      <>
        <p className="font-semibold text-stone-800">Finalidades necesarias:</p>
        <ul className="mt-1 list-disc space-y-1.5 pl-5">
          <li>Registrar quién entra y sale del campus y cuánto tiempo permanece.</li>
          <li>Saber quién está dentro en caso de emergencia o simulacro (lista de evacuación).</li>
          <li>Emitir y validar pases e invitaciones para visitantes.</li>
          <li>Registrar el uso de los equipos de laboratorio y dar seguimiento a daños o mal uso.</li>
          <li>Generar reportes estadísticos para planear vigilancia, horarios y espacios.</li>
        </ul>
        <p className="mt-3 font-semibold text-stone-800">Finalidades adicionales (puedes negarte sin perder el servicio):</p>
        <ul className="mt-1 list-disc space-y-1.5 pl-5">
          <li>Enviarte avisos al celular (credencial por vencer, invitado que llegó, salida olvidada).</li>
        </ul>
      </>
    ),
  },
  {
    id: 'no-hacemos',
    title: '4. Lo que UniAccess no hace',
    body: (
      <ul className="list-disc space-y-1.5 pl-5">
        <li>No rastrea tu ubicación: solo la consulta en el momento de registrar tu acceso.</li>
        <li>No guarda huellas, fotografías del rostro ni datos biométricos.</li>
        <li>No usa los registros para calificar ni sancionar asistencia a clases.</li>
        <li>No vende ni comparte tus datos con fines comerciales.</li>
      </ul>
    ),
  },
  {
    id: 'transferencias',
    title: '5. Con quién se comparten',
    body: (
      <p>
        Solo con las áreas de la Universidad que los necesitan para las finalidades anteriores (vigilancia, Control Escolar y la coordinación del centro)
        y con autoridades competentes cuando exista un requerimiento fundado y motivado o una emergencia que ponga en riesgo la vida o la integridad de las
        personas.
      </p>
    ),
  },
  {
    id: 'conservacion',
    title: '6. Cuánto tiempo se guardan',
    body: (
      <p>
        Los registros de acceso y uso de equipos se conservan durante el ciclo escolar en curso y hasta un año después; los pases e invitaciones, 90 días.
        Después se eliminan o se conservan solo como estadística sin datos que identifiquen a las personas.
      </p>
    ),
  },
  {
    id: 'arco',
    title: '7. Tus derechos (ARCO)',
    body: (
      <p>
        Puedes solicitar el <b>acceso</b>, la <b>rectificación</b>, la <b>cancelación</b> o la <b>oposición</b> al tratamiento de tus datos, así como su
        portabilidad, ante la Unidad de Transparencia de la Universidad de Guadalajara o mediante la Plataforma Nacional de Transparencia. También puedes
        desvincular tu dispositivo biométrico en cualquier momento desde <b>Mi perfil</b>.
      </p>
    ),
  },
  {
    id: 'cambios',
    title: '8. Cambios a este aviso',
    body: (
      <p>
        Cualquier cambio se publicará en esta página y UniAccess te pedirá aceptarlo de nuevo la siguiente vez que entres. Versión vigente:{' '}
        <b className="font-mono">{PRIVACY_VERSION}</b>.
      </p>
    ),
  },
];

export default function Privacy() {
  return (
    <PublicShell eyebrow="Protección de datos personales" title="Aviso de privacidad" description="Qué datos usa UniAccess, para qué y cómo ejercer tus derechos.">
      <article className="card p-6 sm:p-8">
        <div className="no-print mb-6 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          <span className="flex items-center gap-2">
            <FileText className="size-4 shrink-0" />
            Borrador para la demostración: debe validarlo la Unidad de Transparencia de la Universidad antes de usarse en producción.
          </span>
          <Button size="sm" icon={<Printer className="size-3.5" />} onClick={() => window.print()}>
            Imprimir
          </Button>
        </div>

        <nav aria-label="Contenido del aviso" className="no-print mb-8 flex flex-wrap gap-2">
          {SECTIONS.map(section => (
            <a key={section.id} href={`#${section.id}`} className="rounded-full bg-stone-100 px-3 py-1 text-xs font-medium text-stone-600 hover:bg-verde-50 hover:text-verde-700">
              {section.title.replace(/^\d+\.\s*/, '')}
            </a>
          ))}
        </nav>

        <div className="space-y-7 text-[0.9375rem] leading-relaxed text-stone-600">
          {SECTIONS.map(section => (
            <section key={section.id} id={section.id} className="print-break scroll-mt-6">
              <h2 className="mb-2 font-display text-lg font-bold text-stone-900">{section.title}</h2>
              {section.body}
            </section>
          ))}
        </div>
      </article>
    </PublicShell>
  );
}
