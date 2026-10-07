/** Extrae el código de una liga escaneada (…/equipo/K7QX2M) o limpia lo que se escribió a mano */
export function codeFromScan(text: string): string {
  const trimmed = text.trim();
  const fromUrl = /\/([A-Za-z0-9]{4,12})\/?$/.exec(trimmed)?.[1];
  return (fromUrl ?? trimmed).replace(/[^A-Za-z0-9]/g, '').toUpperCase();
}
