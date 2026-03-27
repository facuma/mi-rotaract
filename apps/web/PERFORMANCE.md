# Baseline y validacion de performance

## Objetivo

Medir antes/despues de los cambios para asegurar menos requests duplicadas y menor latencia percibida en navegacion.

## Rutas a medir

- `/meetings`
- `/admin/meetings`
- `/eventos`
- `/talento`

## Procedimiento

1. Abrir DevTools en `Network` y activar `Disable cache`.
2. Navegar desde login a cada ruta y registrar:
   - cantidad total de requests,
   - requests a API (`/meetings`, `/events`, `/talent`, `/clubs`),
   - tiempo hasta primer render util.
3. En React DevTools Profiler grabar interaccion en:
   - cambio de filtros en `eventos`,
   - busqueda en `talento`,
   - apertura/cierre de modales en `admin/clubs`.
4. Repetir 3 veces y promediar.

## KPI objetivo

- Reduccion de 30% a 50% de requests redundantes en filtros/buscadores.
- Menor cantidad de renders en componentes de layout/auth.
- Sin regresiones funcionales en creacion/edicion/listados.

## Checklist de smoke

- Login y redireccion por rol.
- Navegacion: `dashboard -> meetings -> eventos -> talento -> perfil`.
- Permisos: usuario no admin no debe entrar a rutas de admin.
- Carga de avatar en sidebar y header sin request duplicada visible por mount.
