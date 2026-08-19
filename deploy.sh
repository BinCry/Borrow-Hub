#!/usr/bin/env bash
set -Eeuo pipefail

COMPOSE_FILE="docker-compose.production.yml"
HEALTH_URL="${HEALTH_URL:-http://127.0.0.1:${API_PORT:-3000}/api/v1/health}"

if [[ ! -f .env ]]; then
  echo "Missing .env. Copy .env.example to .env and replace every placeholder first." >&2
  exit 1
fi

if ! command -v docker >/dev/null 2>&1; then
  echo "Docker is not installed or is not available in PATH." >&2
  exit 1
fi

docker compose -f "$COMPOSE_FILE" config --quiet
docker compose -f "$COMPOSE_FILE" pull postgres redis caddy
docker compose -f "$COMPOSE_FILE" build migrate api
docker compose -f "$COMPOSE_FILE" up -d postgres redis
docker compose -f "$COMPOSE_FILE" run --rm migrate
docker compose -f "$COMPOSE_FILE" up -d --no-deps api
docker compose -f "$COMPOSE_FILE" up -d caddy

for attempt in $(seq 1 30); do
  if curl --fail --silent --show-error "$HEALTH_URL" >/dev/null; then
    echo "Borrow Hub API is healthy at $HEALTH_URL"
    docker compose -f "$COMPOSE_FILE" ps
    exit 0
  fi
  sleep 2
done

echo "API did not become healthy. Recent logs:" >&2
docker compose -f "$COMPOSE_FILE" logs --tail=100 api >&2
exit 1
