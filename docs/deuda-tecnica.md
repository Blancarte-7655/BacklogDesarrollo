# Deuda técnica

Los atajos que tomamos conscientemente para entregar el MVP y que **debemos pagar**. Cada deuda
tiene prioridad, impacto, una solución propuesta y un esfuerzo estimado (S, M, L).

**Prioridad:** 🔴 Alta (riesgo de seguridad o de datos) · 🟠 Media (frena el crecimiento) · 🟢 Baja (calidad)

## Resumen

| ID | Deuda | Prioridad | Esfuerzo | Estado |
| --- | --- | --- | --- | --- |
| DT-01 | Límite de intentos y desafíos biométricos en memoria | 🔴 Alta | M | Pendiente |
| DT-02 | La ubicación la reporta el cliente | 🔴 Alta | L | Mitigada (red del campus) |
| DT-03 | Sin migraciones de esquema versionadas | 🟠 Media | M | Pendiente |
| DT-04 | Sin pruebas de interfaz ni de extremo a extremo | 🟠 Media | M | Pendiente |
| DT-05 | `node:sqlite` aún experimental | 🟢 Baja | S | En observación |
| DT-06 | Avisos de lint en componentes de animación copiados | 🟢 Baja | S | Pendiente |

---

## DT-01 · Límite de intentos y desafíos biométricos en memoria 🔴

- **Dónde:** `server/src/lib/rateLimit.ts` y `server/src/services/webauthn.ts`.
- **Atajo:** los contadores de intentos de inicio de sesión y los desafíos de WebAuthn viven en un
  `Map` en la memoria del proceso.
- **Impacto:** al reiniciar el servidor se borran (un atacante puede reintentar tras un reinicio) y
  no funcionan con más de una instancia. Además, el límite es por IP + usuario, así que no frena a
  quien prueba una misma contraseña contra muchas cuentas.
- **Solución propuesta:** guardarlos en una tabla de SQLite con caducidad (o en Redis si se escala),
  y añadir un segundo límite solo por IP.
- **Esfuerzo:** M.

## DT-02 · La ubicación la reporta el cliente 🔴

- **Dónde:** `server/src/services/access.ts` (geocerca).
- **Atajo:** se confía en las coordenadas que envía el navegador.
- **Impacto:** con una app de ubicación falsa se puede pasar la geocerca.
- **Mitigación actual:** tope de precisión de ±100 m y restricción opcional por red del campus
  ([ADR 0004](adr/0004-barreras-ubicacion-y-red.md)).
- **Solución propuesta:** código QR rotativo (cambia cada 30 s) mostrado en una pantalla de cada
  acceso, que el celular escanea y el servidor valida.
- **Esfuerzo:** L.

## DT-03 · Sin migraciones de esquema versionadas 🟠

- **Dónde:** `server/src/db/schema.ts`.
- **Atajo:** el esquema se crea con `CREATE TABLE IF NOT EXISTS`; agregar una columna a una tabla
  existente no se aplica solo en bases ya creadas.
- **Impacto:** al cambiar el esquema hay que borrar la base o modificarla a mano; riesgo de perder
  datos en producción. El archivo además conserva un nombre heredado (`servicio-social.db`).
- **Solución propuesta:** tabla `schema_migrations` y archivos numerados
  (`server/src/db/migrations/0001-inicial.sql`, …) que se aplican al arrancar. Aprovechar la
  primera migración para renombrar el archivo de la base.
- **Esfuerzo:** M.

## DT-04 · Sin pruebas de interfaz ni de extremo a extremo 🟠

- **Dónde:** `src/` (portales).
- **Atajo:** las pruebas automatizadas cubren las reglas del servidor (`npm test`), pero no la
  interfaz; los flujos se prueban a mano con [los casos de prueba](CASOS_DE_PRUEBA.md).
- **Impacto:** un cambio visual puede romper el registro de entrada sin que nadie lo note antes de
  la demo.
- **Solución propuesta:** Playwright con 3 flujos críticos (inicio de sesión, registrar entrada y
  salida, emitir pase de invitado) corriendo en la GitHub Action.
- **Esfuerzo:** M.

## DT-05 · `node:sqlite` aún experimental 🟢

- **Dónde:** `server/src/db/index.ts` ([ADR 0002](adr/0002-sqlite-integrado.md)).
- **Atajo:** se usa un módulo que Node todavía marca como experimental.
- **Impacto:** muestra una advertencia al arrancar y su API podría cambiar entre versiones de Node.
- **Solución propuesta:** fijar la versión de Node en `package.json` (`engines`) y en CI, y revisar
  el estado del módulo en cada actualización mayor.
- **Esfuerzo:** S.

## DT-06 · Avisos de lint en componentes de animación copiados 🟢

- **Dónde:** `src/components/reactbits/`, `src/hooks/useAsync.ts`, `src/auth/portalSession.tsx` y otros.
- **Atajo:** los componentes de React Bits se copiaron casi sin cambios.
- **Impacto:** `npm run lint` muestra varios avisos (refs leídos durante el render, `setState` dentro de
  efectos) que pueden causar renders de más.
- **Solución propuesta:** mover las asignaciones de refs a `useEffect`, derivar estados en el
  render y dejar el lint sin avisos para que los nuevos se noten.
- **Esfuerzo:** S.

---

## Cómo mantener este documento

- Toda deuda nueva entra en el mismo PR que la crea, con prioridad y solución propuesta.
- Al pagar una deuda, se marca como **Pagada** con el enlace al PR, en lugar de borrarla.
- Se revisa en cada retrospectiva para decidir cuál entra al siguiente sprint.
