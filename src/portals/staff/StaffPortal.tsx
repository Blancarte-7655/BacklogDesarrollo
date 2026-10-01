import type { ReactNode } from 'react';
import { Navigate, Route, Routes } from 'react-router-dom';
import AccessPoints from './pages/AccessPoints';
import Alerts from './pages/Alerts';
import Dashboard from './pages/Dashboard';
import Guests from './pages/Guests';
import Network from './pages/Network';
import StaffLogin from './pages/Login';
import Operators from './pages/Operators';
import People from './pages/People';
import Records from './pages/Records';
import { RequireSession, SessionProvider, useSession } from './session';
import StaffLayout from './StaffLayout';

function AdminOnly({ children }: { children: ReactNode }) {
  const { user } = useSession();
  return user?.role === 'admin' ? children : <Navigate to="/control" replace />;
}

export default function StaffPortal() {
  return (
    <SessionProvider>
      <Routes>
        <Route path="entrar" element={<StaffLogin />} />
        <Route
          element={
            <RequireSession loginPath="/control/entrar">
              <StaffLayout />
            </RequireSession>
          }
        >
          <Route index element={<Dashboard />} />
          <Route path="registros" element={<Records />} />
          <Route path="invitados" element={<Guests />} />
          <Route path="alertas" element={<Alerts />} />
          <Route
            path="personas"
            element={
              <AdminOnly>
                <People />
              </AdminOnly>
            }
          />
          <Route
            path="accesos"
            element={
              <AdminOnly>
                <AccessPoints />
              </AdminOnly>
            }
          />
          <Route
            path="redes"
            element={
              <AdminOnly>
                <Network />
              </AdminOnly>
            }
          />
          <Route
            path="operadores"
            element={
              <AdminOnly>
                <Operators />
              </AdminOnly>
            }
          />
        </Route>
        <Route path="*" element={<Navigate to="/control" replace />} />
      </Routes>
    </SessionProvider>
  );
}
