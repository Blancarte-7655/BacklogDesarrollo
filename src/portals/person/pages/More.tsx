import { ChevronRight } from 'lucide-react';
import { Link } from 'react-router-dom';
import { PageHeader } from '../../../ui/Display';
import { EXTRA_LINKS, sectionsFor, type PersonNavItem } from '../components/personNav';
import { useSession } from '../session';

/** Menú completo en celular (la barra inferior solo tiene las secciones principales) */
export default function More() {
  const { user } = useSession();
  const sections = sectionsFor(user!.role).filter(item => item.to !== '/acceso');
  return (
    <>
      <PageHeader eyebrow="Menú" title="Todas las secciones" />
      <LinkList items={sections} />
      <p className="mt-6 mb-2 text-xs font-semibold text-stone-500">Ayuda</p>
      <LinkList items={EXTRA_LINKS} />
    </>
  );
}

function LinkList({ items }: { items: PersonNavItem[] }) {
  return (
    <ul className="card divide-y divide-stone-100">
      {items.map(item => (
        <li key={item.to}>
          <Link to={item.to} className="flex items-center gap-3 px-5 py-3.5 transition hover:bg-stone-50">
            <span className="grid size-9 place-items-center rounded-lg bg-verde-50 text-verde-700">
              <item.icon className="size-4" />
            </span>
            <span className="flex-1">
              <span className="block font-semibold text-stone-900">{item.label}</span>
              <span className="block text-xs text-stone-500">{item.description}</span>
            </span>
            <ChevronRight className="size-4 text-stone-400" />
          </Link>
        </li>
      ))}
    </ul>
  );
}
