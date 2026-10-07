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
| `server/test/acceso.test.ts` | Entrada, salida, duplicados, incidencias, credencial vencida, rol no permitido, geocerca, registro manual, entradas sin salida, biometría, red del campus y afluencia |
| `server/test/red.test.ts` | Rangos de IP permitidos (IPv4, IPv6, localhost) y validación de rangos mal escritos |
| `server/test/campus.test.ts` | Código QR, horario (clase en curso y siguiente), invitaciones (admitir, fecha futura, fecha pasada), equipos de laboratorio, PIN de pantallas y su simulador, lista de emergencia, avisos automáticos, reporte de Excel y datos de demostración |

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
| CP-17 | 1 | La red del campus configurada en **Redes permitidas** | Un alumno registra su entrada con datos móviles | Ve "Conéctate a la red WiFi del campus" y vigilancia recibe una alerta | | |
| CP-18 | — | Un administrador en **Redes permitidas** | Guarda una lista del portal que no incluye su propia IP | El sistema no la guarda y explica por qué | | |
| CP-19 | 10 | Registros de varios días | Vigilancia cambia el periodo de las gráficas a 7, 14 y 30 días | Todas las gráficas y el resumen se actualizan; "Ver datos en tabla" muestra los mismos números | | |
| CP-20 | — | Cualquier pantalla | La persona abre **Lectura** y elige tema oscuro y texto muy grande | Toda la interfaz cambia sin recargar y la preferencia se conserva al volver | | |
| CP-21 | — | Navegación solo con teclado | La persona presiona Tab al entrar a un portal | Aparece "Saltar al contenido" y el foco siempre es visible | | |
| CP-22 | 11 | Una persona que nunca ha aceptado el aviso | Inicia sesión | Aparece el aviso de privacidad y no puede usar el portal hasta aceptarlo; la segunda vez ya no aparece | | |
| CP-23 | 12 | Cualquier persona en `/ayuda` | Elige "Docente" y busca "QR" | Solo aparecen guías de docente que mencionan QR y puede recorrer sus pasos con Siguiente/Anterior | | |
| CP-24 | 13 | Demo cargada; la alumna 990000002 un lunes a las 10:00 | Abre **Horario** | Ve "Ingeniería de Software II" como clase en curso y "Redes de Computadoras" como siguiente | | |
| CP-25 | 14 | El docente 990000001 | Crea una invitación para hoy y vigilancia escanea su QR | Vigilancia ve los datos, toca **Admitir**; el invitado aparece dentro y el docente recibe el aviso "ya llegó" | | |
| CP-26 | 14 | Una invitación ya usada | Vigilancia la vuelve a escanear | Se rechaza indicando que ya se usó | | |
| CP-27 | 15 | La alumna con avisos activados | Vigilancia inicia un simulacro | A la alumna le llega la notificación en el celular y la campana muestra el aviso | | |
| CP-28 | 16 | Demo cargada | Vigilancia inicia un **simulacro** y marca a 3 personas | El contador muestra 3 a salvo y "Faltan" no las incluye; al terminar queda en la bitácora | | |
| CP-29 | 17 | La alumna dentro del campus | Escanea la etiqueta de un equipo libre y confirma | El equipo aparece a su nombre en el mapa del laboratorio; otra persona no puede tomarlo | | |
| CP-30 | 17 | Un equipo en uso | El encargado registra "contraseña pegada en el monitor" | La incidencia muestra a la persona que usaba el equipo | | |
| CP-31 | 18 | Demo cargada | Se abre el simulador de pantalla y se escribe un PIN incorrecto y luego el vigente | El incorrecto se rechaza; el vigente conecta. Tras 5 intentos fallidos se bloquea 5 minutos | | |
| CP-32 | 10 | Demo cargada | Vigilancia descarga el reporte de los últimos 7 días | Excel abre el archivo con 10 hojas, encabezados fijos y filtros | | |

**Resultado:** ✅ pasa · ❌ falla (abrir un *issue* con los pasos) · ⏸️ bloqueado
