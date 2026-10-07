# UniAccess · Alcance de la primera versión

Sistema de control de acceso al Centro Universitario de Tlaquepaque mediante check-in / check-out
para alumnos, docentes, personal e invitados.

Materia: Seminario de Integración: Desarrollo · 7.º de Informática · CUTlaquepaque.

---

## 1. Decisiones de adaptación

El registro se hace **desde el celular de cada persona**, porque no se dispondrá de hardware
(lectores o torniquetes) en los accesos del campus. De ahí se derivan estas decisiones:

| Decisión | Motivo |
| --- | --- |
| La identidad se confirma con la **biometría del propio dispositivo** (huella o rostro) mediante WebAuthn | Sustituye al lector de credenciales; los datos biométricos nunca salen del teléfono |
| Cada acceso puede tener **geocerca** (coordenadas y radio) | Evita que alguien registre su entrada fuera del campus |
| Si el teléfono no admite biometría, el registro lo hace **vigilancia por matrícula** | Es el criterio 3 de la historia 1 (registro manual de respaldo) |
| **Entrada y salida son acciones distintas**, no un interruptor automático | Los criterios de las historias 1 y 2 exigen detectar salidas sin entrada y evitar duplicados |

## 2. Historias de usuario y su implementación

| # | Historia | MoSCoW | Estado | Implementación |
| --- | --- | --- | --- | --- |
| 1 | Alumno registra entrada | Must | En el MVP | Portal de la persona: botón Entrada con biometría y geocerca. Credencial vencida o dada de baja: se rechaza y se alerta |
| 2 | Alumno registra salida | Must | En el MVP | Botón Salida. Sin entrada previa: se registra con incidencia. Salida ya registrada: avisa y no duplica |
| 3 | Docente se identifica según su rol | Must | En el MVP | El rol se guarda en cada registro; cada acceso define qué roles admite. Rol no permitido: se deniega y se alerta a vigilancia |
| 4 | Vigilancia ve quién está dentro | Should | En el MVP | Tablero en vivo con total, listado, filtro por nombre y rol, y actualización automática |
| 5 | Invitado temporal | Should | En el MVP | Vigilancia emite un pase del día con motivo y anfitrión, y registra la salida cerrando el pase |
| 6 | Alta y baja de usuarios | Must | En el MVP | Gestión de personas: alta con validación de campos, baja que revoca el acceso y conserva el historial |
| 7 | Alerta de acceso no autorizado | Could | Incluida | Las alertas se generan automáticamente y vigilancia las marca como revisadas |
| 8 | Historial con filtros y exportación | Should | En el MVP | Historial por fecha, persona, rol y acceso, con exportación a CSV |
| 9 | Historial personal del alumno | Could | Incluida | Cada persona ve solo sus registros; el servidor lo restringe por sesión |
| 10 | Reportes de afluencia para directivos | Won't | **Incluida** | Gráficas de afluencia en el tablero y reporte descargable en Excel con 10 hojas (registros, por día, por hora, por acceso, alertas, invitados y uso de equipos) |
| 11 | Aviso de privacidad | Must | Incluida | Página pública `/privacidad` y aceptación obligatoria en el primer ingreso a cada portal (se pide de nuevo si cambia la versión) |
| 12 | Manual de usuario interactivo | Should | Incluida | Página `/ayuda` con guías paso a paso por tipo de usuario, buscador y preguntas frecuentes |
| 13 | Mi horario | Should | Incluida (demo) | Alumnos y docentes ven su semana, la clase en curso y la siguiente. Sin conexión con Control Escolar se muestra un horario ficticio de 7.º de Informática |
| 14 | Invitados con QR | Should | Incluida | Docentes y personal crean invitaciones; el invitado recibe una liga con su QR y vigilancia lo admite escaneándolo. El anfitrión recibe un aviso |
| 15 | Avisos en el celular | Could | Incluida | Centro de avisos con campana y notificaciones del navegador: credencial por vencer, salida olvidada, invitado que llegó, dispositivo vinculado, emergencia |
| 16 | Lista de emergencia | Should | Incluida | Simulacro o emergencia: avisa a quien está dentro y vigilancia marca a cada persona a salvo en el punto de reunión |
| 17 | Uso de equipos del laboratorio | Could | Incluida | Cada equipo tiene etiqueta QR; la persona la escanea y confirma con biometría. Las fallas y el mal uso se ligan a quien usaba el equipo |
| 18 | Pantallas de salón con PIN | Could | Incluida (simulada) | PIN de 6 dígitos que cambia en cada clase y solo ve el docente de ese salón. La pantalla real se simula en `/pantalla/:id` |
| 19 | Mapa del campus | Could | Backlog | Pendiente hasta contar con el plano oficial del centro |

## 3. Roles

**Personas que registran acceso** (portal de acceso, desde el celular):
- `alumno`
- `docente`
- `personal`

**Operadores** (portal institucional, desde computadora):
- `vigilancia`: tablero en vivo, pases de invitado, alertas y registro manual de respaldo
- `admin`: todo lo anterior más gestión de personas, accesos, operadores y auditoría

Los invitados no tienen cuenta: vigilancia los registra con un pase temporal.

## 4. Reglas de negocio

1. **Entrada**: se rechaza si la persona está dada de baja, si su credencial está vencida, si su rol
   no está permitido en ese acceso, si está fuera de la red del campus (cuando se configura), si está fuera de
   la geocerca, si la ubicación es más imprecisa que ±100 m o si ya tiene una entrada abierta.
2. **Salida**: cierra la entrada abierta. Si no existe, se registra igual y se marca `salida_sin_entrada`.
   Si ya se registró la salida, se avisa y no se duplica.
3. **Incidencias**: las entradas que quedan abiertas al terminar el día se marcan como `sin_salida`.
4. **Pases de invitado**: válidos solo el día que se emiten; al día siguiente se rechazan por expirados.
5. **Bajas**: revocan el acceso y cierran las sesiones abiertas, conservando todo el historial.
6. Cada intento rechazado genera una **alerta** para vigilancia con el motivo.
7. **Biometría**: un solo dispositivo por persona. Cambiarlo lo autoriza la administración.
8. **Portal institucional**: puede limitarse a las IP de las computadoras de vigilancia y administración.
9. **Invitaciones**: solo docentes y personal pueden invitar. Valen únicamente el día indicado y se usan una sola vez.
10. **Equipos**: solo quien está dentro del campus puede tomar un equipo; un equipo ocupado o fuera de servicio no se puede tomar; al salir del campus se libera. Una incidencia se liga a quien usaba el equipo en la última hora.
11. **PIN de pantallas**: dura lo que dura la clase (o una hora si no hay clase); el docente lo ve desde 10 minutos antes.
12. **Privacidad**: nadie usa un portal sin aceptar la versión vigente del aviso de privacidad.

## 5. Fuera de alcance en este ciclo

- Conexión real con Control Escolar (horarios) y con las pantallas de los salones (PIN): en la demo se simulan.
- Notificaciones push con la aplicación cerrada (requieren un servicio de envío; ver DT-07).
- Mapa del campus (historia 19).
- Integración con torniquetes, lectores de credencial o el directorio institucional.
- Aplicación nativa: la primera versión es una aplicación web que funciona en el navegador del celular.
