import { sendMail } from '../lib/mailer.ts';
import type { PersonRow } from './people.ts';

/** Avisa a la persona que se vinculó un dispositivo biométrico a su cuenta */
export async function notifyDeviceLinked(person: Pick<PersonRow, 'email' | 'full_name'>, label: string) {
  const when = new Date().toLocaleString('es-MX', { dateStyle: 'long', timeStyle: 'short' });
  try {
    await sendMail({
      to: person.email,
      subject: 'UniAccess: se vinculó un dispositivo a tu cuenta',
      text: [
        `Hola, ${person.full_name}:`,
        '',
        `El ${when} se vinculó el dispositivo "${label}" para registrar tu acceso al CUTlaquepaque.`,
        '',
        'Si fuiste tú, no tienes que hacer nada.',
        'Si no fuiste tú, acude a la Coordinación de Seguridad y Accesos para que lo desvinculen y restablezcan tu contraseña.',
      ].join('\n'),
    });
  } catch (error) {
    // El aviso no debe impedir la vinculación si el correo falla
    console.error('No se pudo enviar el aviso de dispositivo vinculado:', error);
  }
}
