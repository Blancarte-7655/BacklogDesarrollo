/** Color estable por materia para distinguirlas en el horario */
// Solo paletas que tienen variante para el modo oscuro
const TONES = [
  'bg-verde-50 text-verde-800 ring-verde-200',
  'bg-terracota-50 text-terracota-800 ring-terracota-200',
  'bg-sky-50 text-sky-700 ring-sky-200',
  'bg-amber-50 text-amber-800 ring-amber-200',
  'bg-cafe-50 text-cafe-800 ring-cafe-100',
];

export function classTone(subject: string) {
  let hash = 0;
  for (const char of subject) hash = (hash * 31 + char.charCodeAt(0)) >>> 0;
  return TONES[hash % TONES.length];
}
