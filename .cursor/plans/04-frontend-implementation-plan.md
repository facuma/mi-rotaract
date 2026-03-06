# Frontend Implementation Plan

## Objetivo
Construir una app Next.js clara, rÃ¡pida y enfocada en la operaciÃ³n de una reuniÃ³n real.

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
- resync automÃ¡tico en reconnect,
- stores chicas solo para estado efÃ­mero.

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
- sala en vivo secretarÃ­a,
- panels de estado en tiempo real.

### Paso 4
- panel de votaciÃ³n,
- resultados,
- historial de votos.

### Paso 5
- speaking queue,
- timers,
- feedback y alertas.

## Criterios UX
- botones tÃ¡ctiles grandes,
- lectura rÃ¡pida en vertical,
- confirmaciones solo en acciones sensibles,
- toasts especÃ­ficos,
- estados vacÃ­os y errores cuidados.
