# 0004. Geocerca con tope de precisión y red del campus como barreras complementarias

- **Estado:** Aceptada
- **Fecha:** 2026-09-30
- **Responsables:** Equipo UniAccess

## Contexto

La biometría confirma **quién** registra, pero no **dónde** está. Sin hardware en las puertas, la
ubicación la reporta el propio teléfono, que puede falsificarse. Además, la primera versión sumaba
la precisión reportada al radio de la geocerca: enviando una precisión de 100 000 m se podía
registrar acceso desde cualquier lugar.

## Decisión

Usar dos barreras opcionales y configurables desde el portal institucional:
1. **Geocerca por acceso**, rechazando lecturas con precisión peor que **±100 m**
   (`MAX_GEO_ACCURACY_METERS` en `shared/rules.ts`).
2. **Red del campus**: lista de rangos de IP (CIDR) desde los que se acepta el registro. El portal
   institucional puede limitarse igual a las IP fijas de la caseta. `localhost` siempre entra y no
   se puede guardar una lista que deje fuera a quien la guarda.

Cada rechazo genera una alerta para vigilancia.

## Justificación

- **El hueco era real y medible:** con la regla anterior (distancia ≤ radio + precisión reportada),
  enviar `accuracy: 100000` permitía registrar desde cualquier punto a 100 km. Una prueba automatizada
  (`reglas.test.ts` y `acceso.test.ts`) reproduce el caso y confirma que ahora se rechaza.
- **Por qué ±100 m:** el GPS de un teléfono en exteriores suele dar entre 5 y 20 m, y en interiores
  o con poca señal entre 20 y 65 m. Un tope de 100 m deja pasar lecturas legítimas y rechaza las que
  no permiten saber si la persona está en el acceso (el radio por defecto de la geocerca es de 300 m).
- **Dos señales independientes:** falsificar la ubicación se hace con una app; falsificar la IP de la
  red del campus requiere estar conectado a esa red. Pedir ambas obliga a un atacante a vencer dos
  mecanismos distintos, sin agregar hardware.
- **Seguro contra bloqueos:** la regla de "no se puede guardar una lista que deje fuera a quien la
  guarda" y la excepción de `localhost` evitan que la administración pierda el acceso por un error
  de captura, un riesgo común en listas de IP permitidas.
- **Opcional por diseño:** ambas barreras vienen apagadas y se activan desde el portal, porque los
  rangos de red los define el área de sistemas del campus y pueden cambiar.

## Alternativas consideradas

| Alternativa | Por qué no |
| --- | --- |
| Confiar solo en la geocerca | La ubicación del teléfono se falsifica con apps comunes |
| Código QR rotativo en una pantalla de la caseta | Requiere una pantalla por acceso; queda como mejora futura |
| Beacons Bluetooth | Hardware extra y soporte irregular en navegadores |

## Consecuencias

- **Positivas:** dos señales independientes son más difíciles de falsificar a la vez; ambas se
  pueden activar o desactivar sin desplegar código.
- **Negativas o riesgos:** con datos móviles no se puede registrar si la red del campus está
  activa; detrás de un proxy hay que configurar `trust proxy` para que el servidor vea la IP real.
- **Qué habría que revisar si cambia el contexto:** si el campus instala pantallas en los accesos,
  agregar el QR rotativo como tercera barrera.
