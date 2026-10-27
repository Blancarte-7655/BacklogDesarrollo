# UniAccess · Casos de prueba

Este documento reúne **todas las pruebas del MVP**: qué comprueba cada una, a qué historia de usuario
de [ALCANCE.md](ALCANCE.md) responde, **dónde está** (enlace al archivo y a la línea) y su último
resultado.

| Nivel | Qué prueba | Herramienta | Ubicación | Cantidad | Comando |
| --- | --- | --- | --- | --- | --- |
| **Unitarias** | Reglas puras, sin base de datos ni servidor | `node:test` (vía `tsx`) | [`server/test/reglas.test.ts`](../server/test/reglas.test.ts), [`server/test/red.test.ts`](../server/test/red.test.ts) | 20 | `npm test` |
| **Integración** | Servicios del servidor contra una base SQLite temporal | `node:test` (vía `tsx`) | [`server/test/acceso.test.ts`](../server/test/acceso.test.ts) | 20 | `npm test` |
| **Aceptación (E2E)** | Los casos CP-01 a CP-21 en un navegador real, contra la app compilada | Playwright + Chromium | [`e2e/`](../e2e/) · [`playwright.config.ts`](../playwright.config.ts) | 19 pruebas (21 casos) | `npm run test:e2e` |

Las tres se ejecutan solas en cada Pull Request y en cada *push* a `main` con la
[GitHub Action](../.github/workflows/ci.yml). El reporte de Playwright queda como artefacto
*reporte-playwright* de cada ejecución.

**Último resultado:** 26 de octubre de 2026 · ✅ 40/40 unitarias e integración · ✅ 19/19 de aceptación
(21/21 casos CP) · Node 22 · Chromium (Playwright 1.63).

**Resultado:** ✅ pasa · ❌ falla (abrir un *issue* con los pasos) · ⏸️ bloqueado (registrarlo en
[bloqueos.md](bloqueos.md))

---

## Cómo ejecutarlas

```bash
npm test            # unitarias + integración (≈2 s)
npm run test:e2e    # compila la app y corre las de aceptación (≈3 min)
npm run test:all    # todas
```

La primera vez, Playwright necesita su navegador: `npx playwright install chromium`.

Las pruebas E2E levantan **dos servidores propios** con bases de datos temporales (no tocan
`server/data/`):

| Servidor | Puerto | Biometría | Para |
| --- | --- | --- | --- |
| `aceptacion` | 4610 | Desactivada (`REQUIRE_BIOMETRIC=false`) | CP-01 a CP-15 y CP-17 a CP-21 |
| `biometria` | 4611 | Obligatoria, con autenticador virtual de WebAuthn | CP-16 |

---

## Pruebas unitarias

### [`server/test/reglas.test.ts`](../server/test/reglas.test.ts) · reglas compartidas de [`shared/rules.ts`](../shared/rules.ts)

| Prueba | Qué comprueba | Historia |
| --- | --- | --- |
| [la distancia a sí mismo es cero](../server/test/reglas.test.ts#L6) | Cálculo de distancia entre coordenadas | 1 |
| [0.001° de latitud equivale a unos 111 m](../server/test/reglas.test.ts#L10) | Precisión del cálculo de distancia | 1 |
| [acepta una ubicación precisa dentro del radio](../server/test/reglas.test.ts#L18) | Geocerca: dentro del radio | 1 |
| [el margen de error del GPS se suma al radio](../server/test/reglas.test.ts#L22) | Geocerca: tolerancia por precisión | 1 |
| [rechaza una ubicación lejana](../server/test/reglas.test.ts#L27) | Geocerca: fuera del radio | 1 |
| [rechaza una precisión enorme aunque prometa cubrir la distancia](../server/test/reglas.test.ts#L31) | Tope de ±100 m ([BL-03](bloqueos.md#bl-03--la-geocerca-se-podía-saltar-con-una-precisión-falsa)) | 1 |
| [acepta justo el límite de ±100 m](../server/test/reglas.test.ts#L38) | Caso límite del tope de precisión | 1 |
| [sin fecha de vigencia, la credencial es válida](../server/test/reglas.test.ts#L46) | Vigencia de credencial | 1 |
| [es válida hasta el último día de su vigencia](../server/test/reglas.test.ts#L50) | Vigencia: caso límite | 1 |
| [vencida un día antes, ya no es válida](../server/test/reglas.test.ts#L54) | Vigencia: vencida | 1 |
| [una persona dada de baja no tiene credencial válida aunque esté vigente](../server/test/reglas.test.ts#L58) | Baja revoca el acceso | 6 |
| [acepta correos de la UdeG y sus subdominios](../server/test/reglas.test.ts#L64) | Correo institucional válido | 6 |
| [rechaza correos externos o que imitan el dominio](../server/test/reglas.test.ts#L69) | Correo institucional inválido | 6 |
| [la matrícula tiene de 6 a 10 dígitos](../server/test/reglas.test.ts#L74) | Formato de matrícula | 6 |

### [`server/test/red.test.ts`](../server/test/red.test.ts) · restricción por red de [`server/src/services/network.ts`](../server/src/services/network.ts)

| Prueba | Qué comprueba | Historia |
| --- | --- | --- |
| [sin redes configuradas no se restringe nada](../server/test/red.test.ts#L8) | Lista vacía = sin restricción | 1 |
| [acepta IPs dentro de los rangos y la IP exacta](../server/test/red.test.ts#L12) | Rangos CIDR e IP exacta | 1 |
| [rechaza IPs fuera de la red del campus](../server/test/red.test.ts#L17) | IP fuera de rango | 1 |
| [entiende IPv4 escrita como IPv6 (::ffff:)](../server/test/red.test.ts#L23) | IPv4 mapeada a IPv6 | 1 |
| [el propio servidor (localhost) siempre entra](../server/test/red.test.ts#L28) | Seguro contra bloqueos | — |
| [rechaza rangos mal escritos con un mensaje claro](../server/test/red.test.ts#L33) | Validación de rangos | — |

## Pruebas de integración

### [`server/test/acceso.test.ts`](../server/test/acceso.test.ts) · servicio de acceso con base SQLite temporal

| Prueba | Qué comprueba | Historia | Caso |
| --- | --- | --- | --- |
| [una entrada válida deja a la persona dentro del campus](../server/test/acceso.test.ts#L87) | Registro de entrada | 1 | CP-01 |
| [no permite registrar dos entradas seguidas](../server/test/acceso.test.ts#L97) | Entrada duplicada | 1 | CP-02 |
| [la salida cierra la entrada abierta](../server/test/acceso.test.ts#L104) | Registro de salida | 2 | CP-04 |
| [una segunda salida el mismo día se avisa y no se duplica](../server/test/acceso.test.ts#L115) | Salida duplicada | 2 | CP-05 |
| [una salida sin entrada se registra como incidencia y alerta a vigilancia](../server/test/acceso.test.ts#L126) | Incidencia `salida_sin_entrada` | 2, 7 | CP-06 |
| [una credencial vencida se rechaza y genera alerta](../server/test/acceso.test.ts#L139) | Credencial vencida | 1, 7 | CP-03 |
| [una persona dada de baja no puede registrar acceso](../server/test/acceso.test.ts#L145) | Baja | 6 | CP-10 |
| [un rol no permitido en el acceso se rechaza y genera alerta](../server/test/acceso.test.ts#L150) | Acceso por rol | 3, 7 | CP-07 |
| [un acceso fuera de servicio no admite registros](../server/test/acceso.test.ts#L157) | Acceso desactivado | 1 | — |
| [con geocerca, se exige la ubicación](../server/test/acceso.test.ts#L161) | Ubicación obligatoria | 1 | CP-15 |
| [dentro de la geocerca, el registro procede](../server/test/acceso.test.ts#L165) | Geocerca válida | 1 | CP-15 |
| [una ubicación demasiado imprecisa no puede saltarse la geocerca](../server/test/acceso.test.ts#L170) | Tope de precisión | 1 | CP-15 |
| [lejos del acceso se rechaza y genera alerta](../server/test/acceso.test.ts#L176) | Fuera de la geocerca | 1, 7 | CP-15 |
| [vigilancia puede registrar la entrada de una persona](../server/test/acceso.test.ts#L187) | Registro manual de respaldo | 1 | — |
| [no se puede cerrar manualmente una salida sin entrada abierta](../server/test/acceso.test.ts#L195) | Registro manual inválido | 1 | — |
| [después de 18 horas se marcan como incidencia sin salida](../server/test/acceso.test.ts#L204) | Incidencia `sin_salida` | 2 | — |
| [una persona con un dispositivo vinculado no puede vincular otro](../server/test/acceso.test.ts#L222) | Un dispositivo por persona ([BL-04](bloqueos.md#bl-04--se-podía-registrar-la-entrada-de-otra-persona)) | 1 | CP-16 |
| [con red configurada, un registro desde otra red se rechaza y alerta](../server/test/acceso.test.ts#L240) | Red del campus | 1, 7 | CP-17 |
| [no se puede guardar una lista del portal que deje fuera a quien la guarda](../server/test/acceso.test.ts#L255) | Seguro contra bloqueos | — | CP-18 |
| [cuenta las entradas de hoy por hora, día, rol y acceso](../server/test/acceso.test.ts#L262) | Afluencia | 10 | CP-19 |

---

## Pruebas de aceptación (E2E)

Cada caso sigue el formato *Dado / Cuando / Entonces* y está automatizado en un navegador real con
Playwright. La columna **Prueba** enlaza al código que lo ejecuta.

**Preparación (la hace la propia prueba):** servidor con base de datos vacía, el administrador
`admin.e2e@udg.mx`, personas y accesos creados por la API antes de cada caso.

| ID | Historia | Dado | Cuando | Entonces | Prueba | Resultado | Fecha / quién |
| --- | --- | --- | --- | --- | --- | --- | --- |
| CP-01 | 1 | Un alumno con credencial vigente y sin entrada abierta | Registra su **entrada** desde `/acceso` | Ve "Entrada registrada" con la hora y aparece en el tablero en vivo | [acceso-persona.spec.ts#L9](../e2e/acceso-persona.spec.ts#L9) | ✅ | 2026-10-26 · Playwright |
| CP-02 | 1 | Un alumno con una entrada abierta | Intenta registrar **otra entrada** | El portal solo ofrece la salida y el servidor rechaza la segunda entrada (409) | [acceso-persona.spec.ts#L32](../e2e/acceso-persona.spec.ts#L32) | ✅ | 2026-10-26 · Playwright |
| CP-03 | 1 | Un alumno con credencial **vencida** | Intenta iniciar sesión | Se rechaza con el mensaje de vigencia y la fecha en que venció | [acceso-persona.spec.ts#L52](../e2e/acceso-persona.spec.ts#L52) | ✅ | 2026-10-26 · Playwright |
| CP-04 | 2 | Un alumno con una entrada abierta | Registra su **salida** | Ve "Salida registrada" con los minutos dentro y desaparece del tablero | [acceso-persona.spec.ts#L80](../e2e/acceso-persona.spec.ts#L80) | ✅ | 2026-10-26 · Playwright |
| CP-05 | 2 | Un alumno que ya registró su salida hoy | Registra **otra salida** | Recibe un aviso y no se duplica el registro | [acceso-persona.spec.ts#L96](../e2e/acceso-persona.spec.ts#L96) | ✅ | 2026-10-26 · Playwright |
| CP-06 | 2 | Un alumno sin entrada abierta ni salida hoy | Registra su **salida** | Se registra como **incidencia** ("Salida sin entrada registrada") y aparece una alerta en `/control` | [acceso-persona.spec.ts#L96](../e2e/acceso-persona.spec.ts#L96) | ✅ | 2026-10-26 · Playwright |
| CP-07 | 3 | Un alumno y un acceso que solo admite personal | Intenta entrar por ese acceso | El portal no se lo ofrece, el servidor lo rechaza por rol (403) y vigilancia recibe una alerta | [acceso-persona.spec.ts#L129](../e2e/acceso-persona.spec.ts#L129) | ✅ | 2026-10-26 · Playwright |
| CP-08 | 4 | Personas dentro del campus | Vigilancia abre el **tablero en vivo** y filtra por rol | Ve a la persona y el filtro muestra solo las del rol elegido | [acceso-persona.spec.ts#L9](../e2e/acceso-persona.spec.ts#L9) | ✅ | 2026-10-26 · Playwright |
| CP-09 | 5 | Vigilancia en `/control` | Emite un **pase de invitado** y luego registra su salida | El pase aparece dentro y después se cierra | [portal-institucional.spec.ts#L10](../e2e/portal-institucional.spec.ts#L10) | ✅ | 2026-10-26 · Playwright |
| CP-10 | 6 | Un alumno con sesión abierta | El administrador lo da de **baja** | Su sesión se cierra, ya no puede entrar y su historial se conserva | [portal-institucional.spec.ts#L50](../e2e/portal-institucional.spec.ts#L50) | ✅ | 2026-10-26 · Playwright |
| CP-11 | 6 | Un administrador | Da de alta a una persona con un correo que no es `udg.mx` | El formulario rechaza el correo y no se crea la persona | [portal-institucional.spec.ts#L32](../e2e/portal-institucional.spec.ts#L32) | ✅ | 2026-10-26 · Playwright |
| CP-12 | 7 | Una alerta sin revisar | Vigilancia la marca como **revisada** | El contador de pendientes baja en uno | [portal-institucional.spec.ts#L80](../e2e/portal-institucional.spec.ts#L80) | ✅ | 2026-10-26 · Playwright |
| CP-13 | 8 | Registros de varias personas | Vigilancia filtra por periodo y persona y **exporta CSV** | El archivo contiene solo los registros filtrados; un periodo sin registros no se puede exportar | [portal-institucional.spec.ts#L104](../e2e/portal-institucional.spec.ts#L104) | ✅ | 2026-10-26 · Playwright |
| CP-14 | 9 | Dos alumnos con registros | Uno abre su **historial** | Solo ve sus propios registros | [acceso-persona.spec.ts#L153](../e2e/acceso-persona.spec.ts#L153) | ✅ | 2026-10-26 · Playwright |
| CP-15 | 1 | Un acceso con geocerca y `ENFORCE_GEOFENCE=true` | Un alumno registra su entrada a ~2 km | Se rechaza indicando la distancia y vigilancia recibe una alerta | [acceso-persona.spec.ts#L61](../e2e/acceso-persona.spec.ts#L61) | ✅ | 2026-10-26 · Playwright |
| CP-16 | 1 | Biometría obligatoria y un teléfono con huella o rostro | El alumno vincula su dispositivo y registra su entrada | Sin vincular se rechaza; ya vinculado, el teléfono verifica al usuario y el registro queda con biometría | [biometria.spec.ts#L12](../e2e/biometria.spec.ts#L12) | ✅ | 2026-10-26 · Playwright (autenticador virtual) |
| CP-17 | 1 | La red del campus configurada en **Redes permitidas** | Un alumno registra su entrada con datos móviles | Ve "Conéctate a la red WiFi del campus" y vigilancia recibe una alerta | [accesibilidad-y-red.spec.ts#L23](../e2e/accesibilidad-y-red.spec.ts#L23) | ✅ | 2026-10-26 · Playwright |
| CP-18 | — | Un administrador conectado fuera de la red de la oficina | Guarda una lista del portal que no incluye su propia IP | El sistema no la guarda y explica por qué | [accesibilidad-y-red.spec.ts#L42](../e2e/accesibilidad-y-red.spec.ts#L42) | ✅ | 2026-10-26 · Playwright |
| CP-19 | 10 | Registros de hoy | Vigilancia cambia el periodo de las gráficas a 7, 30 y 14 días | Las gráficas se recalculan y "Ver datos en tabla" tiene un renglón por día con los mismos números que la API | [portal-institucional.spec.ts#L143](../e2e/portal-institucional.spec.ts#L143) | ✅ | 2026-10-26 · Playwright |
| CP-20 | — | Cualquier pantalla | La persona abre **Lectura** y elige tema oscuro y texto muy grande | La interfaz cambia sin recargar y la preferencia se conserva al cambiar de página | [accesibilidad-y-red.spec.ts#L63](../e2e/accesibilidad-y-red.spec.ts#L63) | ✅ | 2026-10-26 · Playwright |
| CP-21 | — | Navegación solo con teclado | La persona presiona Tab al entrar a un portal | Aparece "Saltar al contenido" con foco visible y lleva al contenido | [accesibilidad-y-red.spec.ts#L82](../e2e/accesibilidad-y-red.spec.ts#L82) | ✅ | 2026-10-26 · Playwright |

### Cómo se simulan las condiciones del mundo real

| Condición | Cómo la simula la prueba |
| --- | --- |
| Celular con GPS | Contexto de navegador de 412 × 915 px con permiso y coordenadas de geolocalización |
| Huella o rostro del teléfono | Autenticador virtual de WebAuthn de Chromium (`WebAuthn.addVirtualAuthenticator`) que verifica al usuario |
| Datos móviles / otra red | Cabecera `X-Forwarded-For` con una IP de documentación (`203.0.113.50`); la API la acepta solo desde el propio equipo (`trust proxy: loopback`) |
| Persona lejos del acceso | Coordenadas ~2 km al norte de la geocerca |

---

## Pendiente de ejecutar a mano

| ID | Caso | Por qué no se automatiza | Estado |
| --- | --- | --- | --- |
| CP-16-M | Registrar la entrada con la huella o el rostro **en un celular físico** | Requiere el servidor publicado en HTTPS y un teléfono real | ⏸️ Bloqueado por [BL-02](bloqueos.md#bl-02--la-biometría-no-funciona-en-el-celular-sin-https) |

Al ejecutarlo, anota aquí la fecha, quién lo ejecutó, el modelo del teléfono y el resultado.

---

## Cómo agregar un caso

1. Agrégalo a la tabla con el siguiente ID (`CP-22`, …) y su historia de [ALCANCE.md](ALCANCE.md).
2. Escribe la prueba en `e2e/` (flujo de interfaz) o en `server/test/` (regla del servidor) y pon
   el ID al inicio del nombre de la prueba, por ejemplo `test('CP-22 · …')`.
3. Enlaza el archivo y la línea en la columna **Prueba**.
4. El Pull Request debe pasar la GitHub Action antes del *merge*.
