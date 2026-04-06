#!/usr/bin/env bash
set -euo pipefail

REPO_DIR="/opt/mi-rotaract"
BRANCH="main"

echo "==> Pulling latest code..."
cd "$REPO_DIR"
git pull origin "$BRANCH"

echo "==> Building container..."
docker compose build api

echo "==> Running database migrations..."
docker compose run --rm --entrypoint "" \
  api npx prisma migrate deploy --schema=apps/api/prisma/schema.prisma

echo "==> Restarting API..."
docker compose up -d --force-recreate api

echo "==> Waiting for health check..."
sleep 5
if curl -sf http://localhost:8091/health > /dev/null 2>&1; then
  echo "==> API is healthy!"
else
  echo "==> WARNING: Health check failed. Check logs: docker compose logs api"
fi

echo "==> Cleaning up old images..."
docker image prune -f

echo "==> Deploy complete!"
