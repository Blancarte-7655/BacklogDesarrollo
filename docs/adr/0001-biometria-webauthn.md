# 0001. Identidad con la biometría del propio teléfono (WebAuthn)

- **Estado:** Aceptada
- **Fecha:** 2026-09-30
- **Responsables:** Equipo UniAccess

## Contexto

El campus necesita confirmar **quién** registra cada entrada y salida, pero no se dispondrá de
hardware en los accesos (lectores de credencial, torniquetes ni cámaras). Casi todas las personas
de la comunidad universitaria tienen un celular con huella, reconocimiento facial o PIN.

Una contraseña sola no basta: se puede prestar y entonces cualquiera registra por otra persona.

## Decisión

Confirmar la identidad en cada registro con **WebAuthn (passkeys)**, usando el lector biométrico
del propio teléfono, con `userVerification: 'required'`. El servidor genera un desafío de un solo
uso (5 minutos), el teléfono lo firma con una llave privada que nunca sale del dispositivo y el
servidor verifica la firma con la llave pública guardada. Se limita a **un dispositivo por persona**;
cambiarlo lo autoriza la administración.

## Justificación

La decisión se tomó con cuatro criterios, en orden de importancia:

| Criterio | Por qué importa aquí | WebAuthn | QR impreso | SMS/correo | Facial propio |
| --- | --- | --- | --- | --- | --- |
| **Prueba quién registra** | El objetivo de las historias 1 y 3 es saber quién entra | ✅ Requiere la huella o rostro del dueño | ❌ Cualquiera con la foto del QR | ⚠️ Quien tenga el teléfono | ✅ |
| **Costo de hardware** | No hay presupuesto para lectores en este ciclo | ✅ Cero: usa el teléfono | ✅ Cero | ⚠️ Costo por SMS | ❌ Cámaras y servidor de IA |
| **Riesgo con datos personales** | La biometría es un dato personal sensible según la LFPDPPP | ✅ No sale del teléfono | ✅ | ✅ | ❌ El servidor guardaría rostros |
| **Tiempo en la entrada** | En horas pico se forman filas | ✅ 1–2 s | ✅ | ❌ 10–30 s esperando el código | ✅ |

WebAuthn es la única opción que cumple los cuatro. Además:
- Es un **estándar abierto del W3C** que ya soportan Chrome, Safari, Edge y Firefox en Android e iOS,
  así que no depende de un proveedor ni de instalar una app.
- La verificación es **criptográfica**: el servidor no compara imágenes, compara una firma, lo que
  elimina falsos positivos por iluminación o ángulo.
- Cada desafío es de **un solo uso**: aunque alguien intercepte una respuesta, no puede reutilizarla.
- El límite de un dispositivo por persona cierra el hueco de "vinculo mi huella a la cuenta de mi
  amigo", que una contraseña sola no resuelve.

## Alternativas consideradas

| Alternativa | Por qué no |
| --- | --- |
| Lectores de credencial o torniquetes | No hay presupuesto ni instalación en este ciclo |
| Código QR impreso en la credencial | Se puede fotografiar y compartir; no prueba quién lo usa |
| Código por SMS o correo | Lento en la entrada en horas pico y tiene costo (SMS) |
| Reconocimiento facial propio en el servidor | Guardar datos biométricos implica un riesgo legal alto (LFPDPPP, datos sensibles) |

## Consecuencias

- **Positivas:** los datos biométricos nunca llegan al servidor; la verificación es criptográfica y
  rápida (1–2 s); funciona con huella, rostro o PIN según el teléfono.
- **Negativas o riesgos:** requiere HTTPS en producción; si otra persona tiene su huella dada de
  alta en el mismo teléfono, el teléfono también la acepta; quien no tiene un teléfono compatible
  depende del registro manual de vigilancia.
- **Qué habría que revisar si cambia el contexto:** si llegan lectores físicos, WebAuthn puede
  quedarse como respaldo o sustituirse por credenciales NFC.
