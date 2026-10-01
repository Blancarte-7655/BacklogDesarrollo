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
