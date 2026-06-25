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

RUN pnpm install --frozen-lockfile && pnpm rebuild bcrypt

# ============================================
# Stage 2: Build
# ============================================
FROM node:20-slim AS build

RUN apt-get update && apt-get install -y openssl && rm -rf /var/lib/apt/lists/*

ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"
RUN corepack enable && corepack prepare pnpm@latest --activate

WORKDIR /app

# Copy installed deps from stage 1
COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /app/apps/api/node_modules ./apps/api/node_modules

# Copy workspace config (needed for pnpm --filter)
COPY pnpm-lock.yaml pnpm-workspace.yaml .npmrc package.json ./

# Copy API source
COPY apps/api/ ./apps/api/

# Generate Prisma client for linux
RUN cd apps/api && npx prisma generate

# Build NestJS
RUN pnpm --filter api run build

# ============================================
# Stage 3: Production
# ============================================
FROM node:20-slim AS production

RUN apt-get update && apt-get install -y curl openssl && rm -rf /var/lib/apt/lists/*

RUN groupadd -r nestjs && useradd -r -g nestjs nestjs

WORKDIR /app

# Copy node_modules (includes hoisted deps + workspace symlinks)
COPY --from=build /app/node_modules ./node_modules

# Copy API dist + prisma schema (for migrations)
COPY --from=build /app/apps/api/dist ./apps/api/dist
COPY --from=build /app/apps/api/prisma ./apps/api/prisma
COPY --from=build /app/apps/api/package.json ./apps/api/

# Create uploads dir writable by nestjs user (matches UPLOAD_DIR=./uploads from process.cwd()=/app)
RUN mkdir -p /app/uploads && chown nestjs:nestjs /app/uploads

ENV NODE_ENV=production
ENV PORT=8091

EXPOSE 8091

HEALTHCHECK --interval=30s --timeout=10s --retries=3 --start-period=40s \
  CMD curl -f http://localhost:8091/health || exit 1

USER nestjs

CMD ["node", "apps/api/dist/src/main.js"]
