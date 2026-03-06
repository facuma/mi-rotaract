# Realtime and Voting Plan

## Objetivo
DiseÃ±ar el flujo mÃ¡s sensible del MVP: reuniÃ³n en vivo y votaciÃ³n auditada.

## Flujo de conexiÃ³n
1. cliente hace login
2. cliente obtiene datos de reuniÃ³n vÃ­a API
3. cliente se conecta al gateway
4. emite `meeting.join`
5. servidor valida permisos
6. servidor devuelve `meeting.snapshot`
7. cliente queda suscripto a eventos de la room

## Flujo de votaciÃ³n
1. secretarÃ­a abre una votaciÃ³n
2. backend crea VoteSession activa
3. servidor emite `vote.opened`
4. participantes ven panel
5. participante envÃ­a `vote.submit`
6. backend valida:
   - reuniÃ³n activa
   - votaciÃ³n abierta
   - usuario autorizado
   - que no haya voto previo
7. backend persiste voto
8. servidor confirma al emisor
9. opcionalmente actualiza contador parcial solo a secretarÃ­a
10. secretarÃ­a cierra votaciÃ³n
11. backend calcula agregados
12. servidor emite `vote.results.available`

## Reglas
- nunca confiar en el cliente para estados finales,
- no exponer detalle nominal a participantes,
- si el usuario reconecta, consultar si ya votÃ³,
- evitar doble click con disable + backend unique constraint.

## Indicadores de Ã©xito
- 0 doble voto,
- 0 resultados divergentes,
- reconnect estable,
- tiempos de respuesta percibidos bajos,
- secretarÃ­a con control claro de apertura y cierre.
