# Master Roadmap

## Objetivo general
Lanzar un MVP funcional para digitalizar reuniones distritales con:
- reuniones en vivo,
- moderaciÃ³n por secretarÃ­a,
- votaciÃ³n digital auditada,
- solicitud de palabra,
- timers,
- historial.

## Fase 0 â€” Base del repositorio
### Objetivo
Dejar listo el esqueleto tÃ©cnico.

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
- conexiÃ³n a PostgreSQL operativa,
- Prisma inicializado.

---

## Fase 1 â€” Dominio y autenticaciÃ³n
### Objetivo
Modelar usuarios, clubes, reuniones y roles.

### Tareas
- modelos User, Club, Membership, Meeting,
- autenticaciÃ³n,
- autorizaciÃ³n por rol,
- seed inicial,
- sesiÃ³n de usuario y contexto por reuniÃ³n.

### Definition of Done
- un usuario puede iniciar sesiÃ³n,
- secretarÃ­a y presidente reciben permisos distintos,
- datos base creados.

---

## Fase 2 â€” GestiÃ³n administrativa de reuniones
### Objetivo
Permitir a secretarÃ­a crear y preparar reuniones.

### Tareas
- CRUD de reuniones,
- CRUD de temas,
- ordenamiento de temas,
- asignaciÃ³n de participantes,
- estado borrador / programada / en vivo / finalizada.

### Definition of Done
- secretarÃ­a puede crear una reuniÃ³n completa y dejarla lista para iniciar.

---

## Fase 3 â€” Sala en vivo y sincronizaciÃ³n
### Objetivo
Sincronizar el estado de la reuniÃ³n entre todos los clientes.

### Tareas
- gateway websocket,
- room por reuniÃ³n,
- snapshot inicial,
- eventos de estado,
- cambio de tema en vivo,
- presencia bÃ¡sica de participantes.

### Definition of Done
- dos o mÃ¡s usuarios conectados ven el mismo estado casi en tiempo real.

---

## Fase 4 â€” VotaciÃ³n digital
### Objetivo
Resolver votaciones seguras y auditables.

### Tareas
- crear VoteSession,
- abrir/cerrar votaciÃ³n,
- emitir voto,
- prevenir doble voto,
- mostrar resultado agregado,
- panel detallado para secretarÃ­a.

### Definition of Done
- una votaciÃ³n puede ejecutarse de punta a punta con persistencia y auditorÃ­a.

---

## Fase 5 â€” Solicitud de palabra y timers
### Objetivo
Ordenar intervenciones y tiempos.

### Tareas
- speaking queue,
- solicitud de palabra,
- asignar orador actual y siguiente,
- timer general de tema,
- timer de intervenciÃ³n,
- estado de destiempo.

### Definition of Done
- la reuniÃ³n puede moderarse con flujo ordenado.

---

## Fase 6 â€” Historial, exportaciÃ³n y cierre
### Objetivo
Dejar trazabilidad posterior a la reuniÃ³n.

### Tareas
- historial de reuniones,
- historial de votaciones,
- audit log,
- exportaciÃ³n bÃ¡sica CSV o PDF futuro,
- resumen de resultados.

### Definition of Done
- la informaciÃ³n histÃ³rica es consultable y exportable.

---

## Fase 7 â€” QA y hardening
### Objetivo
Preparar release estable.

### Tareas
- pruebas funcionales,
- pruebas de concurrencia,
- manejo de errores,
- mejora de reconnect,
- pulido visual,
- validaciÃ³n con usuarios piloto.

### Definition of Done
- release candidate estable para prueba institucional.
