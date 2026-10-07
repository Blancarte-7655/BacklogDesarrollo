import { Bell, CircleHelp, Ellipsis, UserRound } from 'lucide-react';
import { motion } from 'motion/react';
import { useState } from 'react';
import { Link, NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { ProductMark } from '../../brand/Logo';
import { PrivacyConsent } from '../../ui/PrivacyConsent';
import { ReadingPreferences } from '../../ui/ReadingPreferences';
import { UserMenu } from '../../ui/UserMenu';
import { PERSON_ROLE_LABELS } from '../../../shared/rules';
import { personApi } from './api';
import { sectionsFor, type PersonNavItem } from './components/personNav';
import { useNotificationFeed } from './components/useNotificationFeed';
import type { PersonOutletContext } from './context';
import { useSession } from './session';

const BOTTOM_PATHS = ['/acceso', '/acceso/horario', '/acceso/equipo', '/acceso/avisos'];

export default function PersonLayout() {
  const { user, signOut } = useSession();
  const person = user!;
  const navigate = useNavigate();
  const location = useLocation();
  const feed = useNotificationFeed();
  const [privacyAccepted, setPrivacyAccepted] = useState(person.privacyAccepted !== false);

  const sections = sectionsFor(person.role);
  const topNav = sections.filter(item => item.to !== '/acceso/avisos' && item.to !== '/acceso/perfil');
  const bottomNav: PersonNavItem[] = [
    ...sections.filter(item => BOTTOM_PATHS.includes(item.to)),
    { to: '/acceso/mas', label: 'Más', icon: Ellipsis, description: '' },
  ];

  const handleSignOut = async () => {
    await signOut();
    navigate('/acceso/entrar', { replace: true });
  };

  const context: PersonOutletContext = { notifications: feed.notifications, unread: feed.unread, refreshNotifications: feed.refresh };

  return (
    <div className="min-h-dvh bg-page">
      <a href="#contenido" className="skip-link">
        Saltar al contenido
      </a>
      <header className="sticky top-0 z-30 border-b border-stone-200 bg-surface/95 backdrop-blur">
        <div className="brand-stripe h-1" />
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-4 px-4 sm:px-6">
          <Link to="/acceso" className="shrink-0">
            <ProductMark label="UniAccess" />
          </Link>

          <nav aria-label="Navegación principal" className="hidden h-full items-center gap-0.5 lg:flex">
            {topNav.map(item => (
              <NavLink key={item.to} to={item.to} end={item.end} className="relative flex h-full items-center px-2.5 text-sm font-medium">
                {({ isActive }) => (
                  <>
                    <span className={`flex items-center gap-1.5 transition ${isActive ? 'text-verde-700' : 'text-stone-500 hover:text-stone-900'}`}>
                      <item.icon className="size-4" />
                      {item.label}
                    </span>
                    {isActive && <motion.span layoutId="person-nav" className="absolute inset-x-2 bottom-0 h-0.5 rounded-full bg-brand" />}
                  </>
                )}
              </NavLink>
            ))}
          </nav>

          <div className="flex items-center gap-1.5">
            <ReadingPreferences />
            <Link
              to="/acceso/avisos"
              className="relative rounded-lg p-2 text-stone-500 transition hover:bg-stone-100 hover:text-stone-900"
              aria-label={feed.unread ? `Avisos, ${feed.unread} sin leer` : 'Avisos'}
            >
              <Bell className="size-5" />
              {!!feed.unread && (
                <span className="absolute top-1 right-1 grid min-w-4 place-items-center rounded-full bg-accent px-1 text-[0.625rem] leading-4 font-bold text-white">
                  {feed.unread > 9 ? '9+' : feed.unread}
                </span>
              )}
            </Link>
            <UserMenu
              name={person.fullName}
              role={`${PERSON_ROLE_LABELS[person.role]} · ${person.code}`}
              detail={person.email}
              links={[
                { to: '/acceso/perfil', label: 'Mi perfil y biometría', icon: UserRound },
                { to: '/ayuda', label: 'Manual de usuario', icon: CircleHelp },
              ]}
              onSignOut={handleSignOut}
            />
          </div>
        </div>
      </header>

      <main id="contenido" tabIndex={-1} className="mx-auto max-w-5xl px-4 pt-6 pb-28 outline-none sm:px-6 lg:pb-14">
        <motion.div key={location.pathname} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }}>
          <Outlet context={context} />
        </motion.div>
      </main>

      {/* Navegación inferior en celular, que es donde se usa el portal */}
      <nav aria-label="Navegación principal" className="fixed inset-x-0 bottom-0 z-30 border-t border-stone-200 bg-surface/95 pb-[env(safe-area-inset-bottom)] backdrop-blur lg:hidden">
        <div className="grid" style={{ gridTemplateColumns: `repeat(${bottomNav.length}, minmax(0, 1fr))` }}>
          {bottomNav.map(item => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              className={({ isActive }) =>
                `relative flex min-h-14 flex-col items-center justify-center gap-1 py-2 text-xs font-semibold transition ${isActive ? 'text-verde-700' : 'text-stone-500'}`
              }
            >
              <item.icon className="size-5" />
              {item.label}
              {item.to === '/acceso/avisos' && !!feed.unread && <span className="absolute top-2 left-1/2 ml-2 size-2 rounded-full bg-accent" />}
            </NavLink>
          ))}
        </div>
      </nav>

      <PrivacyConsent
        audience="person"
        open={!privacyAccepted}
        onAccept={async () => {
          await personApi.acceptPrivacy();
          setPrivacyAccepted(true);
        }}
        onSignOut={() => void handleSignOut()}
      />
    </div>
  );
}
