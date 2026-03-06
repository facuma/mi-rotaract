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
RelaciÃ³n usuario-club.
- id
- userId
- clubId
- title
- isPresident
- activeFrom
- activeUntil

### Meeting
Representa una reuniÃ³n distrital.
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
RelaciÃ³n entre usuario y reuniÃ³n.
- id
- meetingId
- userId
- canVote
- attendanceStatus
- joinedAt

### AgendaTopic
Tema dentro de una reuniÃ³n.
- id
- meetingId
- title
- description
- order
- type
- estimatedDurationSec
- status

### VoteSession
Instancia de votaciÃ³n asociada a un tema.
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
Registro de eventos crÃ­ticos.
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

## Snapshot mÃ­nimo para participante
- meeting status,
- current topic,
- current speaker,
- next speaker,
- active voting state,
- own voting state,
- timers,
- speaking queue.
