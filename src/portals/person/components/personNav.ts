import { Bell, CalendarClock, CircleHelp, History, House, Monitor, ShieldCheck, Tv, UserRound, UserRoundPlus, type LucideIcon } from 'lucide-react';
import type { PersonRole } from '../../../../shared/contracts';

export interface PersonNavItem {
  to: string;
  label: string;
  icon: LucideIcon;
  description: string;
  end?: boolean;
  roles?: PersonRole[];
}

/** Secciones del portal de acceso; algunas solo aplican a ciertos roles */
export const PERSON_SECTIONS: PersonNavItem[] = [
  { to: '/acceso', label: 'Inicio', icon: House, end: true, description: 'Registrar entrada y salida' },
  { to: '/acceso/horario', label: 'Horario', icon: CalendarClock, description: 'Clase en curso y semana', roles: ['alumno', 'docente'] },
  { to: '/acceso/historial', label: 'Historial', icon: History, description: 'Tus accesos y horas' },
  { to: '/acceso/equipo', label: 'Laboratorio', icon: Monitor, description: 'Registrar el equipo que usas' },
  { to: '/acceso/invitados', label: 'Invitados', icon: UserRoundPlus, description: 'Invitaciones con QR', roles: ['docente', 'personal'] },
  { to: '/acceso/pantallas', label: 'Pantallas', icon: Tv, description: 'PIN de la pantalla del salón', roles: ['docente'] },
  { to: '/acceso/avisos', label: 'Avisos', icon: Bell, description: 'Notificaciones en tu celular' },
  { to: '/acceso/perfil', label: 'Mi perfil', icon: UserRound, description: 'Datos y biometría' },
];

export const EXTRA_LINKS: PersonNavItem[] = [
  { to: '/ayuda', label: 'Manual de usuario', icon: CircleHelp, description: 'Guías paso a paso' },
  { to: '/privacidad', label: 'Aviso de privacidad', icon: ShieldCheck, description: 'Cómo usamos tus datos' },
];

export const sectionsFor = (role: PersonRole) => PERSON_SECTIONS.filter(item => !item.roles || item.roles.includes(role));
