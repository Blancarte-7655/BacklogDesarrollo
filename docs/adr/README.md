# Registro de decisiones de arquitectura (ADR)

Cada ADR explica **una decisión técnica importante**: el contexto que la motivó, qué se decidió,
qué alternativas se descartaron y qué consecuencias tiene. Responde a la pregunta
*"¿por qué hicimos esto y no lo otro?"* para el equipo actual y para quien llegue después.

| # | Decisión | Estado |
| --- | --- | --- |
| [0001](0001-biometria-webauthn.md) | Identidad con la biometría del propio teléfono (WebAuthn) en lugar de lectores físicos | Aceptada |
| [0002](0002-sqlite-integrado.md) | SQLite integrado en Node como base de datos | Aceptada |
| [0003](0003-dos-portales-sesiones-separadas.md) | Dos portales con sesiones y paquetes de código separados | Aceptada |
| [0004](0004-barreras-ubicacion-y-red.md) | Geocerca con tope de precisión y red del campus como barreras complementarias | Aceptada |

## Cómo agregar un ADR

1. Copia [plantilla.md](plantilla.md) como `NNNN-titulo-corto.md` con el siguiente número.
2. Llénalo antes o durante el cambio, no meses después.
3. Súbelo en el mismo Pull Request que implementa la decisión.
4. Un ADR aceptado no se edita: si la decisión cambia, se escribe uno nuevo que lo **reemplaza**
   y se marca el anterior como *Reemplazada por NNNN*.
