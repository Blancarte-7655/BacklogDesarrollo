import { Bell, ClipboardList, DoorOpen, LayoutDashboard, Mail, MailWarning, Menu, ShieldCheck, UserRoundPlus, Users, UsersRound, Wifi, X, type LucideIcon } from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';
import { useState } from 'react';
import { Link, NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { Ambient } from '../../brand/Ambient';
import { Wordmark } from '../../brand/Logo';
import { useAsync } from '../../hooks/useAsync';
import { STAFF_ROLE_LABELS } from '../../../shared/rules';
import { ReadingPreferences } from '../../ui/ReadingPreferences';
import { UserMenu } from '../../ui/UserMenu';
import { staffApi } from './api';
import type { StaffOutletContext } from './context';
import { useSession } from './session';

interface NavItem {
  to: string;
  label: string;
  icon: LucideIcon;
  end?: boolean;
  badge?: number;
}

export default function StaffLayout() {
  const { user, signOut } = useSession();
  const staff = user!;
  const navigate = useNavigate();
  const location = useLocation();
  const [drawerOpen, setDrawerOpen] = useState(false);
  const alerts = useAsync(() => staffApi.alertSummary(), [], { pollMs: 30_000 });
  const meta = useAsync(() => staffApi.meta(), []);

  const handleSignOut = async () => {
    await signOut();
    navigate('/control/entrar', { replace: true });
  };

  const groups: Array<{ title: string; items: NavItem[] }> = [
    {
      title: 'Operación',
      items: [
        { to: '/control', label: 'Tablero', icon: LayoutDashboard, end: true },
        { to: '/control/registros', label: 'Registros', icon: ClipboardList },
        { to: '/control/invitados', label: 'Invitados', icon: UsersRound },
        { to: '/control/alertas', label: 'Alertas', icon: Bell, badge: alerts.data?.unread },
      ],
    },
    ...(staff.role === 'admin'
      ? [
          {
            title: 'Administración',
            items: [
              { to: '/control/personas', label: 'Personas', icon: Users },
              { to: '/control/accesos', label: 'Accesos', icon: DoorOpen },
              { to: '/control/operadores', label: 'Operadores', icon: ShieldCheck },
              { to: '/control/redes', label: 'Redes permitidas', icon: Wifi },
            ],
          },
        ]
      : []),
  ];

  const context: StaffOutletContext = {
    staff,
    meta: meta.data,
    alerts: alerts.data,
    refreshAlerts: () => void alerts.reload(),
    reloadMeta: () => void meta.reload(),
  };

  const sidebar = (
    <div className="flex h-full flex-col">
      <div className="brand-hero-admin relative isolate overflow-hidden px-5 pt-5 pb-4 text-white">
        <div className="absolute inset-0 -z-10">
          <Ambient />
        </div>
        <Link to="/control" onClick={() => setDrawerOpen(false)}>
          <Wordmark size="md" tone="white" subtitle />
        </Link>
        <p className="mt-3 inline-flex items-center gap-1.5 rounded-md bg-white/15 px-2 py-1 text-xs font-semibold tracking-wide ring-1 ring-white/20">
          <ShieldCheck className="size-3.5" />
          UniAccess · Portal institucional
        </p>
      </div>

      <nav aria-label="Secciones del portal" className="flex-1 space-y-5 overflow-y-auto px-3 py-5 scrollbar-thin">
        {groups.map(group => (
          <div key={group.title}>
            <p className="px-3 pb-1.5 text-xs font-semibold text-stone-500">{group.title}</p>
            <div className="space-y-0.5">
              {group.items.map(item => (
                <NavLink
                  key={item.to}
                  to={item.to}
                  end={item.end}
                  onClick={() => setDrawerOpen(false)}
                  className={({ isActive }) =>
                    `relative flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition ${isActive ? 'text-verde-800' : 'text-stone-600 hover:bg-stone-100 hover:text-stone-900'}`
                  }
                >
                  {({ isActive }) => (
                    <>
                      {isActive && (
                        <motion.span
                          layoutId="staff-nav"
                          className="absolute inset-0 rounded-lg bg-verde-50 ring-1 ring-verde-100"
                          transition={{ type: 'spring', stiffness: 420, damping: 36 }}
                        />
                      )}
                      {isActive && <span className="absolute inset-y-2 left-0 w-1 rounded-full bg-brand" />}
                      <item.icon className={`relative size-[18px] ${isActive ? 'text-verde-700' : 'text-stone-400'}`} />
                      <span className="relative flex-1">{item.label}</span>
                      {!!item.badge && (
                        <span className="relative rounded-full bg-accent px-1.5 py-0.5 text-xs leading-none font-bold text-white">{item.badge}</span>
                      )}
                    </>
                  )}
                </NavLink>
              ))}
            </div>
          </div>
        ))}

        {staff.role === 'admin' && (
          <Link
            to="/control/personas"
            onClick={() => setDrawerOpen(false)}
            className="mx-1 flex items-center gap-2 rounded-lg border border-dashed border-verde-300 bg-verde-50/50 px-3 py-2.5 text-sm font-semibold text-verde-700 transition hover:bg-verde-50"
          >
            <UserRoundPlus className="size-4" />
            Dar de alta una persona
          </Link>
        )}
      </nav>

      <div className="border-t border-stone-100 px-5 py-4 text-xs text-stone-500">
        <p className="flex items-center gap-1.5">
          {meta.data?.smtpConfigured ? <Mail className="size-3.5 text-verde-600" /> : <MailWarning className="size-3.5 text-amber-600" />}
          {meta.data?.smtpConfigured ? 'Correo saliente activo' : 'Correo en modo local'}
        </p>
        <p className="mt-1">{STAFF_ROLE_LABELS[staff.role]}{staff.area ? ` · ${staff.area}` : ''}</p>
      </div>
    </div>
  );

  return (
    <div className="min-h-dvh bg-page">
      <a href="#contenido" className="skip-link">
        Saltar al contenido
      </a>
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-68 border-r border-stone-200 bg-surface lg:block">{sidebar}</aside>

      <AnimatePresence>
        {drawerOpen && (
          <motion.div className="fixed inset-0 z-50 lg:hidden" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <div className="absolute inset-0 bg-black/55" onClick={() => setDrawerOpen(false)} />
            <motion.aside
              initial={{ x: '-100%' }}
              animate={{ x: 0 }}
              exit={{ x: '-100%' }}
              transition={{ type: 'spring', stiffness: 380, damping: 38 }}
              className="relative h-full w-72 bg-surface shadow-2xl"
            >
              <button
                type="button"
                onClick={() => setDrawerOpen(false)}
                className="absolute top-3 right-3 z-10 rounded-md p-1.5 text-white/80 hover:bg-white/10"
                aria-label="Cerrar menú"
              >
                <X className="size-5" />
              </button>
              {sidebar}
            </motion.aside>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="lg:pl-68">
        <header className="sticky top-0 z-20 border-b border-stone-200 bg-surface/95 backdrop-blur">
          <div className="flex h-16 items-center justify-between gap-3 px-4 sm:px-8">
            <div className="flex items-center gap-3">
              <button type="button" onClick={() => setDrawerOpen(true)} className="rounded-lg p-2 text-stone-600 hover:bg-stone-100 lg:hidden" aria-label="Abrir menú">
                <Menu className="size-5" />
              </button>
              <span className="lg:hidden">
                <Wordmark size="sm" />
              </span>
              <p className="hidden text-sm text-stone-500 lg:block">
                <span className="font-semibold text-stone-800">Control de acceso</span> · Centro Universitario de Tlaquepaque
              </p>
            </div>
            <div className="flex items-center gap-2">
            <ReadingPreferences />
            <UserMenu
              name={staff.fullName}
              role={STAFF_ROLE_LABELS[staff.role]}
              detail={staff.email}
              links={staff.role === 'admin' ? [{ to: '/control/operadores', label: 'Operadores', icon: ShieldCheck }] : []}
              onSignOut={handleSignOut}
            />
            </div>
          </div>
        </header>

        <main id="contenido" tabIndex={-1} className="mx-auto max-w-7xl outline-none px-4 py-6 sm:px-8 lg:py-8">
          <motion.div key={location.pathname} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }}>
            <Outlet context={context} />
          </motion.div>
        </main>
      </div>
    </div>
  );
}
