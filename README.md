# Mi Rotaract — Digitalización de reuniones distritales

Aplicación para gestionar reuniones distritales de Rotaract: votaciones en vivo, cola de oradores, timers y auditoría.

## Stack

- **Frontend:** Next.js 15, React 19, React Query, Sonner (toasts)
- **Backend:** NestJS, Prisma
- **Realtime:** WebSockets (Socket.IO sobre NestJS Gateway)
- **Base de datos:** PostgreSQL

## Roles

| Rol | Descripción |
|-----|-------------|
| **SECRETARY** | Secretaría — administración de reuniones |
| **PRESIDENT** | Representante distrital — administración |
| **PARTICIPANT** | Presidentes de club u otros — pueden votar si `MeetingParticipant.canVote` es true |

## Estructura del monorepo

```text
mi-rotaract/
├── apps/
│   ├── web/     → Next.js (frontend)
│   └── api/     → NestJS (backend + WebSocket)
├── packages/
│   └── shared-types/
└── .env         → Variables de entorno (en la raíz)
```

## Requisitos

- **Node.js 20+**
- **pnpm**
- **PostgreSQL** (local o Docker)

## Inicialización

### 1. Instalar dependencias

```bash
pnpm install
```

### 2. Configurar variables de entorno

```bash
cp .env.example .env
```

Editar `.env` y configurar la **URL de conexión a PostgreSQL**:

```env
# Ejemplo para PostgreSQL local
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/mi_rotaract"

# Si usás otro usuario/puerto/base:
# DATABASE_URL="postgresql://usuario:contraseña@localhost:5432/nombre_base"
```

Crear la base de datos en PostgreSQL si no existe:

```sql
CREATE DATABASE mi_rotaract;
```

### 3. Aplicar el schema y sincronizar la base

```bash
# Genera el cliente Prisma y sincroniza el schema con la BD (crea tablas)
pnpm db:push
```

Para usar migraciones versionadas en lugar de push:

```bash
pnpm db:migrate
```

### 4. Ejecutar el seed

```bash
pnpm db:seed
```

Crea usuarios de prueba, clubes y una reunión de ejemplo.

### 5. Levantar la aplicación

```bash
pnpm dev
```

- **Web:** http://localhost:3000  
- **API:** http://localhost:3001 (health: http://localhost:3001/health)

## Usuarios de prueba

Contraseña para todos: `password123`

| Email | Rol | Descripción |
|-------|-----|-------------|
| `secretaria@mirotaract.org` | SECRETARY | Secretaría (admin) |
| `representante@mirotaract.org` | PRESIDENT | Representante distrital (admin) |
| `presidente.alpha@mirotaract.org` | PARTICIPANT | Presidente Club Alpha (votante) |
| `presidente.beta@mirotaract.org` | PARTICIPANT | Presidente Club Beta (votante) |

## Variables de entorno

Archivo: `.env` en la raíz del monorepo.

| Variable | Descripción |
|----------|-------------|
| `DATABASE_URL` | Conexión PostgreSQL: `postgresql://usuario:contraseña@host:puerto/nombre_bd` |
| `PORT` | Puerto de la API (default: 3001) |
| `JWT_SECRET` | Secreto para firmar tokens JWT |
| `CORS_ORIGIN` | Origen permitido (ej: http://localhost:3000) |
| `NEXT_PUBLIC_API_URL` | URL de la API para el frontend |
| `NEXT_PUBLIC_WS_URL` | (Opcional) URL del WebSocket si es distinta |

## Comandos útiles

| Comando | Descripción |
|---------|-------------|
| `pnpm dev` | Levanta API y Web en modo desarrollo |
| `pnpm build` | Construye todos los paquetes |
| `pnpm db:generate` | Genera cliente Prisma |
| `pnpm db:push` | Sincroniza schema con la BD (sin migraciones) |
| `pnpm db:migrate` | Ejecuta migraciones Prisma |
| `pnpm db:seed` | Ejecuta el seed (usuarios, clubes, reunión de ejemplo) |

## Funcionalidades implementadas

- **Autenticación:** Login JWT, guards por rol
- **Reuniones:** CRUD, estados (DRAFT, SCHEDULED, LIVE, PAUSED, FINISHED)
- **Temas de agenda:** Ordenar, marcar tema actual
- **Sala en vivo:** WebSocket con snapshot (tema, votación, timer, cola)
- **Votación:** Abrir/cerrar por admin, voto REST y WebSocket, validación `canVote`
- **Cola de oradores:** Pedir palabra, aceptar, orador actual/siguiente
- **Timers:** Iniciar/detener timer por tema
- **Historial:** Auditoría por reunión, listado de votaciones, export CSV
- **Sidebar extensible:** Navegación con ítems por rol (Reuniones, Historial)
- **UX:** Toasts, estados vacíos, botones táctiles, confirmaciones críticas

## Cursor Kit

- `.cursor/rules/` — Reglas de producto, arquitectura, frontend, backend
- `.cursor/agents/` — Agentes especializados
- `.cursor/plans/` — Planes de implementación
