# Retrospectiva y ajuste al backlog

Retrospectiva del equipo al cierre del ciclo de medio término (semanas 1 a 10), después de la demo del
Sprint Review. Se revisa **qué salió bien, qué salió mal y qué vamos a cambiar**, y cómo eso
**ajusta el backlog** del siguiente ciclo.

- **Fecha:** 04/11/2026
- **Facilita:** Manuel Osvaldo Montes Blancarte (Scrum Master)
- **Participan:** Kevin Leonardo Perez Beltran (PO), Marcos Karim Ramirez Medrano, Alberto Lopez Sanchez,
  Fernando Daniel Serrano Islas
- **Técnica:** Start / Stop / Continue, con evidencia del tablero, los [bloqueos](bloqueos.md) y la
  [deuda técnica](deuda-tecnica.md)

---

## 1. Resultado del ciclo

| Indicador | Resultado |
| --- | --- |
| Historias *Must* y *Should* | Todas en el MVP (historias 1 a 6 y 8) |
| Historias *Could* | Incluidas (historias 7 y 9) |
| Historia *Won't* (10, reportes) | Adelantada en parte: gráficas de afluencia en el tablero |
| Pruebas automatizadas | 59 (20 unitarias, 20 de integración, 19 E2E) · todas pasan · corren en cada PR |
| Bloqueos registrados | 10 (5 resueltos, 3 mitigados, 2 abiertos) |
| Deuda técnica | 8 (1 pagada) |
| App publicada | Sí, con despliegue automático |

---

## 2. Qué salió bien (Continue)

- **El MVP se cumplió completo** y además se adelantaron las gráficas de afluencia, que estaban fuera
  del alcance.
- **Adaptarnos sin hardware:** cuando supimos que no habría lectores en los accesos
  ([BL-01](bloqueos.md#bl-01--no-hay-hardware-de-control-en-los-accesos)), usar el celular con
  biometría resolvió las dos historias *Must* ([ADR 0001](adr/0001-biometria-webauthn.md)).
- **Pruebas automatizadas y CI:** cada cambio se valida solo con la GitHub Action. Convertir los casos
  manuales en pruebas E2E ([BL-10](bloqueos.md#bl-10--los-casos-manuales-no-quedaban-registrados))
  nos dio evidencia real de que todo funciona.
- **Documentar decisiones y problemas:** los ADRs, bloqueos y deuda técnica nos ayudaron a explicar
  el proyecto en la demo sin improvisar.
- **Detectar fallas de seguridad a tiempo:** la geocerca con precisión falsa
  ([BL-03](bloqueos.md#bl-03--la-geocerca-se-podía-saltar-con-una-precisión-falsa)) y el registro a
  nombre de otra persona ([BL-04](bloqueos.md#bl-04--se-podía-registrar-la-entrada-de-otra-persona))
  se corrigieron antes de la demo.

## 3. Qué salió mal (Stop)

- **Subir cambios directo a `main`.** Solo hubo 3 Pull Requests y ninguno tuvo revisión de otro
  integrante. Varios cambios se copiaron a mano (commit *nueva vercion*), lo que desincronizó las
  ramas y el repositorio del equipo
  ([BL-06](bloqueos.md#bl-06--ramas-y-repositorios-desincronizados)).
- **Commits con mensajes poco claros** (*nueva vercion*) que no explican qué cambió.
- **Registrar las pruebas tarde.** Los casos manuales estuvieron sin resultado hasta el 26/10.
- **Pedir tarde lo que depende de la universidad.** El acceso a la base de datos institucional, los
  rangos de red de TI, el servidor de correo
  ([BL-08](bloqueos.md#bl-08--no-hay-servidor-de-correo-institucional)) y el aviso de privacidad
  ([BL-09](bloqueos.md#bl-09--falta-el-aviso-de-privacidad-y-el-plazo-de-conservación)) siguen
  pendientes porque se solicitaron cuando ya los necesitábamos.

## 4. Qué vamos a cambiar (Start)

| Acción | Responsable | Cómo sabremos que se cumple |
| --- | --- | --- |
| Todo cambio entra a `main` por Pull Request, con **al menos una revisión y un comentario** de otro integrante | Todo el equipo · vigila el Scrum Master | Cada PR del ciclo tiene un *review* aprobado antes del *merge* |
| Proteger la rama `main` en GitHub (no se puede subir directo) | Manuel | Configuración de *branch protection* activa |
| Commits con [Conventional Commits](https://www.conventionalcommits.org/es/) (`feat:`, `fix:`, `docs:`) | Todo el equipo | Historial de commits del ciclo |
| Revisar los bloqueos en cada *daily* y solicitar desde el inicio lo que depende de la universidad | Manuel (bloqueos) · Kevin (solicitudes) | Tabla de [bloqueos](bloqueos.md) al día |
| Al cerrar cada sprint, comprobar que README, casos de prueba y código coinciden | Fernando | Casilla en la plantilla de PR del cierre |
| Borrar o fusionar las ramas viejas | Alberto | En el repositorio solo quedan `main` y ramas abiertas con PR |

---

## 5. Ajuste al backlog

Con lo aprendido en la retrospectiva y los acuerdos del Sprint Review, el backlog del
siguiente ciclo queda así:

| # | Elemento | Antes | Ahora | Motivo |
| --- | --- | --- | --- | --- |
| 10 | Reportes de afluencia descargables (PDF / Excel) para dirección | *Won't* · Parcial | **Should** · En progreso | Dirección es un stakeholder clave y los reportes son la funcionalidad que falta del alcance |
| DT-03 | Migraciones de esquema versionadas | Pendiente · Media | **Prioridad alta, antes de la historia 10** | Los reportes necesitan columnas nuevas y hoy eso obliga a borrar la base ([BL-07](bloqueos.md#bl-07--los-cambios-de-esquema-obligan-a-borrar-la-base)) |
| 15 | Login con la base de datos institucional de alumnos y personal | — | **Nueva · Must** (depende del acceso) | Para usar cuentas reales en lugar de cuentas creadas por administración |
| 16 | Activar la restricción por red con los rangos de IP de TI | Programada, sin datos | **Nueva · Should** (depende de TI) | La ubicación la reporta el celular ([DT-02](deuda-tecnica.md)); la red del campus es la segunda barrera |
| DT-01 | Límite de intentos y desafíos biométricos en memoria | Pendiente · Alta | **Se mantiene en el siguiente ciclo** | Riesgo de seguridad si el servidor se reinicia o se usan varias instancias |
| BL-09 | Aviso de privacidad y plazo de conservación | Abierto | **Tarea del PO** | Sin aviso no se puede usar con datos reales |
| — | Comentarios del formulario del Sprint Review | — | **Se agregan al cerrar la ronda de 48 h** | Feedback de stakeholders, con la etiqueta `feedback-review` |

**Siguen igual:** historias 1 a 9 (terminadas; solo se corrigen errores que aparezcan) y la deuda de
prioridad baja (DT-05 a DT-08).

---

## 6. Próxima retrospectiva

Al cierre del siguiente ciclo (Hito 3, semana 14). Se revisará primero si se cumplieron las acciones
de la sección 4.
