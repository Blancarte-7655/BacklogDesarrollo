import { Camera, CameraOff } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { Button } from './Button';
import { Modal, ModalBody } from './Modal';

// BarcodeDetector aún no está en los tipos de TypeScript (Chrome y Edge en Android y escritorio lo incluyen)
interface DetectedBarcode {
  rawValue: string;
}
interface BarcodeDetectorLike {
  detect(source: HTMLVideoElement): Promise<DetectedBarcode[]>;
}
type BarcodeDetectorConstructor = new (options: { formats: string[] }) => BarcodeDetectorLike;

const Detector = (globalThis as { BarcodeDetector?: BarcodeDetectorConstructor }).BarcodeDetector;
export const canScanQr = typeof Detector === 'function' && typeof navigator !== 'undefined' && !!navigator.mediaDevices;

interface QrScannerProps {
  open: boolean;
  onClose: () => void;
  onResult: (text: string) => void;
  title?: string;
}

/** Lee un código QR con la cámara (sin librerías: usa el detector del navegador) */
export function QrScanner({ open, onClose, onResult, title = 'Escanear código QR' }: QrScannerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [error, setError] = useState<string | null>(null);
  const resultRef = useRef(onResult);
  resultRef.current = onResult;

  useEffect(() => {
    if (!open || !Detector) return;
    let stream: MediaStream | null = null;
    let frame = 0;
    let stopped = false;
    const detector = new Detector({ formats: ['qr_code'] });

    const scan = async () => {
      if (stopped || !videoRef.current) return;
      try {
        const [code] = await detector.detect(videoRef.current);
        if (code?.rawValue) {
          stopped = true;
          resultRef.current(code.rawValue);
          return;
        }
      } catch {
        // el cuadro aún no está listo
      }
      frame = window.setTimeout(() => void scan(), 250);
    };

    setError(null);
    navigator.mediaDevices
      .getUserMedia({ video: { facingMode: 'environment' }, audio: false })
      .then(media => {
        if (stopped) {
          media.getTracks().forEach(track => track.stop());
          return;
        }
        stream = media;
        if (videoRef.current) {
          videoRef.current.srcObject = media;
          void videoRef.current.play();
        }
        void scan();
      })
      .catch(() => setError('No se pudo abrir la cámara. Revisa el permiso del navegador o escribe el código.'));

    return () => {
      stopped = true;
      clearTimeout(frame);
      stream?.getTracks().forEach(track => track.stop());
    };
  }, [open]);

  return (
    <Modal open={open} onClose={onClose} title={title} description="Apunta la cámara al código." size="sm">
      <ModalBody>
        {error ? (
          <p className="flex flex-col items-center gap-3 py-8 text-center text-sm text-stone-600">
            <CameraOff className="size-8 text-stone-400" />
            {error}
          </p>
        ) : (
          <div className="relative overflow-hidden rounded-xl bg-black">
            <video ref={videoRef} className="aspect-square w-full object-cover" muted playsInline />
            <div className="pointer-events-none absolute inset-[18%] rounded-2xl border-4 border-white/80 shadow-[0_0_0_999px_rgb(0_0_0/0.35)]" />
          </div>
        )}
        <Button className="mt-4 w-full" onClick={onClose}>
          Cancelar
        </Button>
      </ModalBody>
    </Modal>
  );
}

export function ScanButton({ onClick, label = 'Escanear' }: { onClick: () => void; label?: string }) {
  if (!canScanQr) return null;
  return (
    <Button icon={<Camera className="size-4" />} onClick={onClick}>
      {label}
    </Button>
  );
}
