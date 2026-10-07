import { useOutletContext } from 'react-router-dom';
import type { AppNotification } from '../../../shared/contracts';

export interface PersonOutletContext {
  notifications: AppNotification[] | undefined;
  unread: number;
  refreshNotifications: () => void;
}

export const usePersonContext = () => useOutletContext<PersonOutletContext>();
