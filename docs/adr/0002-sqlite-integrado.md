# 0002. SQLite integrado en Node como base de datos

- **Estado:** Aceptada
- **Fecha:** 2026-09-30
- **Responsables:** Equipo UniAccess

## Contexto

El MVP debe correr en cualquier computadora del equipo y en la del docente sin instalar servicios
adicionales. El volumen esperado es pequeño: unos miles de personas y algunos miles de registros
por día, con un solo servidor. Se necesita SQL con transacciones, llaves foráneas y restricciones.

## Decisión

Usar el módulo **`node:sqlite`** incluido en Node.js 22.13+, con el esquema en SQL estándar
(`server/src/db/schema.ts`), modo WAL y llaves foráneas activadas. La base vive en un archivo
dentro de `server/data/`.

## Justificación

| Criterio | Por qué importa aquí | `node:sqlite` | PostgreSQL | `better-sqlite3` | MongoDB |
| --- | --- | --- | --- | --- | --- |
| **Instalación en cada equipo** | Todo el equipo (en Windows) y el docente deben correrlo en minutos | ✅ Viene con Node 22.13+ | ❌ Servidor aparte | ⚠️ Compila módulo nativo | ❌ Servidor aparte |
| **Restricciones e integridad** | Reglas como "una entrada abierta por persona" o "salida después de entrada" | ✅ `CHECK`, llaves foráneas, transacciones | ✅ | ✅ | ⚠️ Se validan en código |
| **Capacidad necesaria** | Unos miles de personas y registros por día, un servidor | ✅ Sobrado | ✅ Sobrado | ✅ | ✅ |
| **Pruebas automatizadas** | `npm test` crea una base nueva en cada corrida | ✅ Archivo temporal en milisegundos | ⚠️ Requiere contenedor | ✅ | ⚠️ Requiere servicio |

- **Volumen estimado:** con 5 000 personas y 2 registros diarios son ~10 000 filas por día;
  SQLite maneja millones de filas y miles de escrituras por segundo en modo WAL, muy por encima
  de lo que necesita un campus.
- **Cero dependencias nativas:** `better-sqlite3` necesita compilarse con herramientas de C++, que
  en Windows suelen fallar; `node:sqlite` ya viene compilado dentro de Node.
- **Salida preparada:** el esquema usa SQL estándar (sin funciones exclusivas de SQLite salvo
  `strftime`), así que migrar a PostgreSQL implica cambiar la capa de conexión, no reescribir las reglas.

## Alternativas consideradas

| Alternativa | Por qué no |
| --- | --- |
| PostgreSQL o SQL Server | Obliga a instalar y configurar un servidor de base de datos en cada equipo |
| `better-sqlite3` | Requiere compilar un módulo nativo; falla con frecuencia en Windows |
| MongoDB u otra NoSQL | Las reglas (entrada abierta, salida única, relaciones) se expresan mejor con SQL y restricciones |
| Archivos JSON | Sin transacciones ni consultas; se corrompen con escrituras simultáneas |

## Consecuencias

- **Positivas:** `npm install` y listo; respaldar es copiar un archivo; las pruebas usan una base
  temporal en segundos.
- **Negativas o riesgos:** `node:sqlite` todavía se marca como experimental (muestra una
  advertencia); un solo servidor escribe a la vez; no hay herramienta de migraciones
  (ver [deuda técnica](../deuda-tecnica.md)).
- **Qué habría que revisar si cambia el contexto:** con varias instancias o mucho más volumen,
  migrar a PostgreSQL. El SQL es estándar para que el cambio sea acotado.
