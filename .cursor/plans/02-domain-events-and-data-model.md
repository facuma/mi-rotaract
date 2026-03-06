# Domain, Events and Data Model

## Objetivo del documento
Definir el modelo de datos (fuente de verdad: `apps/api/prisma/schema.prisma`), los eventos de dominio que disparan auditoría y efectos secundarios, y los eventos realtime que sincronizan el estado de la reunión en vivo. Este plan alimenta el [03-backend-implementation-plan](03-backend-implementation-plan.md) y el [05-realtime-voting-plan](05-realtime-voting-plan.md).

---

## 1. Modelo de datos (resumen y reglas)

### 1.1 Entidades principales

| Entidad | Propósito | Relaciones clave |
|--------|-----------|------------------|
| **User** | Persona autenticada (administración o presidente de club) | memberships, meetingParticipants, speakingRequests |
| **Club** | Unidad institucional (club/distrito) | memberships, meetings |
| **Membership** | Usuario pertenece a club (con rol/título) | user, club |
| **Meeting** | Reunión distrital con estado y tema actual | creator, club, participants, topics, voteSessions, speakingRequests, timerSessions, auditLogs |
| **MeetingParticipant** | Participación en una reunión (puede votar, estado de asistencia) | user, meeting |
| **AgendaTopic** | Tema de agenda (discusión, votación, informativo) | meeting, voteSessions |
| **VoteSession** | Una instancia de votación sobre un tema | meeting, topic, votes |
| **Vote** | Un voto por usuario por sesión | session (VoteSession) |
| **SpeakingRequest** | Solicitud de palabra en cola | meeting, user |
| **TimerSession** | Timer de tema u orador | meeting (topicId o speakingRequestId opcionales) |
| **AuditLog** | Trazabilidad de acciones críticas | meeting (opcional) |

### 1.2 Roles de administración y votantes (semántica de negocio)

- **Administración (2 roles):** Representante distrital y Secretaría. Son los que administran reuniones, abren/cierran votaciones, gestionan agenda y cola de palabra.
- **Votantes:** Presidentes de los clubes. Quienes pueden votar en una reunión son los usuarios que son presidentes de algún club (vía `Membership.isPresident` en ese club) y que están asignados a la reunión como participantes con `MeetingParticipant.canVote = true`. No hay un rol genérico "participante" que vote: el derecho a voto corresponde a los presidentes de club.

En el schema actual, `User.role` (enum Role) y `Membership.title` / `Membership.isPresident` pueden usarse para expresar esto: los dos roles de administración como roles de usuario (o como títulos en la membresía al club distrito); el "presidente de club" como membresía con `isPresident: true` en un club (no en el distrito). Alinear guards y reglas de negocio con esta semántica. En la API, SECRETARY = Secretaría, PRESIDENT = Representante distrital; los votantes se validan por MeetingParticipant.canVote.

### 1.3 Enums (schema actual)

- **Role**: PARTICIPANT, SECRETARY, PRESIDENT (alinear con Representante distrital / Secretaría según implementación; los votantes se identifican por Membership.isPresident en un club).  
- **ClubStatus**: ACTIVE, INACTIVE  
- **MeetingStatus**: DRAFT, SCHEDULED, LIVE, PAUSED, FINISHED, ARCHIVED  
- **AttendanceStatus**: INVITED, JOINED, LEFT  
- **TopicType**: DISCUSSION, VOTING, INFORMATIVE  
- **TopicStatus**: PENDING, ACTIVE, DONE  
- **VoteSessionStatus**: OPEN, CLOSED  
- **VoteChoice**: YES, NO, ABSTAIN  
- **SpeakingRequestStatus**: PENDING, ACCEPTED, CANCELLED, DONE  

### 1.4 Reglas de consistencia

- **Un voto por usuario por VoteSession**: constraint único `(voteSessionId, userId)` en `Vote`.
- **Participante único por reunión**: `(meetingId, userId)` único en `MeetingParticipant`.
- **Transiciones de Meeting**: DRAFT → SCHEDULED → LIVE ⇄ PAUSED → FINISHED → ARCHIVED (definir en backend qué transiciones están permitidas).
- **VoteSession**: solo una sesión OPEN por (meetingId, topicId) en un momento dado; al cerrar se persiste closedAt y closedById.
- **Timers**: tipo `TOPIC` o `SPEAKER`; si es SPEAKER puede vincularse a `speakingRequestId`; `overtimeSec` registra exceso.

### 1.5 Diferencias documentación vs schema (a corregir en doc)

- **Vote**: en schema no existe `clubId`; el voto se asocia a la reunión vía VoteSession → Meeting. No añadir clubId salvo requisito futuro.
- **SpeakingRequest**: en schema no hay campo `cancelledAt`; el estado se refleja con `status = CANCELLED`.

---

## 2. Eventos de dominio (auditoría y efectos)

Son acciones de negocio que deben registrarse en **AuditLog** y/o disparar emisión realtime. Nomenclatura sugerida para `AuditLog.action`:

| Acción de negocio | action (AuditLog) | entityType | Notas |
|-------------------|-------------------|------------|--------|
| Crear reunión | meeting.created | Meeting | |
| Actualizar reunión | meeting.updated | Meeting | |
| Iniciar reunión | meeting.started | Meeting | |
| Pausar / reanudar | meeting.paused / meeting.resumed | Meeting | |
| Finalizar reunión | meeting.finished | Meeting | |
| Cambiar tema actual | meeting.topic.changed | AgendaTopic | entityId = topicId |
| Abrir votación | vote.session.opened | VoteSession | |
| Cerrar votación | vote.session.closed | VoteSession | |
| Emitir voto | vote.cast | Vote | detalle solo secretaría |
| Solicitud de palabra | speaking.request.created | SpeakingRequest | |
| Aceptar / cancelar / marcar hecho | speaking.request.updated | SpeakingRequest | |
| Asignar orador actual/siguiente | meeting.speaker.changed | Meeting | metadata: currentSpeakerId, nextSpeakerId |
| Iniciar/pausar timer | timer.started / timer.paused / timer.ended | TimerSession | |
| Participante une/abandona | participant.joined / participant.left | MeetingParticipant | |

Cada evento de dominio que afecte el estado visible en vivo debe, además de persistir (y auditar si aplica), **emitir el evento realtime** correspondiente (sección 3).

---

## 3. Eventos realtime (WebSocket)

Canal: **room por reunión** (`meeting:{meetingId}`). El cliente entra con `meeting.join` y recibe primero un **snapshot** (sección 4), luego eventos incrementales.

### 3.1 Listado de eventos (servidor → cliente)

| Evento | Cuándo se emite | Payload resumido |
|--------|------------------|------------------|
| **meeting.snapshot** | Tras `meeting.join` válido | Estado completo inicial (ver sección 4). |
| **meeting.updated** | Cambio de estado, título, fechas, currentTopicId, currentSpeakerId, nextSpeakerId | `{ meetingId, status?, currentTopicId?, currentSpeakerId?, nextSpeakerId?, ... }` |
| **meeting.topic.changed** | Secretaría cambia el tema actual | `{ meetingId, topicId, topic: AgendaTopic }` |
| **meeting.timer.updated** | Inicio/pausa/fin/tic de timer (o intervalo periódico) | `{ meetingId, timer: TimerSession, elapsedSec?, overtimeSec? }` |
| **meeting.queue.updated** | Cambios en cola de palabra (orden, aceptar, cancelar) | `{ meetingId, queue: SpeakingRequest[] }` |
| **meeting.vote.opened** | Secretaría abre votación en un tema | `{ meetingId, voteSession: VoteSession, topicId }` |
| **meeting.vote.closed** | Secretaría cierra votación | `{ meetingId, voteSessionId, topicId }` |
| **meeting.vote.result** | Resultado agregado (sí/no/abstención) visible para todos | `{ meetingId, voteSessionId, topicId, counts: { yes, no, abstain }, total }` |
| **meeting.presence.updated** | Lista de participantes conectados / estado JOINED/LEFT | `{ meetingId, participants: { userId, attendanceStatus, ... }[] }` |

### 3.2 Eventos cliente → servidor (acciones)

- `meeting.join` — une al usuario a la room (requiere permisos).
- `vote.submit` — envía voto (payload: `{ voteSessionId, choice }`). Servidor valida y responde con confirmación o error; luego puede emitir actualización parcial solo a secretaría si se desea.
- Solicitud de palabra: según plan backend (ej. `speaking.request` o similar).

### 3.3 Convención de nombres

- Namespace por reunión: `meeting.<área>.<evento>`.
- En plan 05 se usan también formas cortas como `vote.opened`; unificar con `meeting.vote.opened` dentro de la room para evitar colisiones entre reuniones.

---

## 4. Snapshot mínimo (estado inicial para participante)

Al unirse a la room, el cliente recibe **meeting.snapshot** con todo lo necesario para pintar la UI sin más peticiones REST. Estructura sugerida:

```ts
{
  meeting: {
    id: string;
    title: string;
    status: MeetingStatus;
    currentTopicId: string | null;
    currentSpeakerId: string | null;
    nextSpeakerId: string | null;
    startedAt: string | null;
    // opcionales: scheduledAt, endedAt
  };
  currentTopic: AgendaTopic | null;   // tema actual (si hay)
  topics: AgendaTopic[];               // lista ordenada de temas
  activeVote: {                        // si hay votación abierta
    voteSessionId: string;
    topicId: string;
    topicTitle: string;
    openedAt: string;
  } | null;
  ownVote: { voteSessionId: string; choice: VoteChoice } | null;  // si ya votó en la sesión abierta
  voteResult: {                       // última votación cerrada (si se quiere mostrar)
    voteSessionId: string;
    topicId: string;
    counts: { yes: number; no: number; abstain: number };
    total: number;
  } | null;
  timers: Array<{
    id: string;
    type: 'TOPIC' | 'SPEAKER';
    topicId?: string;
    speakingRequestId?: string;
    plannedDurationSec: number;
    startedAt: string;
    pausedAt?: string;
    overtimeSec: number;
    elapsedSec?: number;               // calculado si está en curso
  }>;
  speakingQueue: SpeakingRequest[];    // cola de solicitudes (orden, estado)
  participants: Array<{                // presencia/estado en reunión
    userId: string;
    fullName?: string;
    attendanceStatus: AttendanceStatus;
    canVote: boolean;
  }>;
}
```

- **Secretaría**: puede recibir el mismo snapshot con datos extra (ej. detalle nominal de votos en `voteResult` o en un evento aparte).
- **Reconnect**: al reconectar, el cliente debe recibir de nuevo `meeting.snapshot` para evitar desincronización.

---

## 5. Relación con otros planes

- **01-mvp-functional-breakdown**: estados de reunión, tipos de tema, flujos de votación y palabra quedan reflejados en este modelo y en los eventos.
- **03-backend-implementation-plan**: módulos (meetings, topics, voting, speaking-queue, timers, audit-log, realtime) implementan persistencia según este schema y emiten los eventos aquí definidos.
- **05-realtime-voting-plan**: flujos de conexión, `meeting.join`, `vote.submit` y `vote.opened` / `vote.results.available` se alinean con la sección 3 (unificar nombres a `meeting.vote.*` en la room).

---

## 6. Checklist de implementación

- [ ] Schema Prisma como única fuente de verdad; documento actualizado si se añaden campos.
- [ ] AuditLog poblado en todas las acciones listadas en sección 2.
- [ ] Gateway realtime emite los eventos de la sección 3 con payloads definidos.
- [ ] Snapshot generado en backend según estructura de sección 4.
- [ ] Reglas de consistencia (sección 1.3) aplicadas en servicios (transacciones, constraints).
- [ ] Unificación de nombres de eventos con plan 05 (`meeting.vote.*`).
