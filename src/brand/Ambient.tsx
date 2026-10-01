import type { CSSProperties } from 'react';

/**
 * Capas de ambiente para el fondo de marca: gotas de luz que suben despacio y destellos
 * que titilan. Son decorativas (aria-hidden), solo usan CSS y se detienen con
 * "reducir movimiento".
 */

/** Pseudoaleatorio estable: el fondo se ve igual en cada visita y no salta al recargar */
const rand = (seed: number) => {
  const x = Math.sin(seed * 9301 + 49297) * 233280;
  return x - Math.floor(x);
};

const DROPS = Array.from({ length: 16 }, (_, i) => ({
  left: rand(i + 1) * 100,
  size: 10 + rand(i + 21) * 46,
  duration: 16 + rand(i + 41) * 18,
  delay: -rand(i + 61) * 30,
  drift: (rand(i + 81) - 0.5) * 80,
  opacity: 0.12 + rand(i + 101) * 0.22,
  rest: 15 + rand(i + 121) * 95,
}));

const SPARKS = Array.from({ length: 28 }, (_, i) => ({
  left: rand(i + 201) * 100,
  top: rand(i + 221) * 92,
  size: 3 + rand(i + 241) * 7,
  duration: 2.6 + rand(i + 261) * 3.4,
  delay: -rand(i + 281) * 6,
  lime: rand(i + 301) > 0.6,
}));

export function Ambient() {
  return (
    <div aria-hidden="true" className="pointer-events-none absolute inset-0 overflow-hidden">
      {/* Resplandores lentos de color de marca */}
      <div className="ambient-glow absolute -top-1/4 -left-1/4 size-[70vmax] rounded-full bg-[radial-gradient(circle,rgb(140_198_63/0.35),transparent_60%)]" />
      <div className="ambient-glow ambient-glow-2 absolute -right-1/4 -bottom-1/3 size-[60vmax] rounded-full bg-[radial-gradient(circle,rgb(201_105_47/0.28),transparent_60%)]" />

      {/* Gotas de luz */}
      {DROPS.map((drop, i) => (
        <span
          key={`d${i}`}
          className="ambient-drop absolute bottom-[-10%] rounded-full"
          style={
            {
              left: `${drop.left}%`,
              width: drop.size,
              height: drop.size,
              opacity: drop.opacity,
              animationDuration: `${drop.duration}s`,
              animationDelay: `${drop.delay}s`,
              '--drift': `${drop.drift}px`,
              '--rest': `${drop.rest}vh`,
            } as CSSProperties
          }
        />
      ))}

      {/* Destellos */}
      {SPARKS.map((spark, i) => (
        <span
          key={`s${i}`}
          className={`ambient-spark absolute ${spark.lime ? 'text-[#c9ef8f]' : 'text-white'}`}
          style={{
            left: `${spark.left}%`,
            top: `${spark.top}%`,
            width: spark.size * 2,
            height: spark.size * 2,
            animationDuration: `${spark.duration}s`,
            animationDelay: `${spark.delay}s`,
          }}
        />
      ))}
    </div>
  );
}
