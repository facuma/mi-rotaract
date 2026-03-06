# Testing and Rollout Plan

## Objetivo
Reducir riesgo antes de mostrar el MVP en Ã¡mbito institucional.

## Niveles de prueba
### Unit
- reglas de autorizaciÃ³n,
- agregaciÃ³n de votos,
- manejo de speaking queue,
- cÃ¡lculo de overtime.

### Integration
- login,
- CRUD reuniones,
- CRUD temas,
- open/submit/close voting,
- speaking request flow.

### E2E
- secretarÃ­a crea reuniÃ³n,
- participantes ingresan,
- se cambia de tema,
- se abre votaciÃ³n,
- usuarios votan,
- se cierra votaciÃ³n,
- se consulta historial.

### Realtime stress bÃ¡sico
- mÃºltiples conexiones a una misma reuniÃ³n,
- reconexiÃ³n,
- envÃ­o concurrente de votos.

## Checklist previo a demo
- datos demo cargados,
- usuarios demo separados por rol,
- una reuniÃ³n preparada,
- temas listos,
- votaciÃ³n demo lista,
- vista participante responsive,
- vista secretarÃ­a estable,
- historial visible.

## Estrategia de rollout
1. demo interna del comitÃ© IT,
2. correcciÃ³n de fricciones,
3. piloto controlado,
4. feedback institucional,
5. versiÃ³n candidata para asamblea.
