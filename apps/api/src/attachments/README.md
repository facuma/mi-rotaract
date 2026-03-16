# Módulo de Adjuntos / Evidencias

Módulo transversal para almacenar, asociar y servir archivos (adjuntos) en la plataforma.

## Storage

- **storageKey**: `{entityType}/{entityId}/{uuid}{ext}` (ej: `report/abc123/uuid.pdf`)
- **storageBackend**: `r2` (Cloudflare R2) o `fs` (filesystem)
- Variables de entorno: ver `.env.example` en la raíz del monorepo

## Límites por entityType

Ver `config/attachment-entity.config.ts`. MVP: `report` (5 archivos, 10MB), `project` (10 archivos, 10MB).
