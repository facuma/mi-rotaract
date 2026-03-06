# Backend Implementation Plan

## Objetivo
Implementar en NestJS una API modular y un gateway realtime confiable.

## MÃ³dulos
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

## Paso 1 â€” Bootstrap
- crear app NestJS,
- instalar Prisma,
- configurar config module,
- base de estructura por mÃ³dulos.

## Paso 2 â€” Auth
- login con credenciales,
- JWT o session strategy,
- guards por rol,
- decoradores de permisos.

## Paso 3 â€” Meetings
- CRUD,
- estados de reuniÃ³n,
- start / pause / finish,
- participants assignment.

## Paso 4 â€” Topics
- CRUD de temas,
- reorder,
- set current topic,
- validaciones por estado de reuniÃ³n.

## Paso 5 â€” Voting
- open vote session,
- submit vote,
- close vote,
- aggregate result,
- detailed result for secretariat,
- audit log.

## Paso 6 â€” Speaking Queue
- request speaking turn,
- cancel request,
- approve / reorder,
- mark current speaker,
- publish queue updates.

## Paso 7 â€” Timers
- start/pause/reset topic timer,
- start/pause/reset speaking timer,
- overtime detection,
- realtime updates.

## Paso 8 â€” Exports e historial
- get meeting history,
- get vote history,
- export CSV inicialmente.

## Riesgos tÃ©cnicos
- concurrencia en votos,
- reconnect en sockets,
- autorizaciÃ³n por room,
- consistencia entre estado actual y eventos emitidos.

## Mitigaciones
- transacciones,
- constraints Ãºnicas,
- snapshot after join,
- tests de integraciÃ³n y concurrencia.
