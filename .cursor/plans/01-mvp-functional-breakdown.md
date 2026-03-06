# MVP Functional Breakdown

## 1. Login y acceso
### Participante
- ingresa con usuario validado,
- ve solo reuniones donde participa.

### SecretarÃ­a
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

### Campos mÃ­nimos
- tÃ­tulo,
- descripciÃ³n,
- fecha programada,
- estado,
- club o distrito organizador,
- configuraciones generales.

## 3. Temas de agenda
### Tipos sugeridos
- DISCUSSION
- VOTING
- INFORMATIVE

### Campos mÃ­nimos
- tÃ­tulo,
- descripciÃ³n,
- orden,
- tipo,
- duraciÃ³n estimada,
- estado.

## 4. VotaciÃ³n
### Flujo
1. secretarÃ­a abre votaciÃ³n
2. participantes ven panel de voto
3. eligen SÃ­ / No / AbstenciÃ³n
4. confirman
5. backend persiste
6. secretarÃ­a cierra votaciÃ³n
7. resultado agregado se publica

### Reglas
- un voto por usuario por sesiÃ³n,
- no se vota fuera de ventana activa,
- detalle nominal visible solo para secretarÃ­a.

## 5. Solicitud de palabra
### Flujo
1. participante presiona pedir palabra
2. request queda en cola
3. secretarÃ­a ordena o acepta
4. se define orador actual
5. timer de intervenciÃ³n se actualiza

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
- consultar auditorÃ­a base.
