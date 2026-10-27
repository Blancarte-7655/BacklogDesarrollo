# Bloqueos

Impedimentos que **frenaron o pusieron en riesgo** el avance del equipo durante el desarrollo del
MVP: qué pasó, a qué historia afectó, cómo se destrabó y dónde está la evidencia en el repositorio.

Un bloqueo no es lo mismo que una deuda técnica: el bloqueo **impide avanzar** hoy; la
[deuda técnica](deuda-tecnica.md) es un atajo que funciona pero que habrá que pagar. Cuando un
bloqueo se destraba con un atajo, se enlaza la deuda que generó.

**Estado:** 🟢 Resuelto · 🟡 Mitigado (se puede avanzar, pero queda trabajo) · 🔴 Abierto

## Resumen

| ID | Bloqueo | Historia | Detectado | Estado | Se destrabó con |
| --- | --- | --- | --- | --- | --- |
| [BL-01](#bl-01--no-hay-hardware-de-control-en-los-accesos) | No hay hardware de control en los accesos | 1, 2 | 2026-09-20 | 🟢 Resuelto | [ADR 0001](adr/0001-biometria-webauthn.md) |
| [BL-02](#bl-02--la-biometría-no-funciona-en-el-celular-sin-https) | La biometría no funciona en el celular sin HTTPS | 1 | 2026-09-30 | 🟡 Mitigado | Autenticador virtual en E2E ([CP-16](CASOS_DE_PRUEBA.md#pruebas-de-aceptación-e2e)) |
| [BL-03](#bl-03--la-geocerca-se-podía-saltar-con-una-precisión-falsa) | La geocerca se podía saltar con una precisión falsa | 1 | 2026-09-30 | 🟢 Resuelto | Commit `ae70b43` · [ADR 0004](adr/0004-barreras-ubicacion-y-red.md) |
| [BL-04](#bl-04--se-podía-registrar-la-entrada-de-otra-persona) | Se podía registrar la entrada de otra persona | 1 | 2026-09-30 | 🟢 Resuelto | Commit `738c106` (PR #2) |
| [BL-05](#bl-05--la-revisión-automática-fallaba-por-un-error-de-lint) | La revisión automática fallaba por un error de lint | — | 2026-09-30 | 🟢 Resuelto | Commit `d737591` (PR #1) |
| [BL-06](#bl-06--ramas-y-repositorios-desincronizados) | Ramas y repositorios desincronizados | Todas | 2026-10-26 | 🟡 Mitigado | Integración en `main` + [proceso de ramas](#cómo-evitar-que-vuelva-a-pasar) |
| [BL-07](#bl-07--los-cambios-de-esquema-obligan-a-borrar-la-base) | Los cambios de esquema obligan a borrar la base | 10 | 2026-10-01 | 🔴 Abierto | [DT-03](deuda-tecnica.md#dt-03--sin-migraciones-de-esquema-versionadas-) |
| [BL-08](#bl-08--no-hay-servidor-de-correo-institucional) | No hay servidor de correo institucional | 6 | 2026-09-30 | 🟡 Mitigado | Bandeja local `server/data/outbox` |
| [BL-09](#bl-09--falta-el-aviso-de-privacidad-y-el-plazo-de-conservación) | Falta el aviso de privacidad y el plazo de conservación | 9 | 2026-10-06 | 🔴 Abierto | Requiere decisión de la institución |
| [BL-10](#bl-10--los-casos-manuales-no-quedaban-registrados) | Los casos manuales no quedaban registrados | Todas | 2026-10-26 | 🟢 Resuelto | Pruebas E2E con Playwright · [DT-04](deuda-tecnica.md#dt-04--sin-pruebas-de-interfaz-ni-de-extremo-a-extremo-) |

---

## BL-01 · No hay hardware de control en los accesos

- **Qué pasó:** las historias 1 y 2 suponían lectores de credencial o torniquetes en las puertas,
  pero el campus no los tendrá disponibles en este ciclo.
- **Impacto:** sin hardware no había forma de confirmar la identidad en el acceso; bloqueaba las
  dos historias *Must* del MVP.
- **Cómo se destrabó:** el celular de cada persona funciona como credencial. La identidad se
  confirma con la huella o el rostro del propio teléfono (WebAuthn) y, opcionalmente, con geocerca.
  Si el teléfono no admite biometría, vigilancia registra por matrícula (registro manual).
- **Evidencia:** [ADR 0001](adr/0001-biometria-webauthn.md), [ALCANCE §1](ALCANCE.md#1-decisiones-de-adaptación),
  commit inicial `5873307` (*Funcionalidad real*).
- **Responsable:** equipo completo (decisión de Product Owner).

## BL-02 · La biometría no funciona en el celular sin HTTPS

- **Qué pasó:** WebAuthn y la geolocalización solo funcionan en un *contexto seguro* (HTTPS o
  `localhost`). Al abrir el portal desde el celular con la IP de la laptop de desarrollo
  (`http://192.168.x.x:5190`) el navegador no ofrece la huella ni la ubicación.
- **Impacto:** no se podía probar de punta a punta el registro con biometría (historia 1, CP-16).
- **Cómo se destrabó:**
  - En desarrollo se usa `REQUIRE_BIOMETRIC=false` (documentado en `.env.example`).
  - La prueba de aceptación [`e2e/biometria.spec.ts`](../e2e/biometria.spec.ts) levanta un servidor
    con biometría obligatoria y usa un **autenticador virtual de WebAuthn** de Chromium: vincula el
    dispositivo y registra la entrada verificando la firma en el servidor.
- **Pendiente:** validar en un celular físico con el servidor publicado en HTTPS (túnel o
  despliegue), como indica la sección *Producción* del README.
- **Evidencia:** [README · Producción](../README.md#producción), [CASOS_DE_PRUEBA · CP-16](CASOS_DE_PRUEBA.md).

## BL-03 · La geocerca se podía saltar con una precisión falsa

- **Qué pasó:** la distancia permitida era *radio + precisión reportada por el teléfono*, y la API
  aceptaba precisiones de hasta 100 000 m. Enviando una precisión enorme se podía registrar acceso
  desde cualquier lugar.
- **Impacto:** la regla de negocio 1 (geocerca) no se cumplía; bloqueaba la demo de la historia 1.
- **Cómo se destrabó:** regla compartida `checkGeofence` con tope de ±100 m; la API rechaza lecturas
  más imprecisas y el portal permite volver a obtener la ubicación. Se agregó a la red del campus como
  segunda barrera.
- **Evidencia:** commit `ae70b43` (rama `fix/geocerca`), pruebas
  [`reglas.test.ts`](../server/test/reglas.test.ts) (*rechaza una precisión enorme…*) y
  [`acceso.test.ts`](../server/test/acceso.test.ts) (*una ubicación demasiado imprecisa…*),
  [ADR 0004](adr/0004-barreras-ubicacion-y-red.md). Deuda restante:
  [DT-02](deuda-tecnica.md#dt-02--la-ubicación-la-reporta-el-cliente-).

## BL-04 · Se podía registrar la entrada de otra persona

- **Qué pasó:** con solo conocer la contraseña de alguien se podía vincular la huella propia a su
  cuenta y registrarle la entrada.
- **Impacto:** anulaba el propósito de la biometría (historia 1).
- **Cómo se destrabó:** máximo un dispositivo por persona; solo la administración puede quitarlo
  desde *Personas*, y se avisa por correo cada vez que se vincula uno (regla de negocio 7).
- **Evidencia:** commit `738c106`, Pull Request #2 (`feat/proteger-biometria`), prueba
  *una persona con un dispositivo vinculado no puede vincular otro* en
  [`acceso.test.ts`](../server/test/acceso.test.ts).

## BL-05 · La revisión automática fallaba por un error de lint

- **Qué pasó:** al agregar la GitHub Action, `oxlint` marcó como **error** (`rules-of-hooks`) el
  componente `Counter`, que llamaba hooks después de un `return` anticipado.
- **Impacto:** ningún Pull Request podía pasar la revisión automática.
- **Cómo se destrabó:** el dígito numérico pasó a su propio componente para llamar los hooks
  siempre en el mismo orden.
- **Evidencia:** commit `d737591`, Pull Request #1 (`chore/calidad-accesibilidad`),
  [`.github/workflows/ci.yml`](../.github/workflows/ci.yml). Avisos restantes:
  [DT-06](deuda-tecnica.md#dt-06--avisos-de-lint-en-componentes-de-animación-copiados-).

## BL-06 · Ramas y repositorios desincronizados

- **Qué pasó:** el trabajo se hizo en un *fork* con ramas `fix/…`, `feat/…` e `integracion`, pero la
  rama `integracion` (commit `d9ce5db`) no se fusionó a `main`; los cambios se copiaron a mano en
  `main` (commit `03646b3`, *nueva vercion*). Además, la rama `main` del repositorio del equipo que
  enlaza el README quedó en una versión anterior: con la documentación nueva pero **sin**
  `server/test/`, sin la GitHub Action y sin las gráficas ni las redes permitidas.
- **Impacto:** quien clonara el repositorio oficial obtenía un README y unos casos de prueba que
  describían archivos que no existían (`npm test` fallaba). Bloqueaba la entrega.
- **Cómo se destrabó:** se tomó como base la rama `main` del *fork* (la más completa, con pruebas y
  CI), se completó la documentación y se sube al repositorio del equipo.
- **Pendiente:** borrar o fusionar las ramas viejas para que `main` sea la única fuente de verdad.

### Cómo evitar que vuelva a pasar

1. Todo cambio entra a `main` **por Pull Request**, nunca copiando archivos.
2. La GitHub Action debe pasar (tipos, lint, pruebas y E2E) antes de hacer *merge*.
3. Al terminar cada sprint se revisa que el README, los casos de prueba y el código coincidan.

## BL-07 · Los cambios de esquema obligan a borrar la base

- **Qué pasó:** al agregar las redes permitidas se creó la tabla `settings`. Una tabla nueva sí se
  crea sola, pero el esquema usa `CREATE TABLE IF NOT EXISTS`, así que **cualquier columna nueva en
  una tabla existente** (por ejemplo, para los reportes de la historia 10) no llega a las bases ya
  creadas.
- **Impacto:** el siguiente cambio de columnas obligará a borrar `server/data/` y perder los
  registros; impide planear cambios de datos sin riesgo en una instalación real.
- **Siguiente paso:** migraciones numeradas, ver [DT-03](deuda-tecnica.md#dt-03--sin-migraciones-de-esquema-versionadas-).
- **Responsable sugerido:** desarrollo (backend).

## BL-08 · No hay servidor de correo institucional

- **Qué pasó:** el envío de contraseñas y avisos de biometría necesita SMTP, y el equipo no tiene
  credenciales de un servidor de correo de la UdeG.
- **Impacto:** las credenciales no llegan solas a la persona dada de alta (historia 6).
- **Mitigación:** sin SMTP, los correos se guardan en `server/data/outbox` y el portal ofrece
  *Abrir en mi correo* para enviarlos desde la cuenta institucional del operador.
- **Siguiente paso:** solicitar a la Coordinación de Tecnologías una cuenta SMTP y configurarla con
  las variables `SMTP_*` (ver [README · Variables de entorno](../README.md#variables-de-entorno)).

## BL-09 · Falta el aviso de privacidad y el plazo de conservación

- **Qué pasó:** el sistema guarda nombre, matrícula, horarios y, con geocerca, la ubicación del
  registro. La ley exige un aviso de privacidad y un plazo de conservación, que **no puede definir
  el equipo de desarrollo**.
- **Impacto:** no se puede usar con datos reales de la comunidad hasta tenerlo.
- **Siguiente paso:** el Product Owner lo solicita a la Unidad de Transparencia del centro; al
  recibirlo se enlaza en la sección *Privacidad de datos* del README y, si aplica, se agrega la
  depuración automática de registros antiguos.

## BL-10 · Los casos manuales no quedaban registrados

- **Qué pasó:** los 21 casos de prueba manuales tenían las columnas *Resultado* y *Fecha / quién*
  vacías: no había evidencia de que se hubieran ejecutado, y repetirlos a mano antes de cada demo
  tomaba demasiado tiempo.
- **Impacto:** no se podía demostrar que los flujos de interfaz funcionaban (entregable de pruebas).
- **Cómo se destrabó:** se automatizaron como **pruebas de aceptación con Playwright** en `e2e/`,
  que corren en la GitHub Action y en local con `npm run test:e2e`. Cada caso CP-xx tiene su prueba.
- **Evidencia:** [CASOS_DE_PRUEBA.md](CASOS_DE_PRUEBA.md),
  [DT-04 (pagada)](deuda-tecnica.md#dt-04--sin-pruebas-de-interfaz-ni-de-extremo-a-extremo-).

---

## Cómo registrar un bloqueo

1. Agrégalo a la tabla de resumen con el siguiente número (`BL-11`, …) en cuanto aparezca, aunque
   aún no tenga solución. Si se puede, abre también un *issue* en GitHub con la etiqueta `bloqueo`.
2. Describe **qué pasó, a qué historia afecta y qué impacto tiene**.
3. Coméntalo en la *daily*; el Scrum Master le da seguimiento hasta destrabarlo.
4. Al resolverlo, cambia el estado y enlaza la evidencia (commit, PR, prueba o ADR). No se borra.
