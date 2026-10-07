# 0005. Códigos QR, Excel y avisos sin dependencias nuevas

- **Estado:** Aceptada
- **Fecha:** 2026-10-06
- **Responsables:** Equipo UniAccess

## Contexto

La demostración necesitaba tres capacidades nuevas: generar **códigos QR** (invitaciones y etiquetas de
equipos), descargar **reportes en Excel** y enviar **avisos al celular**. Lo habitual sería instalar
`qrcode`, `exceljs` y `web-push`. Sin embargo:

- Cada dependencia suma código de terceros que hay que auditar y mantener actualizado (ver la sección de
  seguridad del README).
- `exceljs` pesa varios megabytes y arrastra decenas de paquetes para usar una fracción mínima.
- Web Push exige llaves VAPID, guardar la suscripción de cada dispositivo y un servicio de envío, algo
  desproporcionado para una demo sin conexión con la Universidad.

## Decisión

1. **QR propio** en `shared/qr.ts` (≈ 300 líneas): modo byte, corrección de errores L/M, versiones 1-40,
   Reed-Solomon y selección de máscara. El mismo código lo usan el portal (SVG) y las pruebas.
2. **Excel propio** en `server/src/lib/xlsx.ts`: un `.xlsx` es un ZIP con XML; se arma con `zlib`
   (incluido en Node) y un CRC-32 de 10 líneas. Soporta varias hojas, encabezado con estilo, fila fija y filtros.
3. **Avisos por consulta periódica**: el portal pide los avisos cada 30 s y, si la persona dio permiso,
   los muestra con la API de notificaciones del navegador a través de un *service worker* (`public/sw.js`).
4. **Lector de QR** con `BarcodeDetector` del navegador; si no existe, se escribe el código a mano o se
   usa la cámara del sistema (el QR es una liga normal).

## Justificación

- **Verificado, no supuesto:** los QR generados se leyeron con dos detectores de OpenCV (114 de 114
  textos de distintas longitudes decodificados) y el Excel se abrió con `openpyxl` comprobando sus 10 hojas.
  `server/test/campus.test.ts` cubre ambos generadores.
- **Cero paquetes nuevos:** `npm audit` no cambia y el paquete del portal de la persona no crece.
- **Suficiente para el caso de uso:** los QR llevan ligas cortas (< 80 caracteres) y los reportes
  son tablas planas; no se necesitan fórmulas, gráficos ni imágenes dentro del Excel.
- **Los avisos funcionan en la demo** (Android y escritorio) sin infraestructura adicional, y el
  mecanismo de almacenamiento (`notifications`) ya queda listo para conectar Web Push después.

## Alternativas consideradas

| Alternativa | Por qué no |
| --- | --- |
| `qrcode` / `exceljs` desde npm | Más superficie de ataque y peso para una fracción mínima de sus funciones |
| Exportar CSV en lugar de Excel | Ya existe en Registros; directivos piden varias hojas con formato |
| Web Push con `web-push` | Requiere llaves VAPID, suscripciones y servicio de envío; queda como DT-07 |
| Servicio externo de QR (API web) | Enviaría ligas con tokens a un tercero |

## Consecuencias

- **Positivas:** sin dependencias nuevas; el código es pequeño, probado y entendible para el equipo.
- **Negativas o riesgos:** el equipo mantiene ese código; los avisos no llegan con el navegador cerrado
  (DT-07); `BarcodeDetector` no existe en Safari ni Firefox (se usa la cámara del sistema).
- **Qué habría que revisar si cambia el contexto:** si se necesitan reportes con gráficos o fórmulas,
  evaluar `exceljs`; si los avisos se vuelven críticos (emergencias reales), implementar Web Push.
