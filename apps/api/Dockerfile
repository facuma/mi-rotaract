# ============================================
# Stage 1: Install dependencies
# ============================================
FROM node:20-slim AS deps

RUN apt-get update && apt-get install -y \
    python3 make g++ openssl \
    && rm -rf /var/lib/apt/lists/*

ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"
RUN corepack enable && corepack prepare pnpm@latest --activate

WORKDIR /app

# Copy workspace config and lockfile first (layer caching)
COPY pnpm-lock.yaml pnpm-workspace.yaml .npmrc package.json ./
COPY apps/api/package.json ./apps/api/
COPY packages/shared-types/package.json ./packages/shared-types/

RUN pnpm install --frozen-lockfile

# ============================================
# Stage 2: Build
# ============================================
FROM node:20-slim AS build

ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"
RUN corepack enable && corepack prepare pnpm@latest --activate

WORKDIR /app

# Copy installed deps from stage 1
COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /app/apps/api/node_modules ./apps/api/node_modules
COPY --from=deps /app/packages/shared-types/node_modules ./packages/shared-types/node_modules

# Copy workspace config (needed for pnpm --filter)
COPY pnpm-lock.yaml pnpm-workspace.yaml .npmrc package.json ./

# Copy shared-types source
COPY packages/shared-types/ ./packages/shared-types/

# Copy API source
COPY apps/api/ ./apps/api/

# Build shared-types first (API depends on it)
RUN pnpm --filter @mi-rotaract/shared-types run build

# Generate Prisma client for linux
RUN cd apps/api && npx prisma generate

# Build NestJS
RUN pnpm --filter api run build

# ============================================
# Stage 3: Production
# ============================================
FROM node:20-slim AS production

RUN apt-get update && apt-get install -y curl && rm -rf /var/lib/apt/lists/*

RUN groupadd -r nestjs && useradd -r -g nestjs nestjs

WORKDIR /app

# Copy node_modules (includes hoisted deps + workspace symlinks)
COPY --from=build /app/node_modules ./node_modules

# Copy shared-types built output (symlink target from node_modules)
COPY --from=build /app/packages/shared-types/dist ./packages/shared-types/dist
COPY --from=build /app/packages/shared-types/package.json ./packages/shared-types/

# Copy API dist + prisma schema (for migrations)
COPY --from=build /app/apps/api/dist ./apps/api/dist
COPY --from=build /app/apps/api/prisma ./apps/api/prisma
COPY --from=build /app/apps/api/package.json ./apps/api/

# Create uploads dir writable by nestjs user
RUN mkdir -p /app/apps/api/uploads && chown nestjs:nestjs /app/apps/api/uploads

ENV NODE_ENV=production
ENV PORT=8091

EXPOSE 8091

HEALTHCHECK --interval=30s --timeout=10s --retries=3 --start-period=40s \
  CMD curl -f http://localhost:8091/health || exit 1

USER nestjs

CMD ["node", "apps/api/dist/src/main.js"]
