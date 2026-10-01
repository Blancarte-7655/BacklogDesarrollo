import { History, House, UserRound } from 'lucide-react';
import { motion } from 'motion/react';
import { Link, NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { ProductMark } from '../../brand/Logo';
import { ReadingPreferences } from '../../ui/ReadingPreferences';
import { UserMenu } from '../../ui/UserMenu';
import { PERSON_ROLE_LABELS } from '../../../shared/rules';
import { useSession } from './session';

const NAV = [
  { to: '/acceso', label: 'Inicio', icon: House, end: true },
  { to: '/acceso/historial', label: 'Historial', icon: History, end: false },
  { to: '/acceso/perfil', label: 'Mi perfil', icon: UserRound, end: false },
];

export default function PersonLayout() {
  const { user, signOut } = useSession();
  const navigate = useNavigate();
  const location = useLocation();

  const handleSignOut = async () => {
    await signOut();
    navigate('/acceso/entrar', { replace: true });
  };

  return (
    <div className="min-h-dvh bg-page">
      <a href="#contenido" className="skip-link">
        Saltar al contenido
      </a>
      <header className="sticky top-0 z-30 border-b border-stone-200 bg-surface/95 backdrop-blur">
        <div className="brand-stripe h-1" />
        <div className="mx-auto flex h-16 max-w-5xl items-center justify-between gap-4 px-4 sm:px-6">
          <Link to="/acceso" className="shrink-0">
            <ProductMark label="UniAccess" />
          </Link>

          <nav aria-label="Navegación principal" className="hidden h-full items-center gap-1 md:flex">
            {NAV.map(item => (
              <NavLink key={item.to} to={item.to} end={item.end} className="relative flex h-full items-center px-3 text-sm font-medium">
                {({ isActive }) => (
                  <>
                    <span className={`flex items-center gap-2 transition ${isActive ? 'text-verde-700' : 'text-stone-500 hover:text-stone-900'}`}>
                      <item.icon className="size-4" />
                      {item.label}
                    </span>
                    {isActive && <motion.span layoutId="person-nav" className="absolute inset-x-2 bottom-0 h-0.5 rounded-full bg-brand" />}
                  </>
                )}
              </NavLink>
            ))}
          </nav>

          <div className="flex items-center gap-2">
          <ReadingPreferences />
          <UserMenu
            name={user!.fullName}
            role={`${PERSON_ROLE_LABELS[user!.role]} · ${user!.code}`}
            detail={user!.email}
            links={[{ to: '/acceso/perfil', label: 'Mi perfil y biometría', icon: UserRound }]}
            onSignOut={handleSignOut}
          />
          </div>
        </div>
      </header>

      <main id="contenido" tabIndex={-1} className="mx-auto max-w-5xl outline-none px-4 pt-6 pb-28 sm:px-6 md:pb-14">
        <motion.div key={location.pathname} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }}>
          <Outlet />
        </motion.div>
      </main>

      {/* Navegación inferior en celular, que es donde se usa el portal */}
      <nav aria-label="Navegación principal" className="fixed inset-x-0 bottom-0 z-30 border-t border-stone-200 bg-surface/95 pb-[env(safe-area-inset-bottom)] backdrop-blur md:hidden">
        <div className="grid grid-cols-3">
          {NAV.map(item => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              className={({ isActive }) =>
                `flex min-h-14 flex-col items-center justify-center gap-1 py-2 text-xs font-semibold transition ${isActive ? 'text-verde-700' : 'text-stone-500'}`
              }
            >
              <item.icon className="size-5" />
              {item.label}
            </NavLink>
          ))}
        </div>
      </nav>
    </div>
  );
}
