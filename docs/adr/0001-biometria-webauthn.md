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
