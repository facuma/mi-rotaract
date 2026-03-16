# Mi Rotaract — Digitalización de reuniones distritales

Aplicación para gestionar reuniones distritales de Rotaract: votaciones en vivo, cola de oradores, timers, módulos distritales y desarrollo profesional, con auditoría completa.

---

## Stack

- **Frontend:** Next.js 15, React 19, React Query, Sonner (toasts), Tailwind CSS
- **Backend:** NestJS (modular por dominio), Prisma
- **Realtime:** WebSockets (Socket.IO sobre NestJS Gateway)
- **Base de datos:** PostgreSQL

---

## Roles principales

| Rol | Descripción |
|-----|-------------|
| **SUPER_ADMIN** | Administración global del distrito / plataforma |
| **SECRETARY** | Secretaría — administración operativa de reuniones y módulos distritales |
| **PRESIDENT** | Representante distrital / presidentes de club con permisos avanzados según contexto |
| **PARTICIPANT** | Presidentes de club u otros — pueden votar si `MeetingParticipant.canVote` es `true` |

---

## Estructura del monorepo

```text
mi-rotaract/
├── apps/
│   ├── web/                     → Next.js (frontend)
│   └── api/                     → NestJS (backend + WebSocket)
├── packages/
│   └── shared-types/            → Tipos/DTOs compartidos (dominio)
└── .env                         → Variables de entorno de la plataforma
```

---

## Instalación y puesta en marcha

### 1. Requisitos

- **Node.js 20+**
- **pnpm** (gestor de paquetes)
- **PostgreSQL** (local o Docker)

Si no tenés PostgreSQL instalado, la forma más simple para desarrollo es usar **Docker** (ver sección siguiente).

### 2. Instalar PostgreSQL (opción recomendada: Docker)

#### Opción A — Docker (rápido para desarrollo)

1. Instalar Docker Desktop (Windows/Mac) o Docker Engine (Linux).
2. Ejecutar en una terminal:

```bash
docker run --name mi-rotaract-postgres \
  -e POSTGRES_USER=postgres \
  -e POSTGRES_PASSWORD=postgres \
  -e POSTGRES_DB=mi_rotaract \
  -p 5432:5432 \
  -v mi-rotaract-pgdata:/var/lib/postgresql/data \
  -d postgres:16
```

- El contenedor expone PostgreSQL en `localhost:5432`.
- La base `mi_rotaract` y el usuario/contraseña `postgres/postgres` quedan listos para usar.
- La `DATABASE_URL` sugerida para `.env` quedaría:

```env
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/mi_rotaract"
```

Para detener o iniciar el contenedor:

```bash
docker stop mi-rotaract-postgres
docker start mi-rotaract-postgres
```

#### Opción B — Instalación nativa

1. Descargar PostgreSQL desde la página oficial o el gestor de paquetes de tu sistema.
2. Durante la instalación:
   - Definir un usuario (por ejemplo `postgres`).
   - Definir contraseña (por ejemplo `postgres` en desarrollo).
   - Elegir un puerto (por defecto `5432`).
3. Crear la base de datos `mi_rotaract` (desde `psql`, PgAdmin u otra herramienta).

La `DATABASE_URL` deberá coincidir con los datos configurados, por ejemplo:

```env
DATABASE_URL="postgresql://usuario:contraseña@localhost:5432/mi_rotaract"
```

### 3. Instalar dependencias

```bash
pnpm install
```

### 4. Configurar variables de entorno

1. Copiar el archivo de ejemplo:

```bash
cp .env.example .env
```

2. Editar `.env` y configurar al menos:

```env
# Base de datos (ejemplo local)
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/mi_rotaract"

# API
PORT=3001
JWT_SECRET="cambia-esto-por-un-secreto-fuerte"
CORS_ORIGIN="http://localhost:3000"

# Frontend
NEXT_PUBLIC_API_URL="http://localhost:3001"
NEXT_PUBLIC_WS_URL="http://localhost:3001"
```

3. Crear la base de datos en PostgreSQL si no existe (si no usaste la opción Docker con `POSTGRES_DB`):

```sql
CREATE DATABASE mi_rotaract;
```

### 5. Aplicar schema y migraciones

Usando `db:push` (rápido para desarrollo):

```bash
pnpm db:push
```

O usando migraciones versionadas:

```bash
pnpm db:migrate
```

### 6. Ejecutar el seed

```bash
pnpm db:seed
```

Esto crea usuarios de prueba, clubes y datos iniciales de módulos clave.

### 7. Levantar la aplicación

```bash
pnpm dev
```

- **Web:** `http://localhost:3000`  
- **API:** `http://localhost:3001` (health: `http://localhost:3001/health`)

---

## Condiciones previas para deploy con Docker

Para entornos de prueba / staging / producción se recomienda correr la plataforma con Docker (o Docker Compose).

Antes de desplegar:

- **Base de datos**
  - Tener una instancia de PostgreSQL accesible desde la API (puede ser contenedor Docker o servicio gestionado).
  - Definir base de datos dedicada (por ejemplo `mi_rotaract_prod`).
  - Configurar usuario con contraseña fuerte y acceso restringido por red.

- **Variables de entorno**
  - Completar `.env` (o variables de entorno del orquestador) con valores productivos:
    - `DATABASE_URL` apuntando a la instancia real.
    - `JWT_SECRET` fuerte y no compartido.
    - `CORS_ORIGIN` con el dominio real del frontend.
    - `NEXT_PUBLIC_API_URL` y `NEXT_PUBLIC_WS_URL` con las URLs públicas del backend.

- **Docker / Orquestador**
  - Definir al menos dos servicios:
    - `api` (NestJS) → expone el puerto interno (por ejemplo `3001`).
    - `web` (Next.js) → expone el puerto HTTP externo (por ejemplo `3000` o `80` detrás de un reverse proxy).
  - Conectar ambos servicios a la misma red de Docker o red del cluster.
  - Montar volumen de logs / adjuntos si se usa filesystem para `attachments`.

Ejemplo mínimo de contenedor de API (imagen construida previamente):

```bash
docker run --name mi-rotaract-api \
  --env-file .env \
  -p 3001:3001 \
  mi-rotaract-api:latest
```

Y para el frontend, una vez construida la imagen:

```bash
docker run --name mi-rotaract-web \
  --env NEXT_PUBLIC_API_URL="https://api.mi-rotaract.org" \
  --env NEXT_PUBLIC_WS_URL="wss://api.mi-rotaract.org" \
  -p 3000:3000 \
  mi-rotaract-web:latest
```

En escenarios reales se recomienda:

- Poner un **reverse proxy** (Nginx/Traefik) delante de `web`/`api`.
- Usar **HTTPS** con certificados válidos.
- Configurar backups periódicos de la base de datos PostgreSQL.

---

## Usuarios de prueba

**Contraseña para todos:** `password123`

| Email | Rol | Descripción |
|-------|-----|-------------|
| `secretaria@mirotaract.org` | SECRETARY | Secretaría (admin) |
| `representante@mirotaract.org` | PRESIDENT | Representante distrital (admin) |
| `presidente.alpha@mirotaract.org` | PARTICIPANT | Presidente Club Alpha (votante) |
| `presidente.beta@mirotaract.org` | PARTICIPANT | Presidente Club Beta (votante) |

---

## Variables de entorno (resumen)

Archivo: `.env` en la raíz del monorepo.

| Variable | Descripción |
|----------|-------------|
| `DATABASE_URL` | Conexión PostgreSQL: `postgresql://usuario:contraseña@host:puerto/nombre_bd` |
| `PORT` | Puerto de la API (default: 3001) |
| `JWT_SECRET` | Secreto para firmar tokens JWT |
| `CORS_ORIGIN` | Origen permitido (ej: `http://localhost:3000`) |
| `NEXT_PUBLIC_API_URL` | URL base de la API para el frontend |
| `NEXT_PUBLIC_WS_URL` | URL del WebSocket (si difiere de la API) |

---

## Comandos útiles

| Comando | Descripción |
|---------|-------------|
| `pnpm dev` | Levanta API y Web en modo desarrollo |
| `pnpm build` | Construye todos los paquetes |
| `pnpm db:generate` | Genera cliente Prisma |
| `pnpm db:push` | Sincroniza schema con la BD (sin migraciones) |
| `pnpm db:migrate` | Ejecuta migraciones Prisma |
| `pnpm db:seed` | Ejecuta el seed (usuarios, clubes, datos iniciales) |

---

## Módulos backend (apps/api)

Los módulos de NestJS están organizados por dominio. Algunos de los principales:

- **Auth**
  - Login, registro y recuperación de contraseña.
  - Actualización de perfil propio, cambio de contraseña.
  - JWT, estrategias y guards por rol.

- **Users**
  - Gestión de usuarios del distrito.
  - Creación individual y **carga masiva** (bulk) desde CSV.

- **Clubs / Club**
  - CRUD de clubes.
  - Vista y edición de datos del club propio.

- **Club Members (`club-members`)**
  - Alta, baja y actualización de socios de club.
  - Cambio de estado del socio (activo/inactivo, etc.).

- **Club Projects (`club-projects`)**
  - Creación y gestión de proyectos de club.
  - Seguimiento de avances y cambio de estado.

- **Club Reports (`club-reports`)**
  - Informes periódicos de club (módulo “Mi club”).
  - Creación, edición y consulta de reportes.

- **Meetings**
  - CRUD de reuniones distritales.
  - Estados: `DRAFT`, `SCHEDULED`, `LIVE`, `PAUSED`, `FINISHED`.
  - Integración con cola de oradores, votaciones y timers.

- **District**
  - `district/clubs`: gestión de clubes a nivel distrito.
  - `district/periods`: periodos distritales (gestión de años rotarios).
  - `district/committees`: comités distritales, actividades y objetivos.
  - `district/reports`: informes distritales consolidados.

- **Events**
  - Gestión de eventos distritales.
  - Listado, creación, edición y publicación de eventos.

- **Desarrollo profesional**
  - `opportunities`: oportunidades de desarrollo profesional y laboral.
  - `talent`: perfiles de talento de rotaractianos (búsqueda de talento).

- **Profile (`profile`)**
  - Perfil personal y profesional del usuario.
  - Visibilidad de perfil, datos básicos y profesionales.

- **Attachments (`attachments`)**
  - Gestión de archivos adjuntos (evidencias, documentos).
  - Soporte para distintos backends de almacenamiento (filesystem, R2, etc.).

- **Bulk**
  - Infraestructura común para cargas masivas vía CSV.
  - Tipos de resultado, parser y módulo compartido.

- **Dashboard**
  - Indicadores y métricas clave para la pantalla de inicio.

- **Email**
  - Envío de correos para recuperación de contraseña y notificaciones.

- **Audit**
  - Registro de acciones críticas (quién, cuándo, en qué contexto).

---

## Módulos frontend (apps/web)

Rutas principales del frontend:

- **Autenticación y seguridad**
  - `/` → Login.
  - `/configuracion/seguridad` → Cambio de contraseña y seguridad de la cuenta.
  - `/recuperar-contrasena`, `/restablecer` → Flujo de recuperación y reseteo.
  - `/register` → Registro de nuevos usuarios (según reglas de negocio).

- **Dashboard**
  - `/dashboard` → Vista general con métricas e indicadores.

- **Módulo “Mi club”**
  - `/club` → Resumen del club.
  - `/club/socios` y `/club/socios/[id]` → Gestión de socios.
  - `/club/proyectos` y `/club/proyectos/[id]` → Proyectos de club.
  - `/club/informes` y `/club/informes/[id]` → Informes de club (“Mi club”).

- **Reuniones**
  - `/meetings` → Listado de reuniones para el usuario.
  - `/admin/meetings` y `/admin/meetings/[id]` → Gestión administrativa de reuniones.

- **Distrito (admin)**
  - `/admin/district` → Panel distrital.
  - `/admin/district/clubes` y `/admin/district/clubes/[id]` → Administración de clubes.
  - `/admin/district/comites` y `/admin/district/comites/[id]` → Comités distritales.
  - `/admin/district/informes` y `/admin/district/informes/[id]` → Informes distritales.

- **Eventos**
  - `/eventos` y `/eventos/[id]` → Listado y detalle de eventos.
  - `/eventos/pasados` → Historial de eventos.
  - `/admin/eventos` y rutas anidadas `/nuevo`, `/[id]/editar` → Gestión de eventos.

- **Desarrollo profesional**
  - `/desarrollo-profesional` → Hub de desarrollo profesional.
  - `/desarrollo-profesional/oportunidades` y `/desarrollo-profesional/oportunidades/[id]` → Oportunidades.
  - `/desarrollo-profesional/talento` y `/desarrollo-profesional/talento/[userId]` → Directorio de talento.

- **Perfil y configuración**
  - `/configuracion/perfil` → Configuración de perfil (datos básicos).
  - `/perfil` y subrutas → Perfil público / profesional del usuario.

Cada ruta consume los módulos del backend correspondientes y aplica las reglas de roles definidas en las reglas del proyecto.

---

## Funcionalidades clave actuales

- **Autenticación y seguridad**
  - Login JWT, guards por rol y protección de rutas.
  - Cambio de contraseña, recuperación y reseteo vía email.

- **Reuniones distritales**
  - CRUD de reuniones y estado en vivo.
  - Temas de agenda, cambio de tema actual.
  - Cola de oradores, solicitud de palabra y orador actual/siguiente.
  - Votaciones (Sí / No / Abstención) con validación de `canVote`.
  - Timers por tema, con visibilidad en tiempo real para participantes.

- **Módulo Mi club**
  - Gestión de socios, proyectos y reportes de club.
  - Carga de evidencias y adjuntos (según configuración de storage).

- **Módulo distrital**
  - Administración de clubes, periodos, comités y reportes a nivel distrito.
  - Métricas y dashboard distrital.

- **Desarrollo profesional**
  - Publicación y gestión de oportunidades.
  - Búsqueda de talento dentro del distrito.

- **UX y auditoría**
  - Estados vacíos cuidados, toasts y confirmaciones críticas.
  - Auditoría de acciones relevantes (según reglas de seguridad del proyecto).

---

## Cursor Kit

- `.cursor/rules/` — Reglas de producto, arquitectura, frontend, backend.
- `.cursor/agents/` — Agentes especializados para tareas guiadas.
- `.cursor/plans/` — Planes de implementación por módulo.
