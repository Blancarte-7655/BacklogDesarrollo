export type HelpRole = 'alumno' | 'docente' | 'personal' | 'vigilancia' | 'admin';

export const HELP_ROLES: Array<{ value: HelpRole; label: string }> = [
  { value: 'alumno', label: 'Alumno' },
  { value: 'docente', label: 'Docente' },
  { value: 'personal', label: 'Personal' },
  { value: 'vigilancia', label: 'Vigilancia' },
  { value: 'admin', label: 'Administración' },
];

export interface HelpGuide {
  id: string;
  title: string;
  summary: string;
  roles: HelpRole[];
  steps: Array<{ title: string; text: string }>;
  /** Liga para probarlo en la app */
  link?: { to: string; label: string };
}

const PEOPLE: HelpRole[] = ['alumno', 'docente', 'personal'];
const STAFF: HelpRole[] = ['vigilancia', 'admin'];

export const HELP_GUIDES: HelpGuide[] = [
  {
    id: 'primer-ingreso',
    title: 'Entrar por primera vez',
    summary: 'Inicia sesión, acepta el aviso de privacidad y vincula tu biometría.',
    roles: PEOPLE,
    steps: [
      { title: 'Abre el portal de acceso', text: 'Desde tu celular entra a UniAccess y elige "Portal de acceso".' },
      { title: 'Inicia sesión', text: 'Escribe tu código (matrícula) o tu correo institucional y la contraseña que te dio Control Escolar.' },
      { title: 'Lee y acepta el aviso de privacidad', text: 'Explica qué datos se usan y para qué. Solo se pide una vez por versión.' },
      { title: 'Vincula tu biometría', text: 'En "Mi perfil" toca "Vincular este dispositivo" y confirma con tu huella o tu rostro. Tu huella nunca sale del teléfono.' },
    ],
    link: { to: '/acceso', label: 'Ir al portal de acceso' },
  },
  {
    id: 'entrada-salida',
    title: 'Registrar mi entrada y salida',
    summary: 'El registro diario desde tu celular, en la caseta.',
    roles: PEOPLE,
    steps: [
      { title: 'Llega al acceso', text: 'La app valida que estés en el acceso (ubicación) y conectado a la red del campus.' },
      { title: 'Elige el acceso y toca "Registrar entrada"', text: 'Confirma con tu huella o rostro. Verás el contador del tiempo que llevas dentro.' },
      { title: 'Al salir, toca "Registrar salida"', text: 'Si se te olvida, recibirás un aviso. Vigilancia puede cerrar el registro manualmente.' },
    ],
    link: { to: '/acceso', label: 'Registrar acceso' },
  },
  {
    id: 'horario',
    title: 'Consultar mi horario',
    summary: 'Clase en curso, siguiente clase y la semana completa.',
    roles: ['alumno', 'docente'],
    steps: [
      { title: 'Abre "Horario"', text: 'En el inicio verás tu próxima clase; en "Horario" la semana completa con salón y docente.' },
      { title: 'Revisa la clase en curso', text: 'Se marca en verde la que está ocurriendo ahora y cuánto falta para la siguiente.' },
      { title: 'Datos de Control Escolar', text: 'Cuando el sistema se conecte con la Universidad, el horario se cargará solo. En la demostración es ficticio.' },
    ],
    link: { to: '/acceso/horario', label: 'Ver mi horario' },
  },
  {
    id: 'equipo',
    title: 'Usar un equipo del laboratorio',
    summary: 'Escanea el QR de la computadora para dejar registro de que la usas tú.',
    roles: PEOPLE,
    steps: [
      { title: 'Registra tu entrada al campus', text: 'Solo quien está dentro del campus puede tomar un equipo.' },
      { title: 'Escanea la etiqueta QR del equipo', text: 'Cada computadora tiene una etiqueta. Con la cámara del celular se abre UniAccess con ese equipo (o escribe el código de 6 letras).' },
      { title: 'Confirma con tu biometría', text: 'A partir de ese momento el equipo queda a tu nombre. Nadie más puede registrarse en él.' },
      { title: 'Repórtalo si algo está mal', text: 'Si el equipo tiene daños o una contraseña pegada, repórtalo antes de usarlo para que no se te atribuya.' },
      { title: 'Libéralo al terminar', text: 'Toca "Terminar uso". Si sales del campus, se libera solo.' },
    ],
    link: { to: '/acceso/equipo', label: 'Usar un equipo' },
  },
  {
    id: 'avisos',
    title: 'Activar los avisos en el celular',
    summary: 'Recibe notificaciones de tu credencial, invitados y emergencias.',
    roles: PEOPLE,
    steps: [
      { title: 'Abre "Avisos"', text: 'Toca la campana en la parte superior.' },
      { title: 'Toca "Activar avisos en este celular"', text: 'El navegador te pedirá permiso. Acepta para recibirlos como notificación.' },
      { title: 'Revisa la campana', text: 'El número rojo indica avisos sin leer. Toca uno para ir a la sección relacionada.' },
    ],
    link: { to: '/acceso/avisos', label: 'Abrir avisos' },
  },
  {
    id: 'invitar',
    title: 'Invitar a un visitante con QR',
    summary: 'Registra a tu invitado antes de que llegue para que entre sin filas.',
    roles: ['docente', 'personal'],
    steps: [
      { title: 'Abre "Invitados"', text: 'Toca "Nueva invitación".' },
      { title: 'Escribe los datos', text: 'Nombre completo, motivo, fecha y acceso. El correo es opcional: si lo pones, le llega la invitación.' },
      { title: 'Comparte el QR', text: 'Envíale la liga o una captura del QR. También sirve el código de 8 caracteres.' },
      { title: 'Recibe el aviso de llegada', text: 'Cuando vigilancia escanee el QR, te llegará un aviso de que tu invitado ya entró.' },
    ],
    link: { to: '/acceso/invitados', label: 'Invitar a alguien' },
  },
  {
    id: 'pantallas',
    title: 'Conectar la pantalla del salón con PIN',
    summary: 'Evita que otros salones o alumnos tomen la pantalla.',
    roles: ['docente'],
    steps: [
      { title: 'Abre "Pantallas"', text: 'Diez minutos antes de tu clase aparece el PIN del salón donde la impartes.' },
      { title: 'Escribe el PIN en la pantalla', text: 'La pantalla o el transmisor del salón pide el PIN de 6 dígitos para aceptar la conexión.' },
      { title: 'El PIN cambia solo', text: 'Al terminar la clase el PIN deja de servir, así nadie puede volver a conectarse.' },
    ],
    link: { to: '/acceso/pantallas', label: 'Ver mi PIN' },
  },
  {
    id: 'admitir-invitacion',
    title: 'Admitir a un invitado con QR',
    summary: 'Escanea el QR del visitante y registra su entrada en un paso.',
    roles: STAFF,
    steps: [
      { title: 'Escanea el QR', text: 'Con la cámara del celular o con el botón "Escanear" en "Invitaciones QR". También puedes escribir el código.' },
      { title: 'Verifica la identificación', text: 'Revisa que el nombre coincida con una identificación oficial del visitante.' },
      { title: 'Toca "Admitir"', text: 'Se emite el pase del día, se registra la entrada y se avisa al anfitrión.' },
    ],
    link: { to: '/control/invitaciones', label: 'Abrir invitaciones' },
  },
  {
    id: 'laboratorios',
    title: 'Vigilar los laboratorios',
    summary: 'Quién usa cada equipo, fallas reportadas y equipos fuera de servicio.',
    roles: STAFF,
    steps: [
      { title: 'Abre "Laboratorios"', text: 'Cada tarjeta muestra equipos ocupados y fallas abiertas.' },
      { title: 'Entra al laboratorio', text: 'El mapa de equipos muestra quién está en cada computadora y desde qué hora.' },
      { title: 'Registra una incidencia', text: 'Si encuentras un daño, regístralo en el equipo: queda ligado a la última persona que lo usó.' },
      { title: 'Imprime las etiquetas QR', text: 'Desde el laboratorio, "Etiquetas QR" genera una hoja para pegar en cada equipo.' },
    ],
    link: { to: '/control/laboratorios', label: 'Ver laboratorios' },
  },
  {
    id: 'emergencia',
    title: 'Lista de emergencia y simulacros',
    summary: 'Pasa lista en el punto de reunión con quienes están dentro.',
    roles: STAFF,
    steps: [
      { title: 'Inicia el simulacro o la emergencia', text: 'En "Emergencia" elige el tipo. Se avisa a todas las personas dentro del campus.' },
      { title: 'Marca a cada persona a salvo', text: 'En el punto de reunión toca el nombre de cada persona. El contador muestra cuántas faltan.' },
      { title: 'Imprime o termina', text: 'Puedes imprimir la lista de pendientes para brigadistas. Al terminar, el evento queda en la bitácora.' },
    ],
    link: { to: '/control/emergencia', label: 'Abrir emergencia' },
  },
  {
    id: 'reportes',
    title: 'Descargar reportes en Excel',
    summary: 'Registros, horas pico, alertas, invitados y uso de equipos.',
    roles: STAFF,
    steps: [
      { title: 'Abre "Reportes"', text: 'Elige un periodo rápido (hoy, 7 días, mes) o las fechas que quieras.' },
      { title: 'Toca "Descargar Excel"', text: 'El archivo trae una hoja por tema, con filtros y encabezados listos para tablas dinámicas.' },
    ],
    link: { to: '/control/reportes', label: 'Ir a reportes' },
  },
  {
    id: 'demo',
    title: 'Preparar la demostración',
    summary: 'Carga datos de ejemplo y bórralos al terminar.',
    roles: ['admin'],
    steps: [
      { title: 'Abre "Demostración"', text: 'Solo la ve la administración.' },
      { title: 'Toca "Cargar datos de ejemplo"', text: 'Se crean 20 personas, dos semanas de accesos, laboratorios, invitaciones y avisos.' },
      { title: 'Entra con las cuentas de prueba', text: 'Docente 990000001 y alumna 990000002, contraseña Demo-2026.' },
      { title: 'Borra la demostración', text: 'Elimina solo los datos de ejemplo; tus datos reales no se tocan.' },
    ],
    link: { to: '/control/demo', label: 'Abrir demostración' },
  },
];

export const HELP_FAQ: Array<{ q: string; a: string; roles?: HelpRole[] }> = [
  { q: '¿UniAccess guarda mi huella o mi cara?', a: 'No. La huella o el rostro se verifican dentro de tu celular; UniAccess solo recibe una firma que confirma que fuiste tú.' },
  { q: '¿Me pueden rastrear con la ubicación?', a: 'No. La ubicación solo se consulta en el momento de registrar el acceso para confirmar que estás en la entrada.' },
  { q: 'Cambié de celular, ¿qué hago?', a: 'Entra con tu contraseña y vincula el nuevo dispositivo en "Mi perfil". Si perdiste el anterior, pide en la caseta que lo desvinculen.' },
  { q: 'Olvidé registrar mi salida', a: 'Recibirás un aviso. El sistema cierra los registros abiertos al final del día y quedan marcados como incidencia.' },
  { q: 'Alguien está registrado en el equipo que quiero usar', a: 'Pide a la persona encargada del laboratorio que revise el equipo; desde su portal puede liberarlo.' },
  { q: 'Mi invitado perdió su QR', a: 'Puede dar en la caseta el código de 8 caracteres, o tú puedes volver a compartirle la invitación desde "Invitados".', roles: ['docente', 'personal', 'vigilancia', 'admin'] },
  { q: '¿Por qué no veo el PIN de la pantalla?', a: 'El PIN aparece 10 minutos antes de tu clase y solo para el salón donde la impartes.', roles: ['docente'] },
];
