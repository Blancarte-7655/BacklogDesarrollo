# UniAccess · Casos de prueba

Este documento reúne los casos de prueba del MVP. Hay de dos tipos:

- **Automatizados**: se ejecutan con `npm test` sobre una base de datos temporal (`server/test/`).
- **Manuales**: se ejecutan en el navegador siguiendo los pasos. Al correrlos, se anota la fecha, quién los ejecutó y el resultado.

Cada caso sigue el formato *Dado / Cuando / Entonces* y se liga a su historia de usuario de [ALCANCE.md](ALCANCE.md).

---

## Pruebas automatizadas

```bash
npm test
```

| Archivo | Qué cubre |
| --- | --- |
| `server/test/reglas.test.ts` | Distancia entre coordenadas, vigencia de credencial, correo institucional y matrícula |
| `server/test/acceso.test.ts` | Entrada, salida, duplicados, incidencias, credencial vencida, rol no permitido, geocerca, registro manual y entradas sin salida |

---

## Pruebas manuales

**Preparación:** `.env` con `REQUIRE_BIOMETRIC=false`, un administrador, un alumno activo y un acceso que admita alumnos.

| ID | Historia | Dado | Cuando | Entonces | Resultado | Fecha / quién |
| --- | --- | --- | --- | --- | --- | --- |
| CP-01 | 1 | Un alumno con credencial vigente y sin entrada abierta | Registra su **entrada** desde `/acceso` | Ve "Entrada registrada" con la hora y aparece en el tablero en vivo | | |
| CP-02 | 1 | Un alumno con una entrada abierta | Intenta registrar **otra entrada** | Ve un aviso de que ya tiene una entrada y no se crea otro registro | | |
| CP-03 | 1 | Un alumno con credencial **vencida** | Intenta iniciar sesión | Se rechaza con el mensaje de vigencia y la fecha en que venció | | |
| CP-04 | 2 | Un alumno con una entrada abierta | Registra su **salida** | Ve "Salida registrada" con los minutos dentro y desaparece del tablero | | |
| CP-05 | 2 | Un alumno que ya registró su salida hoy | Registra **otra salida** | Ve un aviso y no se duplica el registro | | |
| CP-06 | 2 | Un alumno sin entrada abierta ni salida hoy | Registra su **salida** | Se registra como **incidencia** y aparece una alerta en `/control` | | |
| CP-07 | 3 | Un alumno y un acceso que solo admite personal | Intenta entrar por ese acceso | Se rechaza por rol y vigilancia recibe una alerta | | |
| CP-08 | 4 | Dos personas dentro del campus | Vigilancia abre el **tablero en vivo** y filtra por rol | Ve el total y solo las personas del rol elegido | | |
| CP-09 | 5 | Vigilancia en `/control` | Emite un **pase de invitado** y luego registra su salida | El pase aparece dentro y después se cierra | | |
| CP-10 | 6 | Un administrador | Da de **baja** a un alumno con sesión abierta | La sesión del alumno se cierra y ya no puede registrar acceso; su historial se conserva | | |
| CP-11 | 6 | Un administrador | Da de alta a una persona con un correo que no es `udg.mx` | El formulario rechaza el correo | | |
| CP-12 | 7 | Una alerta sin revisar | Vigilancia la marca como **revisada** | Deja de contarse como pendiente | | |
| CP-13 | 8 | Varios registros de distintos días | Vigilancia filtra por periodo y **exporta CSV** | El archivo contiene solo los registros filtrados | | |
| CP-14 | 9 | Un alumno con registros | Abre su **historial** | Solo ve sus propios registros | | |
| CP-15 | 1 | Un acceso con geocerca y `ENFORCE_GEOFENCE=true` | Un alumno registra su entrada **lejos** del acceso | Se rechaza indicando la distancia y vigilancia recibe una alerta | | |
| CP-16 | 1 | Un celular con HTTPS y biometría vinculada | El alumno registra su entrada | El teléfono pide huella o rostro antes de registrar | | |

**Resultado:** ✅ pasa · ❌ falla (abrir un *issue* con los pasos) · ⏸️ bloqueado
