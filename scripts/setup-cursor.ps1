$ErrorActionPreference = "Stop"

$root = Get-Location
$cursorRoot = Join-Path $root ".cursor"
$rulesDir = Join-Path $cursorRoot "rules"
$agentsDir = Join-Path $cursorRoot "agents"
$plansDir = Join-Path $cursorRoot "plans"

New-Item -ItemType Directory -Force -Path $rulesDir | Out-Null
New-Item -ItemType Directory -Force -Path $agentsDir | Out-Null
New-Item -ItemType Directory -Force -Path $plansDir | Out-Null

function Write-Utf8File {
    param(
        [string]$Path,
        [string]$Content
    )
    $dir = Split-Path $Path -Parent
    if (-not (Test-Path $dir)) {
        New-Item -ItemType Directory -Force -Path $dir | Out-Null
    }
    Set-Content -Path $Path -Value $Content -Encoding UTF8
}
$content = @'
---
description: Contexto general del producto Rotaract SGI y propósito del MVP
globs:
alwaysApply: true
---

# Contexto del proyecto

Este proyecto busca digitalizar las reuniones distritales de presidentes de clubes Rotaract, convirtiéndolas en experiencias interactivas, moderables, trazables y con registro histórico.

## Problema a resolver
Hoy una reunión distrital suele depender de procesos manuales:
- toma de asistencia informal,
- orden de oradores no centralizado,
- votaciones poco estandarizadas,
- resultados difíciles de auditar,
- historial disperso o inexistente.

## Objetivo del MVP
Construir un módulo inicial que permita:
- administrar reuniones distritales,
- mostrar el estado de la reunión en tiempo real,
- habilitar votaciones digitales,
- gestionar solicitudes de palabra,
- visualizar timers,
- registrar acciones relevantes con trazabilidad.

## Perfiles principales
1. **Presidentes / participantes**
2. **Secretaría / administración / moderación**

## Restricciones de producto
- Mobile-first.
- Flujo simple, sin pasos innecesarios.
- La interfaz no debe entorpecer la dinámica real de una reunión.
- La información crítica debe verse en tiempo real.
- La plataforma debe dejar base sólida para módulos posteriores.

## Módulos futuros contemplados pero fuera del MVP
- blogs autogestionables,
- documentos y actas avanzadas,
- métricas distritales,
- biblioteca institucional,
- gestión de comités y submódulos de comunicación.

## Criterio general para generar código
Toda propuesta debe respetar:
- separación clara entre frontend y backend,
- diseño escalable para múltiples reuniones y múltiples clubes,
- trazabilidad de acciones críticas,
- bajo acoplamiento,
- nomenclatura consistente,
- preparación para crecimiento futuro.

## Decisiones que no deben romperse
- Next.js para experiencia web del usuario.
- NestJS para API, reglas de negocio y tiempo real.
- Prisma + PostgreSQL para persistencia.
- WebSockets para sincronización en vivo.
'@
Write-Utf8File -Path (Join-Path $root ".cursor\rules\00-project-context.mdc") -Content $content
$content = @'
---
description: Alcance funcional del MVP y límites del primer release
globs:
alwaysApply: true
---

# Alcance del MVP

## El MVP sí incluye
### Para participantes
- login seguro,
- acceso a una reunión asignada,
- visualización del tema actual,
- visualización de orador actual,
- visualización de siguiente orador,
- timers visibles,
- solicitud de palabra,
- cola de oradores visible,
- votación con opciones Sí / No / Abstención,
- confirmación previa al voto,
- visualización del resultado general cuando secretaría cierre la votación,
- historial personal y general permitido por rol.

### Para secretaría
- CRUD de reuniones,
- CRUD de temas,
- reordenamiento de temas,
- cambio de tema en vivo,
- apertura y cierre de votaciones,
- control de timers,
- visualización detallada de votos,
- administración de cola de oradores,
- historial de reuniones,
- exportación base de resultados.

## El MVP no incluye
- videollamada integrada,
- streaming propio,
- gestión financiera,
- blogs autogestionables productivos,
- app nativa mobile,
- integraciones externas complejas,
- automatizaciones por IA en producción.

## Criterios de aceptación del MVP
- una reunión puede crearse, configurarse y ponerse en estado "en vivo",
- los participantes conectados ven el mismo estado casi en tiempo real,
- los votos quedan persistidos y auditables,
- no es posible votar dos veces en la misma instancia,
- la secretaría puede moderar sin recargar la página,
- el historial puede consultarse luego de finalizada la reunión.

## Reglas de negocio base
- un participante vota una sola vez por votación,
- la identidad del voto detallado solo la ve secretaría,
- el resultado agregado puede ser público dentro de la reunión,
- la cola de oradores debe respetar orden de solicitud salvo intervención explícita de secretaría,
- los timers deben seguir corriendo incluso si se excede el tiempo, marcando "destiempo".

## Prioridad funcional
1. autenticación y roles,
2. reuniones y temas,
3. realtime del estado de la reunión,
4. votación,
5. solicitud de palabra,
6. historial,
7. exportación básica.
'@
Write-Utf8File -Path (Join-Path $root ".cursor\rules\01-product-scope-mvp.mdc") -Content $content
$content = @'
---
description: Arquitectura objetivo del monorepo y principios de diseño
globs:
alwaysApply: true
---

# Arquitectura objetivo

## Estructura recomendada
```text
/apps
  /web
  /api
/packages
  /shared-types
  /ui
  /config
```

## Responsabilidades
### apps/web
- interfaz de participantes,
- interfaz de secretaría,
- consumo de API REST,
- suscripción a WebSockets,
- manejo de estado visual,
- UX mobile-first.

### apps/api
- autenticación y autorización,
- CRUD de reuniones, temas, votaciones y turnos,
- gateways WebSocket,
- reglas de negocio,
- persistencia vía Prisma,
- exportaciones y auditoría.

### packages/shared-types
- DTOs compartidos,
- enums de dominio,
- tipos de eventos WebSocket,
- contratos de respuesta.

## Principios de arquitectura
- separar lectura/escritura en servicios claros,
- preferir módulos por dominio,
- no mezclar lógica de UI con lógica de negocio,
- mantener contratos tipados entre frontend y backend,
- auditar eventos críticos,
- diseñar para idempotencia en operaciones sensibles,
- evitar dependencias circulares.

## Módulos sugeridos en NestJS
- auth
- users
- clubs
- meetings
- agenda-topics
- speaking-queue
- voting
- timers
- realtime
- audit-log
- exports

## Principios de frontend
- rutas claras por rol,
- componentes pequeños,
- estado local para UI efímera,
- estado remoto sincronizado con React Query o alternativa similar,
- socket centralizado,
- manejo explícito de reconnect y resync.

## Principios de base de datos
- modelos auditables,
- timestamps en entidades críticas,
- estados explícitos con enums,
- índices en consultas de tiempo real,
- soft delete solo donde agregue valor real.
'@
Write-Utf8File -Path (Join-Path $root ".cursor\rules\02-architecture-monorepo.mdc") -Content $content
$content = @'
---
description: Estándares de frontend para Next.js
globs:
  - apps/web/**
alwaysApply: false
---

# Reglas frontend Next.js

## Objetivos
La app web debe ser:
- rápida,
- clara,
- responsive,
- usable desde celular en reuniones en vivo.

## Recomendaciones
- usar App Router,
- segmentar por áreas `(public)`, `(participant)`, `(admin)`,
- usar server components donde aporte,
- usar client components solo cuando haya interactividad real,
- formularios con validación estricta,
- evitar sobrecargar la UI con información secundaria.

## Páginas mínimas
- login,
- dashboard de reuniones para secretaría,
- detalle de reunión para secretaría,
- sala en vivo de reunión para secretaría,
- sala en vivo de reunión para participante,
- historial de reuniones,
- historial de votaciones.

## Componentes principales
- MeetingStatusCard
- CurrentTopicPanel
- SpeakerQueuePanel
- VotePanel
- VoteResultsPanel
- MeetingTimer
- SpeakingTurnTimer
- AdminControlsBar
- MeetingTopicsList
- MeetingAuditTimeline

## UX obligatoria
- botones grandes y claros para votar,
- confirmación antes de emitir voto,
- feedback inmediato tras acciones críticas,
- estados vacíos bien diseñados,
- skeletons para carga,
- colores accesibles,
- foco especial en móvil vertical.

## Estado y datos
- las lecturas de estado persistente deben venir por API,
- las actualizaciones en vivo deben llegar por socket,
- ante reconnect se debe hacer resync con snapshot,
- no confiar únicamente en el estado del socket para verdad final.

## Prohibiciones
- lógica de negocio compleja en componentes,
- fetch duplicado e inconsistente,
- toasts genéricos sin contexto,
- modales innecesarios para acciones repetitivas.
'@
Write-Utf8File -Path (Join-Path $root ".cursor\rules\03-nextjs-frontend.mdc") -Content $content
$content = @'
---
description: Estándares backend para NestJS
globs:
  - apps/api/**
alwaysApply: false
---

# Reglas backend NestJS

## Objetivo
Construir un backend modular, auditable y preparado para tiempo real.

## Estructura sugerida por módulo
```text
/module
  controller.ts
  service.ts
  gateway.ts (si aplica)
  dto/
  entities/ o mappers/
  policies/
  tests/
```

## Convenciones
- DTOs validados con class-validator,
- servicios con responsabilidad concreta,
- controladores delgados,
- gateways sin lógica pesada,
- reglas de autorización en guards o policies reutilizables,
- errores de dominio claros.

## Endpoints REST mínimos
- auth/login
- meetings CRUD
- meetings/:id/start
- meetings/:id/finish
- meetings/:id/topics CRUD
- meetings/:id/topics/reorder
- meetings/:id/votations/open
- meetings/:id/votations/:id/close
- meetings/:id/speaking-queue/request
- meetings/:id/speaking-queue/manage
- meetings/:id/history
- meetings/:id/export

## Realtime
- namespaces o rooms por meetingId,
- eventos separados por dominio,
- snapshot inicial del estado,
- reconexión segura,
- autorización antes de unirse a una room.

## Calidad
- unit tests para reglas críticas,
- integration tests para endpoints clave,
- tests de concurrencia para votación,
- logs estructurados,
- auditoría persistida para eventos críticos.

## Eventos críticos que deben auditarse
- login,
- creación/edición/eliminación de reunión,
- cambio de tema,
- apertura/cierre de votación,
- emisión de voto,
- modificación manual de cola,
- inicio/pausa/finalización de reunión.
'@
Write-Utf8File -Path (Join-Path $root ".cursor\rules\04-nestjs-backend.mdc") -Content $content
$content = @'
---
description: Reglas de modelado con Prisma y PostgreSQL
globs:
  - prisma/**
  - apps/api/**/prisma/**
alwaysApply: false
---

# Reglas Prisma + PostgreSQL

## Principios
- nombres claros y consistentes,
- enums explícitos,
- timestamps en entidades importantes,
- relaciones modeladas según dominio real,
- constraints para evitar duplicados lógicos.

## Entidades principales esperadas
- User
- Club
- Membership
- Meeting
- MeetingParticipant
- AgendaTopic
- VoteSession
- Vote
- SpeakingRequest
- TimerSession
- AuditLog

## Constraints críticas
- un usuario no puede votar dos veces en la misma VoteSession,
- una reunión tiene un único tema actual activo,
- una SpeakingRequest activa pertenece a un usuario y reunión,
- las relaciones deben soportar historial.

## Índices sugeridos
- Meeting(status, scheduledAt)
- AgendaTopic(meetingId, order)
- VoteSession(meetingId, status)
- Vote(voteSessionId, userId) unique
- SpeakingRequest(meetingId, status, requestedAt)
- AuditLog(meetingId, createdAt)

## Reglas de persistencia
- el backend es la fuente de verdad,
- el socket nunca reemplaza la persistencia,
- las transacciones deben usarse en operaciones críticas,
- cuando haya riesgo de carrera, proteger con constraint + manejo de error.

## Migraciones
- pequeñas,
- revisables,
- con nombres descriptivos,
- acompañadas por actualización de tipos compartidos si impactan contratos.
'@
Write-Utf8File -Path (Join-Path $root ".cursor\rules\05-prisma-postgresql.mdc") -Content $content
$content = @'
---
description: Contratos y normas para tiempo real con WebSockets
globs:
  - apps/api/**/gateway*
  - apps/web/**/socket*
alwaysApply: false
---

# Reglas realtime

## Objetivo
Mantener sincronizada la reunión en vivo con baja fricción y alta confiabilidad.

## Principios
- el socket publica cambios,
- la API recupera snapshots y corrige desvíos,
- cada reunión tiene su room,
- el cliente debe poder rehidratar estado tras reconnect.

## Eventos del servidor al cliente
- meeting.snapshot
- meeting.status.changed
- topic.changed
- topic.reordered
- timer.updated
- timer.overtime
- speaking.requested
- speaking.queue.updated
- speaking.current.changed
- vote.opened
- vote.submitted.confirmed
- vote.results.available
- participant.connected
- participant.disconnected

## Eventos del cliente al servidor
- meeting.join
- meeting.leave
- speaking.request
- speaking.cancel
- vote.submit
- admin.topic.next
- admin.topic.reorder
- admin.vote.open
- admin.vote.close
- admin.timer.start
- admin.timer.pause
- admin.timer.reset

## Buenas prácticas
- payloads mínimos y tipados,
- acknowledgements en acciones críticas,
- validación de permisos en cada evento entrante,
- no enviar datos sensibles innecesarios a participantes,
- evitar floods de eventos,
- resync automático tras reconexión.

## Riesgos a prevenir
- doble voto por reconexión o doble click,
- desincronización de cola de oradores,
- timers divergentes,
- mostrar resultados antes de cerrar la votación,
- fugas de detalle de voto a roles no autorizados.
'@
Write-Utf8File -Path (Join-Path $root ".cursor\rules\06-websockets-realtime.mdc") -Content $content
$content = @'
---
description: Reglas de diseño UI UX mobile-first
globs:
  - apps/web/**
alwaysApply: false
---

# Reglas UI/UX

## Prioridad
La experiencia principal sucede en celulares durante reuniones en vivo.

## Principios
- máximo 1 acción principal por bloque visual,
- lectura rápida,
- contraste alto,
- jerarquía visual fuerte,
- feedback inmediato,
- evitar saturación de información.

## Pantalla del participante
Debe priorizar:
1. estado actual de la reunión,
2. tema actual,
3. timer,
4. botón de pedir palabra,
5. bloque de votación si está abierta,
6. cola de oradores.

## Pantalla de secretaría
Debe priorizar:
1. control de flujo,
2. tema actual y próximos temas,
3. control de timer,
4. abrir/cerrar votación,
5. ver resultados,
6. cola de oradores,
7. auditoría rápida.

## Estilo visual recomendado
- institucional y profesional,
- limpio,
- moderno sin exceso de ornamento,
- componentes grandes y táctiles,
- tablas solo donde realmente aporten,
- métricas resumidas en cards.

## Accesibilidad
- estados no dependientes solo del color,
- tamaños táctiles cómodos,
- soporte de teclado básico en desktop,
- mensajes de error legibles,
- componentes con etiquetas claras.
'@
Write-Utf8File -Path (Join-Path $root ".cursor\rules\07-ui-ux-mobile-first.mdc") -Content $content
$content = @'
---
description: Reglas de seguridad, roles y auditoría
globs:
alwaysApply: true
---

# Seguridad y roles

## Roles mínimos
- SUPER_ADMIN
- SECRETARIAT
- PRESIDENT
- VIEWER (opcional futuro)

## Reglas de acceso
- solo secretaría y super admin gestionan reuniones,
- solo participantes autorizados pueden entrar a una reunión,
- solo participantes habilitados pueden votar,
- solo secretaría ve el detalle nominal del voto,
- los resultados agregados se exponen según estado de la votación.

## Autenticación
- sesión segura,
- hashing de contraseñas,
- expiración razonable,
- posibilidad futura de magic link o invitación.

## Auditoría obligatoria
Registrar:
- quién hizo la acción,
- cuándo,
- en qué reunión,
- tipo de acción,
- payload mínimo útil.

## Datos sensibles
- el detalle de voto es sensible,
- no exponer emails o metadata innecesaria por socket,
- nunca confiar en el rol enviado por frontend,
- validar todo en backend.
'@
Write-Utf8File -Path (Join-Path $root ".cursor\rules\08-security-audit-roles.mdc") -Content $content
$content = @'
---
description: Estándares de entrega, documentación y calidad
globs:
alwaysApply: true
---

# Estándares de entrega

## Cada feature debe entregar
- objetivo,
- alcance,
- criterios de aceptación,
- archivos impactados,
- riesgos,
- testing mínimo.

## Convenciones
- nombres consistentes,
- commits pequeños,
- archivos cortos cuando sea posible,
- comentarios solo donde agreguen contexto real,
- no introducir complejidad accidental.

## Definition of Done
Una tarea se considera terminada cuando:
- compila,
- tiene tipado correcto,
- respeta reglas del dominio,
- contempla estados vacíos y errores,
- incluye validación básica,
- deja trazabilidad si la acción es crítica,
- tiene cobertura de pruebas acorde al riesgo.

## Prioridad de calidad
1. corrección funcional,
2. seguridad,
3. trazabilidad,
4. mantenibilidad,
5. performance,
6. refinamiento visual.

## Forma de responder esperada para Cursor
Cuando propongas cambios:
- primero resumí el objetivo,
- luego el plan,
- luego los archivos a crear o modificar,
- después el código,
- y al final checklist de validación.
'@
Write-Utf8File -Path (Join-Path $root ".cursor\rules\09-delivery-standards.mdc") -Content $content
$content = @'
# Agent: Product Owner


## Rol
Actuás como Product Owner del MVP de reuniones distritales.

## Objetivo
Traducir necesidades institucionales a historias de usuario, criterios de aceptación y prioridades de release.

## Tenés que cuidar
- claridad funcional,
- foco en MVP,
- evitar scope creep,
- coherencia entre necesidad real y solución propuesta.

## Preguntas guía
- ¿esto resuelve un problema real del flujo de reunión?
- ¿esto es indispensable para el MVP?
- ¿qué riesgo funcional elimina?
- ¿cómo se valida con usuarios reales?

## Entregables esperados
- historias de usuario,
- criterios de aceptación,
- definición de prioridades,
- decisiones de alcance,
- backlog por fases.

## No hagas
- sobreingeniería,
- features lindas pero no críticas,
- dependencias innecesarias para el primer release.
'@
Write-Utf8File -Path (Join-Path $root ".cursor\agents\product-owner.md") -Content $content
$content = @'
# Agent: Solution Architect


## Rol
Actuás como arquitecto de solución del sistema.

## Objetivo
Diseñar una arquitectura clara, escalable y mantenible usando Next.js, NestJS, WebSockets, Prisma y PostgreSQL.

## Responsabilidades
- definir módulos,
- proponer contratos entre frontend y backend,
- diseñar eventos realtime,
- asegurar trazabilidad,
- reducir acoplamiento.

## Principios
- backend como fuente de verdad,
- realtime para sincronización, no para reemplazar persistencia,
- tipado compartido,
- separación de responsabilidades,
- diseño orientado al dominio.

## Entregables
- estructura de carpetas,
- módulos por dominio,
- flujo de datos,
- riesgos técnicos,
- decisiones arquitectónicas razonadas.
'@
Write-Utf8File -Path (Join-Path $root ".cursor\agents\solution-architect.md") -Content $content
$content = @'
# Agent: Frontend Engineer


## Rol
Actuás como Frontend Engineer especializado en Next.js para la experiencia de reunión en vivo.

## Objetivo
Construir una interfaz rápida, clara, mobile-first y robusta ante reconexiones.

## Priorizá
- claridad visual,
- baja fricción,
- estados de carga y error bien resueltos,
- componentes reutilizables,
- tipado seguro.

## Páginas clave
- login,
- lista de reuniones,
- sala de participante,
- sala de secretaría,
- historial.

## Entregables
- rutas,
- componentes,
- hooks de datos,
- integración websocket,
- mejoras UX alineadas al contexto institucional.
'@
Write-Utf8File -Path (Join-Path $root ".cursor\agents\frontend-engineer.md") -Content $content
$content = @'
# Agent: Backend Engineer


## Rol
Actuás como Backend Engineer en NestJS.

## Objetivo
Implementar APIs y reglas de negocio robustas para reuniones, votaciones, oradores y auditoría.

## Debés garantizar
- autorización correcta por rol,
- idempotencia en operaciones críticas,
- persistencia consistente,
- servicios claros por dominio,
- DTOs y validación estricta.

## Entregables
- módulos NestJS,
- controllers,
- services,
- guards,
- DTOs,
- tests de reglas críticas.
'@
Write-Utf8File -Path (Join-Path $root ".cursor\agents\backend-engineer.md") -Content $content
$content = @'
# Agent: Database Engineer


## Rol
Actuás como Database Engineer con Prisma y PostgreSQL.

## Objetivo
Diseñar un modelo de datos consistente, auditable y eficiente para consultas en vivo e historial.

## Priorizá
- integridad,
- constraints,
- índices,
- migraciones pequeñas,
- relaciones claras.

## Debés pensar en
- un voto único por usuario por sesión,
- historial de reuniones,
- orden de temas,
- cola de oradores,
- logs de auditoría,
- performance de lecturas frecuentes.
'@
Write-Utf8File -Path (Join-Path $root ".cursor\agents\database-engineer.md") -Content $content
$content = @'
# Agent: Realtime Engineer


## Rol
Actuás como especialista en realtime sobre WebSockets.

## Objetivo
Diseñar y mantener una sincronización estable de la reunión en vivo.

## Problemas a evitar
- doble voto,
- desincronización,
- eventos fuera de orden,
- fugas de información sensible,
- pérdida de estado por reconnect.

## Entregables
- catálogo de eventos,
- rooms por reunión,
- estrategia snapshot + stream,
- manejo de reconnect,
- acknowledgements.
'@
Write-Utf8File -Path (Join-Path $root ".cursor\agents\realtime-engineer.md") -Content $content
$content = @'
# Agent: QA Analyst


## Rol
Actuás como QA Analyst del MVP.

## Objetivo
Diseñar escenarios de prueba funcional, de concurrencia y de regresión.

## Casos críticos
- login y acceso por rol,
- ingreso simultáneo de participantes,
- apertura/cierre de votación,
- intento de doble voto,
- cola de oradores con múltiples solicitudes,
- reconexión durante reunión,
- persistencia de historial.

## Entregables
- checklist QA,
- casos felices,
- edge cases,
- bugs potenciales,
- smoke tests por release.
'@
Write-Utf8File -Path (Join-Path $root ".cursor\agents\qa-analyst.md") -Content $content
$content = @'
# Agent: UI/UX Designer


## Rol
Actuás como diseñador UI/UX con foco mobile-first.

## Objetivo
Reducir fricción y hacer que la tecnología acompañe la reunión sin distraer.

## Debés optimizar
- jerarquía visual,
- claridad de acciones,
- feedback inmediato,
- accesibilidad,
- consistencia entre panel participante y panel secretaría.

## Entregables
- estructura de pantallas,
- mejoras de usabilidad,
- componentes táctiles,
- recomendaciones de flujo,
- criterios visuales.
'@
Write-Utf8File -Path (Join-Path $root ".cursor\agents\ui-ux-designer.md") -Content $content
$content = @'
# Master Roadmap

## Objetivo general
Lanzar un MVP funcional para digitalizar reuniones distritales con:
- reuniones en vivo,
- moderación por secretaría,
- votación digital auditada,
- solicitud de palabra,
- timers,
- historial.

## Fase 0 — Base del repositorio
### Objetivo
Dejar listo el esqueleto técnico.

### Tareas
- crear monorepo,
- configurar apps/web y apps/api,
- configurar packages/shared-types,
- instalar Prisma y PostgreSQL,
- configurar lint, format y variables de entorno,
- definir convenciones base.

### Definition of Done
- proyecto corre local,
- frontend y backend levantan,
- conexión a PostgreSQL operativa,
- Prisma inicializado.

---

## Fase 1 — Dominio y autenticación
### Objetivo
Modelar usuarios, clubes, reuniones y roles.

### Tareas
- modelos User, Club, Membership, Meeting,
- autenticación,
- autorización por rol,
- seed inicial,
- sesión de usuario y contexto por reunión.

### Definition of Done
- un usuario puede iniciar sesión,
- secretaría y presidente reciben permisos distintos,
- datos base creados.

---

## Fase 2 — Gestión administrativa de reuniones
### Objetivo
Permitir a secretaría crear y preparar reuniones.

### Tareas
- CRUD de reuniones,
- CRUD de temas,
- ordenamiento de temas,
- asignación de participantes,
- estado borrador / programada / en vivo / finalizada.

### Definition of Done
- secretaría puede crear una reunión completa y dejarla lista para iniciar.

---

## Fase 3 — Sala en vivo y sincronización
### Objetivo
Sincronizar el estado de la reunión entre todos los clientes.

### Tareas
- gateway websocket,
- room por reunión,
- snapshot inicial,
- eventos de estado,
- cambio de tema en vivo,
- presencia básica de participantes.

### Definition of Done
- dos o más usuarios conectados ven el mismo estado casi en tiempo real.

---

## Fase 4 — Votación digital
### Objetivo
Resolver votaciones seguras y auditables.

### Tareas
- crear VoteSession,
- abrir/cerrar votación,
- emitir voto,
- prevenir doble voto,
- mostrar resultado agregado,
- panel detallado para secretaría.

### Definition of Done
- una votación puede ejecutarse de punta a punta con persistencia y auditoría.

---

## Fase 5 — Solicitud de palabra y timers
### Objetivo
Ordenar intervenciones y tiempos.

### Tareas
- speaking queue,
- solicitud de palabra,
- asignar orador actual y siguiente,
- timer general de tema,
- timer de intervención,
- estado de destiempo.

### Definition of Done
- la reunión puede moderarse con flujo ordenado.

---

## Fase 6 — Historial, exportación y cierre
### Objetivo
Dejar trazabilidad posterior a la reunión.

### Tareas
- historial de reuniones,
- historial de votaciones,
- audit log,
- exportación básica CSV o PDF futuro,
- resumen de resultados.

### Definition of Done
- la información histórica es consultable y exportable.

---

## Fase 7 — QA y hardening
### Objetivo
Preparar release estable.

### Tareas
- pruebas funcionales,
- pruebas de concurrencia,
- manejo de errores,
- mejora de reconnect,
- pulido visual,
- validación con usuarios piloto.

### Definition of Done
- release candidate estable para prueba institucional.
'@
Write-Utf8File -Path (Join-Path $root ".cursor\plans\00-master-roadmap.md") -Content $content
$content = @'
# MVP Functional Breakdown

## 1. Login y acceso
### Participante
- ingresa con usuario validado,
- ve solo reuniones donde participa.

### Secretaría
- accede a dashboard administrativo,
- administra reuniones y ve trazabilidad.

## 2. Reuniones
### Estados sugeridos
- DRAFT
- SCHEDULED
- LIVE
- PAUSED
- FINISHED
- ARCHIVED

### Campos mínimos
- título,
- descripción,
- fecha programada,
- estado,
- club o distrito organizador,
- configuraciones generales.

## 3. Temas de agenda
### Tipos sugeridos
- DISCUSSION
- VOTING
- INFORMATIVE

### Campos mínimos
- título,
- descripción,
- orden,
- tipo,
- duración estimada,
- estado.

## 4. Votación
### Flujo
1. secretaría abre votación
2. participantes ven panel de voto
3. eligen Sí / No / Abstención
4. confirman
5. backend persiste
6. secretaría cierra votación
7. resultado agregado se publica

### Reglas
- un voto por usuario por sesión,
- no se vota fuera de ventana activa,
- detalle nominal visible solo para secretaría.

## 5. Solicitud de palabra
### Flujo
1. participante presiona pedir palabra
2. request queda en cola
3. secretaría ordena o acepta
4. se define orador actual
5. timer de intervención se actualiza

## 6. Timers
### Tipos
- timer de tema,
- timer de orador.

### Regla de destiempo
Si el tiempo se excede:
- el timer sigue,
- se muestra advertencia visible,
- queda registrado que hubo exceso.

## 7. Historial
### Debe permitir
- ver reuniones pasadas,
- ver temas tratados,
- ver votaciones,
- ver resultados,
- consultar auditoría base.
'@
Write-Utf8File -Path (Join-Path $root ".cursor\plans\01-mvp-functional-breakdown.md") -Content $content
$content = @'
# Domain, Events and Data Model

## Entidades principales

### User
Representa una persona autenticada.
- id
- fullName
- email
- passwordHash
- role
- isActive
- createdAt
- updatedAt

### Club
Representa un club o unidad institucional.
- id
- name
- code
- status

### Membership
Relación usuario-club.
- id
- userId
- clubId
- title
- isPresident
- activeFrom
- activeUntil

### Meeting
Representa una reunión distrital.
- id
- title
- description
- scheduledAt
- startedAt
- endedAt
- status
- currentTopicId
- createdById

### MeetingParticipant
Relación entre usuario y reunión.
- id
- meetingId
- userId
- canVote
- attendanceStatus
- joinedAt

### AgendaTopic
Tema dentro de una reunión.
- id
- meetingId
- title
- description
- order
- type
- estimatedDurationSec
- status

### VoteSession
Instancia de votación asociada a un tema.
- id
- meetingId
- topicId
- status
- openedAt
- closedAt
- openedById
- closedById

### Vote
Voto emitido por un participante.
- id
- voteSessionId
- userId
- clubId
- choice
- createdAt

### SpeakingRequest
Solicitud de palabra.
- id
- meetingId
- userId
- status
- position
- requestedAt
- acceptedAt
- cancelledAt

### TimerSession
Timer asociado a tema u orador.
- id
- meetingId
- topicId
- speakingRequestId
- type
- plannedDurationSec
- startedAt
- pausedAt
- endedAt
- overtimeSec

### AuditLog
Registro de eventos críticos.
- id
- meetingId
- actorUserId
- action
- entityType
- entityId
- metadataJson
- createdAt

## Enums sugeridos
- Role
- MeetingStatus
- TopicType
- TopicStatus
- VoteSessionStatus
- VoteChoice
- SpeakingRequestStatus
- TimerType
- AttendanceStatus
- AuditAction

## Eventos realtime sugeridos
- meeting.snapshot
- meeting.topic.changed
- meeting.timer.updated
- meeting.queue.updated
- meeting.vote.opened
- meeting.vote.closed
- meeting.vote.result
- meeting.presence.updated

## Snapshot mínimo para participante
- meeting status,
- current topic,
- current speaker,
- next speaker,
- active voting state,
- own voting state,
- timers,
- speaking queue.
'@
Write-Utf8File -Path (Join-Path $root ".cursor\plans\02-domain-events-and-data-model.md") -Content $content
$content = @'
# Backend Implementation Plan

## Objetivo
Implementar en NestJS una API modular y un gateway realtime confiable.

## Módulos
- auth
- users
- clubs
- meetings
- topics
- voting
- speaking-queue
- timers
- realtime
- audit-log
- exports

## Paso 1 — Bootstrap
- crear app NestJS,
- instalar Prisma,
- configurar config module,
- base de estructura por módulos.

## Paso 2 — Auth
- login con credenciales,
- JWT o session strategy,
- guards por rol,
- decoradores de permisos.

## Paso 3 — Meetings
- CRUD,
- estados de reunión,
- start / pause / finish,
- participants assignment.

## Paso 4 — Topics
- CRUD de temas,
- reorder,
- set current topic,
- validaciones por estado de reunión.

## Paso 5 — Voting
- open vote session,
- submit vote,
- close vote,
- aggregate result,
- detailed result for secretariat,
- audit log.

## Paso 6 — Speaking Queue
- request speaking turn,
- cancel request,
- approve / reorder,
- mark current speaker,
- publish queue updates.

## Paso 7 — Timers
- start/pause/reset topic timer,
- start/pause/reset speaking timer,
- overtime detection,
- realtime updates.

## Paso 8 — Exports e historial
- get meeting history,
- get vote history,
- export CSV inicialmente.

## Riesgos técnicos
- concurrencia en votos,
- reconnect en sockets,
- autorización por room,
- consistencia entre estado actual y eventos emitidos.

## Mitigaciones
- transacciones,
- constraints únicas,
- snapshot after join,
- tests de integración y concurrencia.
'@
Write-Utf8File -Path (Join-Path $root ".cursor\plans\03-backend-implementation-plan.md") -Content $content
$content = @'
# Frontend Implementation Plan

## Objetivo
Construir una app Next.js clara, rápida y enfocada en la operación de una reunión real.

## Rutas sugeridas
```text
/(public)/login
/(admin)/meetings
/(admin)/meetings/[meetingId]
/(admin)/meetings/[meetingId]/live
/(participant)/meetings
/(participant)/meetings/[meetingId]/live
/(shared)/history
```

## Componentes prioritarios
- LoginForm
- MeetingsTable
- MeetingHeader
- CurrentTopicCard
- TopicListSortable
- VoteActionPanel
- VoteResultSummary
- SpeakingQueueList
- RequestToSpeakButton
- TimerDisplay
- AdminLiveControls
- AuditSidebar

## Estado
- React Query para lecturas y mutaciones REST,
- socket context para subscripciones en vivo,
- resync automático en reconnect,
- stores chicas solo para estado efímero.

## Paso a paso
### Paso 1
- layout base,
- auth flow,
- guards por rol.

### Paso 2
- dashboard admin,
- CRUD de reuniones,
- CRUD de temas.

### Paso 3
- sala en vivo participante,
- sala en vivo secretaría,
- panels de estado en tiempo real.

### Paso 4
- panel de votación,
- resultados,
- historial de votos.

### Paso 5
- speaking queue,
- timers,
- feedback y alertas.

## Criterios UX
- botones táctiles grandes,
- lectura rápida en vertical,
- confirmaciones solo en acciones sensibles,
- toasts específicos,
- estados vacíos y errores cuidados.
'@
Write-Utf8File -Path (Join-Path $root ".cursor\plans\04-frontend-implementation-plan.md") -Content $content
$content = @'
# Realtime and Voting Plan

## Objetivo
Diseñar el flujo más sensible del MVP: reunión en vivo y votación auditada.

## Flujo de conexión
1. cliente hace login
2. cliente obtiene datos de reunión vía API
3. cliente se conecta al gateway
4. emite `meeting.join`
5. servidor valida permisos
6. servidor devuelve `meeting.snapshot`
7. cliente queda suscripto a eventos de la room

## Flujo de votación
1. secretaría abre una votación
2. backend crea VoteSession activa
3. servidor emite `vote.opened`
4. participantes ven panel
5. participante envía `vote.submit`
6. backend valida:
   - reunión activa
   - votación abierta
   - usuario autorizado
   - que no haya voto previo
7. backend persiste voto
8. servidor confirma al emisor
9. opcionalmente actualiza contador parcial solo a secretaría
10. secretaría cierra votación
11. backend calcula agregados
12. servidor emite `vote.results.available`

## Reglas
- nunca confiar en el cliente para estados finales,
- no exponer detalle nominal a participantes,
- si el usuario reconecta, consultar si ya votó,
- evitar doble click con disable + backend unique constraint.

## Indicadores de éxito
- 0 doble voto,
- 0 resultados divergentes,
- reconnect estable,
- tiempos de respuesta percibidos bajos,
- secretaría con control claro de apertura y cierre.
'@
Write-Utf8File -Path (Join-Path $root ".cursor\plans\05-realtime-voting-plan.md") -Content $content
$content = @'
# Testing and Rollout Plan

## Objetivo
Reducir riesgo antes de mostrar el MVP en ámbito institucional.

## Niveles de prueba
### Unit
- reglas de autorización,
- agregación de votos,
- manejo de speaking queue,
- cálculo de overtime.

### Integration
- login,
- CRUD reuniones,
- CRUD temas,
- open/submit/close voting,
- speaking request flow.

### E2E
- secretaría crea reunión,
- participantes ingresan,
- se cambia de tema,
- se abre votación,
- usuarios votan,
- se cierra votación,
- se consulta historial.

### Realtime stress básico
- múltiples conexiones a una misma reunión,
- reconexión,
- envío concurrente de votos.

## Checklist previo a demo
- datos demo cargados,
- usuarios demo separados por rol,
- una reunión preparada,
- temas listos,
- votación demo lista,
- vista participante responsive,
- vista secretaría estable,
- historial visible.

## Estrategia de rollout
1. demo interna del comité IT,
2. corrección de fricciones,
3. piloto controlado,
4. feedback institucional,
5. versión candidata para asamblea.
'@
Write-Utf8File -Path (Join-Path $root ".cursor\plans\06-testing-rollout-plan.md") -Content $content
Write-Host "Estructura .cursor generada correctamente." -ForegroundColor Green
