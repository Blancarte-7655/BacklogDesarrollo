import { Navigate, Route, Routes } from 'react-router-dom';
import Displays from './pages/Displays';
import PersonHistory from './pages/History';
import PersonHome from './pages/Home';
import Invitations from './pages/Invitations';
import PersonLogin from './pages/Login';
import More from './pages/More';
import Notifications from './pages/Notifications';
import PersonProfile from './pages/Profile';
import Schedule from './pages/Schedule';
import Station from './pages/Station';
import PersonLayout from './PersonLayout';
import { RequireSession, SessionProvider } from './session';

export default function PersonPortal() {
  return (
    <SessionProvider>
      <Routes>
        <Route path="entrar" element={<PersonLogin />} />
        <Route
          element={
            <RequireSession loginPath="/acceso/entrar">
              <PersonLayout />
            </RequireSession>
          }
        >
          <Route index element={<PersonHome />} />
          <Route path="horario" element={<Schedule />} />
          <Route path="historial" element={<PersonHistory />} />
          <Route path="equipo" element={<Station />} />
          <Route path="equipo/:code" element={<Station />} />
          <Route path="invitados" element={<Invitations />} />
          <Route path="pantallas" element={<Displays />} />
          <Route path="avisos" element={<Notifications />} />
          <Route path="perfil" element={<PersonProfile />} />
          <Route path="mas" element={<More />} />
        </Route>
        <Route path="*" element={<Navigate to="/acceso" replace />} />
      </Routes>
    </SessionProvider>
  );
}
