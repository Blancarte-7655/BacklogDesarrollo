# 0003. Dos portales con sesiones y paquetes de código separados

- **Estado:** Aceptada
- **Fecha:** 2026-09-30
- **Responsables:** Equipo UniAccess

## Contexto

Hay dos públicos muy distintos: alumnos, docentes y personal, que registran su acceso desde el
celular, y vigilancia y administración, que operan el sistema desde una computadora. Un error de
permisos que dejara a un alumno ver el portal institucional expondría datos de toda la comunidad.

## Decisión

Separar **dos portales** (`/acceso` y `/control`) con:
- cookies de sesión distintas (`uniaccess_person` y `uniaccess_staff`), guardadas con hash;
- middleware de autorización propio en cada grupo de rutas de la API;
- código del frontend dividido en paquetes que se descargan por separado (`React.lazy`), para que
  quien registra su acceso nunca reciba el código del portal institucional.

## Justificación

- **Menor superficie de error (defensa en profundidad):** con un solo portal, un olvido en una sola
  validación de rol expone el padrón completo. Con dos portales, una sesión de alumno ni siquiera se
  reconoce en las rutas `/api/staff/*`: para acceder haría falta fallar en dos capas a la vez
  (cookie distinta y middleware distinto).
- **Principio de mínimo privilegio:** cada persona recibe solo el código y los datos que necesita.
  El paquete del portal institucional (tablas, administración, exportación) nunca se descarga en el
  celular de un alumno, lo que además reduce lo que se carga en datos móviles.
- **Duración de sesión distinta por riesgo:** el celular se usa a diario para entrar, así que una
  sesión de 30 días evita pedir contraseña en la puerta; el portal institucional maneja datos de
  toda la comunidad, por eso caduca a las 10 horas (un turno de vigilancia).
- **Costo bajo:** separar los portales no duplicó el modelo de datos: `shared/` mantiene un solo
  contrato de tipos y reglas para ambos y para el servidor.

## Alternativas consideradas

| Alternativa | Por qué no |
| --- | --- |
| Un solo portal con roles | Un fallo en una validación de rol mezcla ambos mundos; más superficie de error |
| Dos aplicaciones en repositorios distintos | Duplica configuración, tipos y reglas compartidas en un equipo pequeño |

## Consecuencias

- **Positivas:** iniciar sesión en un portal no da acceso al otro; cada sesión tiene la duración
  adecuada (30 días en el celular, 10 horas en el portal institucional); `shared/` mantiene un solo
  contrato de datos.
- **Negativas o riesgos:** dos pantallas de inicio de sesión que mantener; una persona que es
  alumno y administrador necesita dos cuentas.
- **Qué habría que revisar si cambia el contexto:** si se integra el inicio de sesión institucional
  de la UdeG (SSO), unificar la autenticación y mantener la separación de autorización.
