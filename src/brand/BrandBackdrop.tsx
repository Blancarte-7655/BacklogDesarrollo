import Threads from '../components/reactbits/Threads/Threads';
import { Ambient } from './Ambient';

/** Fondo institucional animado para la portada y las pantallas de acceso */
export function BrandBackdrop({ variant = 'person' }: { variant?: 'person' | 'staff' }) {
  return (
    <div aria-hidden="true" className="pointer-events-none absolute inset-0 -z-10 overflow-hidden">
      <div className={`absolute inset-0 ${variant === 'staff' ? 'brand-hero-admin' : 'brand-hero'}`} />
      <Ambient />
      {/* Ondas: dos capas con distinta amplitud para dar profundidad */}
      <div className="absolute inset-x-0 bottom-0 h-[90%] opacity-55 mix-blend-soft-light">
        <Threads color={[1, 1, 1]} amplitude={1.4} distance={0.2} />
      </div>
      <div className="absolute inset-x-0 top-0 h-[60%] -scale-y-100 opacity-30 mix-blend-overlay">
        <Threads color={[0.75, 0.95, 0.5]} amplitude={0.8} distance={0.05} />
      </div>
      <div className="absolute inset-0 bg-[linear-gradient(to_bottom,transparent_55%,rgb(0_0_0/0.18))]" />
    </div>
  );
}
