import { MotionConfig } from 'motion/react';
import { lazy, Suspense } from 'react';
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import Landing from './portals/Landing';
import { usePreferences } from './lib/preferences';
import { FullPageLoader } from './ui/Display';
import { ToastProvider } from './ui/ToastProvider';

// Cada portal se descarga por separado: quien registra su acceso nunca recibe el código del portal institucional
const PersonPortal = lazy(() => import('./portals/person/PersonPortal'));
const StaffPortal = lazy(() => import('./portals/staff/StaffPortal'));
const Privacy = lazy(() => import('./pages/Privacy'));
const Help = lazy(() => import('./pages/Help'));
const GuestInvitation = lazy(() => import('./pages/GuestInvitation'));
const DisplaySimulator = lazy(() => import('./pages/DisplaySimulator'));

export default function App() {
  const { motion } = usePreferences();
  return (
    // Las animaciones respetan "reducir movimiento" del sistema o de las Preferencias de lectura
    <MotionConfig reducedMotion={motion === 'reduce' ? 'always' : motion === 'full' ? 'never' : 'user'}>
      <BrowserRouter>
        <ToastProvider>
          <Suspense fallback={<FullPageLoader />}>
            <Routes>
              <Route path="/" element={<Landing />} />
              <Route path="/acceso/*" element={<PersonPortal />} />
              <Route path="/control/*" element={<StaffPortal />} />
              <Route path="/privacidad" element={<Privacy />} />
              <Route path="/ayuda" element={<Help />} />
              <Route path="/invitacion/:token" element={<GuestInvitation />} />
              <Route path="/pantalla/:roomId" element={<DisplaySimulator />} />
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </Suspense>
        </ToastProvider>
      </BrowserRouter>
    </MotionConfig>
  );
}
