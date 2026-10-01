import { Check, Copy, KeyRound, Mail, MailWarning, Send, ShieldAlert } from 'lucide-react';
import { useState } from 'react';
import { errorMessage } from '../../../api/http';
import { copyText } from '../../../lib/clipboard';
import { Button, buttonStyles } from '../../../ui/Button';
import { Field } from '../../../ui/Field';
import { Modal, ModalBody, ModalFooter } from '../../../ui/Modal';
import { useToast } from '../../../ui/toast';
import { staffApi } from '../api';
import { useStaffContext } from '../context';
import { credentialsEmail } from '../mailTemplates';

export interface CredentialsRecipient {
  id: string;
  name: string;
  email: string;
  code?: string;
}

interface CredentialsDialogProps {
  open: boolean;
  kind: 'person' | 'staff';
  mode: 'welcome' | 'reset';
  recipient: CredentialsRecipient | null;
  password: string | null;
  onClose: () => void;
}

/** Muestra la contraseña generada una sola vez y permite enviarla con un correo precargado */
export function CredentialsDialog(props: CredentialsDialogProps) {
  return (
    <Modal
      open={props.open}
      onClose={props.onClose}
      locked
      size="lg"
      title={props.mode === 'welcome' ? 'Alta completada' : 'Nueva contraseña generada'}
      description={props.recipient ? `${props.recipient.name} · ${props.recipient.email}` : undefined}
    >
      {props.recipient && props.password && <Body {...props} recipient={props.recipient} password={props.password} />}
    </Modal>
  );
}

function Body({ kind, mode, recipient, password, onClose }: CredentialsDialogProps & { recipient: CredentialsRecipient; password: string }) {
  const toast = useToast();
  const { staff, meta } = useStaffContext();
  const template = credentialsEmail({
    kind,
    mode,
    name: recipient.name,
    email: recipient.email,
    code: recipient.code,
    password,
    portalUrl: meta?.portalUrl ?? window.location.origin,
    senderName: staff.fullName,
  });
  const [subject, setSubject] = useState(template.subject);
  const [body, setBody] = useState(template.body);
  const [copied, setCopied] = useState(false);
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);

  const send = async () => {
    setSending(true);
    try {
      const result =
        kind === 'person' ? await staffApi.emailPerson(recipient.id, subject, body) : await staffApi.emailOperator(recipient.id, subject, body);
      setSent(true);
      toast.notify(
        result.delivered
          ? `Correo enviado a ${recipient.email}.`
          : 'SMTP no configurado: el correo se guardó en la bandeja local del servidor (server/data/outbox).',
        result.delivered ? 'success' : 'warning',
      );
    } catch (err) {
      toast.notify(errorMessage(err), 'error');
    } finally {
      setSending(false);
    }
  };

  return (
    <>
      <ModalBody className="space-y-5">
        <div className="rounded-xl border border-verde-200 bg-verde-50 p-4">
          <p className="flex items-center gap-2 text-sm font-semibold text-verde-800">
            <KeyRound className="size-4" />
            Contraseña de acceso
          </p>
          <div className="mt-3 flex flex-wrap items-center gap-3">
            <code className="rounded-lg border border-verde-200 bg-surface px-4 py-2.5 font-mono text-xl font-semibold tracking-[0.12em] text-stone-900 select-all">
              {password}
            </code>
            <Button
              icon={copied ? <Check className="size-4" /> : <Copy className="size-4" />}
              onClick={async () => {
                if (await copyText(password)) {
                  setCopied(true);
                  setTimeout(() => setCopied(false), 2000);
                }
              }}
            >
              {copied ? 'Copiada' : 'Copiar'}
            </Button>
          </div>
          <p className="mt-3 flex items-start gap-2 text-xs text-verde-800">
            <ShieldAlert className="mt-0.5 size-4 shrink-0" />
            Solo se muestra ahora. Envíala al correo institucional; si se pierde, genera una nueva.
          </p>
        </div>

        <div className="space-y-3">
          <p className="flex items-center gap-2 font-display text-sm font-bold text-stone-900">
            <Mail className="size-4 text-verde-700" />
            Correo con las credenciales
          </p>
          <div className="grid gap-3 sm:grid-cols-[1fr_2fr]">
            <Field label="Para">
              <input className="input" value={recipient.email} readOnly />
            </Field>
            <Field label="Asunto">
              <input className="input" value={subject} onChange={event => setSubject(event.target.value)} maxLength={200} />
            </Field>
          </div>
          <Field label="Mensaje" hint="Puedes ajustar el texto antes de enviarlo.">
            <textarea className="input min-h-64 font-mono text-[0.8125rem] leading-relaxed" value={body} onChange={event => setBody(event.target.value)} />
          </Field>
          {meta && !meta.smtpConfigured && (
            <p className="flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800">
              <MailWarning className="mt-0.5 size-4 shrink-0" />
              El servidor aún no tiene SMTP configurado. "Enviar" guardará el correo en la bandeja local; usa "Abrir en mi correo" para mandarlo
              desde tu cuenta institucional.
            </p>
          )}
        </div>
      </ModalBody>
      <ModalFooter>
        <a
          href={`mailto:${recipient.email}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`}
          className={buttonStyles('secondary', 'md', 'mr-auto')}
        >
          <Mail className="size-4" />
          Abrir en mi correo
        </a>
        <Button variant="ghost" onClick={onClose}>
          {sent ? 'Cerrar' : 'Cerrar sin enviar'}
        </Button>
        <Button variant="primary" icon={sent ? <Check className="size-4" /> : <Send className="size-4" />} loading={sending} onClick={send}>
          {sent ? 'Enviar de nuevo' : 'Enviar correo'}
        </Button>
      </ModalFooter>
    </>
  );
}
