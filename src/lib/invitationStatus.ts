import type { InvitationStatus } from '../../shared/contracts';
import type { BadgeTone } from '../ui/Display';

export const INVITATION_STATUS: Record<InvitationStatus, { label: string; tone: BadgeTone }> = {
  pendiente: { label: 'Vigente', tone: 'verde' },
  usada: { label: 'Ya se usó', tone: 'blue' },
  cancelada: { label: 'Cancelada', tone: 'red' },
  vencida: { label: 'Vencida', tone: 'neutral' },
};
