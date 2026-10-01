import { useReducedMotion } from 'motion/react';
import { usePreferences } from '../lib/preferences';

/** true si hay que reducir el movimiento según el sistema o las Preferencias de lectura */
export function useReduceMotion(): boolean {
  const system = useReducedMotion();
  const { motion } = usePreferences();
  if (motion === 'full') return false;
  return motion === 'reduce' || !!system;
}
