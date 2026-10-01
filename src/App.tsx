import { MotionConfig } from 'motion/react';
import { lazy, Suspense } from 'react';
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import Landing from './portals/Landing';
import { FullPageLoader } from './ui/Display';
import { ToastProvider } from './ui/ToastProvider';

// Cada portal se descarga por separado: quien registra su acceso nunca recibe el código del portal institucional
const PersonPortal = lazy(() => import('./portals/person/PersonPortal'));
const StaffPortal = lazy(() => import('./portals/staff/StaffPortal'));

export default function App() {
  return (
    // reducedMotion="user": si la persona pidió reducir el movimiento en su sistema, las animaciones lo respetan
    <MotionConfig reducedMotion="user">
      <BrowserRouter>
        <ToastProvider>
          <Suspense fallback={<FullPageLoader />}>
            <Routes>
              <Route path="/" element={<Landing />} />
              <Route path="/acceso/*" element={<PersonPortal />} />
              <Route path="/control/*" element={<StaffPortal />} />
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </Suspense>
        </ToastProvider>
      </BrowserRouter>
    </MotionConfig>
  );
}
