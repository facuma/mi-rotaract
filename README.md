# Rotaract SGI — Cursor Kit para MVP de reuniones distritales

Este kit traduce la idea del proyecto **"Digitalización de reuniones distritales"** a un entorno de trabajo práctico para Cursor, con contexto persistente, agentes especializados y planes de ejecución.

## Stack objetivo
- **Frontend:** Next.js
- **Backend:** NestJS
- **Realtime:** WebSockets (Socket.IO sobre NestJS Gateway)
- **ORM:** Prisma
- **Base de datos:** PostgreSQL

## Qué incluye
- `.cursor/rules/` → reglas de producto, arquitectura, frontend, backend, base de datos, realtime, UX y calidad.
- `.cursor/agents/` → agentes especializados para producto, arquitectura, frontend, backend, base de datos, realtime, QA y UX.
- `.cursor/plans/` → roadmap maestro, alcance funcional del MVP, dominio de datos, backend, frontend, realtime y testing.
- `scripts/setup-cursor.ps1` → script PowerShell que recrea automáticamente esta estructura.

## Desarrollo local (Fase 0)

Requisitos: **Node.js 20+**, **pnpm**, **PostgreSQL** (local o Docker).

1. Clonar / abrir el repo y instalar dependencias (puede tardar unos minutos; dejar que termine para que se creen todos los `node_modules`):
   ```bash
   pnpm install
   ```
2. Copiar variables de entorno y configurar la base de datos:
   ```bash
   cp .env.example .env
   # Editar .env: DATABASE_URL (ej: postgresql://user:password@localhost:5432/mi_rotaract), JWT_SECRET, CORS_ORIGIN si aplica.
   ```
3. Crear la base en PostgreSQL y aplicar migraciones de Prisma:
   ```bash
   pnpm db:push
   # o: pnpm db:migrate
   ```
4. Ejecutar el seed para crear usuarios y reunión de ejemplo:
   ```bash
   pnpm db:seed
   ```
   **Usuarios de prueba** (contraseña: `password123`):
   - `secretaria@mirotaract.org` — Secretaría (administración)
   - `representante@mirotaract.org` — Representante distrital (administración)
   - `presidente.alpha@mirotaract.org` — Presidente Club Alpha (votante)
   - `presidente.beta@mirotaract.org` — Presidente Club Beta (votante)
5. Construir paquetes y levantar frontend y API:
   ```bash
   pnpm build
   pnpm dev
   ```
   - Web: http://localhost:3000  
   - API: http://localhost:3001 (health: http://localhost:3001/health)

**Variables de entorno** (ver `.env.example`): `DATABASE_URL`, `PORT`, `JWT_SECRET`, `CORS_ORIGIN` (API); `NEXT_PUBLIC_API_URL`, opcionalmente `NEXT_PUBLIC_WS_URL` (web).

## Cómo usarlo
1. Copiá la carpeta `.cursor` dentro del root del repo.
2. Ejecutá el script si querés regenerar la estructura:
   ```powershell
   Set-ExecutionPolicy -Scope Process Bypass
   .\scripts\setup-cursor.ps1
   ```
3. Abrí Cursor en el proyecto y empezá por:
   - `.cursor/plans/00-master-roadmap.md`
   - `.cursor/rules/00-project-context.mdc`
   - `.cursor/agents/solution-architect.md`

## Resultado esperado
Con este kit, Cursor debería poder:
- Entender el **contexto institucional y funcional** del proyecto.
- Mantener coherencia entre **Next.js + NestJS + Prisma + PostgreSQL + WebSockets**.
- Construir el MVP con foco en:
  - reuniones en vivo,
  - votación en tiempo real,
  - solicitud de palabra,
  - timers,
  - trazabilidad,
  - historial,
  - administración por secretaría,
  - experiencia mobile-first.

## Recomendación de repositorio
Monorepo simple:
```text
/apps
  /web   -> Next.js
  /api   -> NestJS
/packages
  /shared-types
  /ui
  /config
```

## Orden sugerido de implementación
1. Modelo de datos.
2. Autenticación y roles.
3. CRUD de reuniones y temas.
4. Sala en tiempo real.
5. Votación en vivo.
6. Solicitud de palabra y cola.
7. Historial y exportación.
8. QA funcional y hardening.
