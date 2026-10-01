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
