import { motion } from 'motion/react';
import { useId } from 'react';
import { useReduceMotion } from '../hooks/useReduceMotion';

/**
 * Guirnalda de papel picado: el detalle de identidad de UniAccess.
 * Tlaquepaque es tierra de artesanía; las banderitas usan los colores del logotipo
 * (verde, lima, barro y café) y se repiten a lo ancho sin deformarse.
 * Es decorativa: el lector de pantalla la ignora.
 */

const PALETTES = {
  /** Sobre fondos verdes de marca */
  onBrand: ['#8cc63f', '#ffffff', '#de7d45', '#f1e3c8'],
  /** Sobre fondos claros u oscuros de la interfaz */
  surface: ['#1e6b3a', '#8cc63f', '#c9692f', '#684730'],
} as const;

interface PapelPicadoProps {
  /** Alto de cada banderita en píxeles */
  size?: number;
  palette?: keyof typeof PALETTES;
  className?: string;
  /** Hilo del que cuelgan las banderitas */
  string?: boolean;
}

export function PapelPicado({ size = 56, palette = 'surface', className = '', string = true }: PapelPicadoProps) {
  const id = useId().replace(/:/g, '');
  const reduceMotion = useReduceMotion();
  const colors = PALETTES[palette];

  // Geometría en una banderita de 40 × 48 unidades, escalada a "size"
  const w = 40;
  const h = 48;
  const gap = 5;
  const step = w + gap;
  const scale = size / h;
  const top = string ? 3 : 0;

  // Borde inferior en picos, como el papel recortado a mano
  const peaks = 5;
  const bottom = Array.from({ length: peaks }, (_, k) => {
    const i = peaks - 1 - k;
    return `L${((i + 0.5) * w) / peaks},${h} L${(i * w) / peaks},${h - 5}`;
  }).join(' ');
  const flagPath = `M0,0 H${w} V${h - 5} ${bottom} Z`;

  // Recortes: cada banderita lleva un motivo distinto
  const motifs = [
    // Flor
    <g key="flor">
      <circle cx={20} cy={22} r={3.2} />
      {[0, 60, 120, 180, 240, 300].map(angle => (
        <ellipse key={angle} cx={20} cy={14.5} rx={2.4} ry={4.6} transform={`rotate(${angle} 20 22)`} />
      ))}
    </g>,
    // Rombo calado
    <g key="rombo">
      <path d="M20 10 L30 22 L20 34 L10 22 Z" />
      <path d="M20 16 L25 22 L20 28 L15 22 Z" fill="white" />
      <circle cx={20} cy={22} r={1.8} />
    </g>,
    // Sol
    <g key="sol">
      <circle cx={20} cy={22} r={5.5} />
      {Array.from({ length: 12 }, (_, i) => i * 30).map(angle => (
        <rect key={angle} x={19.1} y={10} width={1.8} height={4.5} transform={`rotate(${angle} 20 22)`} />
      ))}
    </g>,
    // Corazón
    <path key="corazon" d="M20 31 C11 24 12 15 17 15 C19 15 20 17 20 18 C20 17 21 15 23 15 C28 15 29 24 20 31 Z" />,
  ];

  const patternWidth = step * motifs.length;

  return (
    <motion.svg
      aria-hidden="true"
      focusable="false"
      className={`block w-full ${className}`}
      height={(h + top) * scale}
      initial={reduceMotion ? false : { y: -(h + top) * scale, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ type: 'spring', stiffness: 120, damping: 14, delay: 0.15 }}
    >
      <defs>
        {motifs.map((motif, index) => (
          <mask key={index} id={`${id}-m${index}`} maskUnits="userSpaceOnUse" x={0} y={0} width={w} height={h}>
            <path d={flagPath} fill="white" />
            <g fill="black">
              {/* Encaje superior y fila de picos interiores */}
              {[6, 13, 20, 27, 34].map(x => (
                <circle key={x} cx={x} cy={5} r={1.3} />
              ))}
              {[4, 12, 20, 28, 36].map(x => (
                <path key={x} d={`M${x - 2.5} 38 L${x} 34.5 L${x + 2.5} 38 Z`} />
              ))}
              {motif}
            </g>
          </mask>
        ))}
        <pattern
          id={`${id}-p`}
          patternUnits="userSpaceOnUse"
          width={patternWidth * scale}
          height={(h + top) * scale}
          viewBox={`0 0 ${patternWidth} ${h + top}`}
        >
          {motifs.map((_, index) => (
            <g key={index} transform={`translate(${index * step + gap / 2} ${top})`}>
              <rect width={w} height={h} fill={colors[index % colors.length]} mask={`url(#${id}-m${index})`} />
            </g>
          ))}
        </pattern>
      </defs>
      {string && <line x1="0" x2="100%" y1={top * scale * 0.6} y2={top * scale * 0.6} stroke="currentColor" strokeOpacity={0.35} strokeWidth={1.2} />}
      <rect width="100%" height="100%" fill={`url(#${id}-p)`} />
    </motion.svg>
  );
}
