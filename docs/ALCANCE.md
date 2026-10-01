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
| 10 | Reportes de afluencia para directivos | Won't | **Parcial** | Gráficas de afluencia en el tablero (por hora, día, rol, acceso y denegados). Los reportes descargables siguen en el backlog |

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

## 5. Fuera de alcance en este ciclo

- Reportes descargables de afluencia para directivos (historia 10). Las gráficas del tablero sí están incluidas.
- Integración con torniquetes, lectores de credencial o el directorio institucional.
- Aplicación nativa: la primera versión es una aplicación web que funciona en el navegador del celular.
