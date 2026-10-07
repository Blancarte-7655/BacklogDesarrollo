import { useMemo } from 'react';
import { encodeQr, qrSvgPath } from '../../shared/qr';

interface QrCodeProps {
  value: string;
  /** Tamaño en píxeles del lado */
  size?: number;
  label: string;
  className?: string;
}

/** Código QR dibujado como SVG (siempre en negro sobre blanco para que lo lea cualquier cámara) */
export function QrCode({ value, size = 200, label, className = '' }: QrCodeProps) {
  const { path, size: modules } = useMemo(() => qrSvgPath(encodeQr(value)), [value]);
  return (
    <svg
      role="img"
      aria-label={label}
      width={size}
      height={size}
      viewBox={`0 0 ${modules} ${modules}`}
      shapeRendering="crispEdges"
      className={`rounded-lg bg-white ${className}`}
    >
      <rect width={modules} height={modules} fill="#ffffff" />
      <path d={path} fill="#111111" />
    </svg>
  );
}
