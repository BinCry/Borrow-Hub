# VPS Deployment Runbook

## Scope

Run the Borrow Hub API on a VPS with Docker Compose, PostgreSQL, Redis, persistent uploads, and repeatable migrations.

## Server prerequisites

- Ubuntu 22.04 LTS or newer
- Docker Engine 27+ and Docker Compose plugin
- A DNS record pointing to the VPS
- Firewall open for `22`, `80`, and `443`
- Git access to `https://github.com/BinCry/Borrow-Hub.git`

## Recommended server layout

```text
/srv/borrow-hub/
  repo/
  backups/
  env/
```

## First-time setup

```bash
sudo mkdir -p /srv/borrow-hub/{repo,backups,env}
sudo chown -R $USER:$USER /srv/borrow-hub
cd /srv/borrow-hub/repo
git clone https://github.com/BinCry/Borrow-Hub.git .
cp .env.example .env
```

Fill `.env` with production values before booting containers.

## Required environment values

- `NODE_ENV=production`
- `HOST=0.0.0.0`
- `PORT=3000`
- `API_PORT=3000`
- `APP_URL=https://api.your-domain.tld`
- `DATABASE_URL=postgresql://<user>:<password>@postgres:5432/<db>?schema=public`
- `POSTGRES_DB=<db>`
- `POSTGRES_USER=<user>`
- `POSTGRES_PASSWORD=<strong-password>`
- `JWT_ACCESS_SECRET=<long-random-secret>`
- `JWT_REFRESH_SECRET=<long-random-secret>`
- `CACHE_TTL_MS=60000`
- `CACHE_KEY_PREFIX=borrowhub`
- `REDIS_URL=redis://redis:6379`

## Build and start

```bash
cd /srv/borrow-hub/repo
docker compose -f docker-compose.production.yml up -d --build
```

This flow does three things in order:

1. Starts PostgreSQL and Redis.
2. Runs `prisma migrate deploy` in the `migrate` service.
3. Starts the API container only after the migration job succeeds.

## Health checks

```bash
docker compose -f docker-compose.production.yml ps
curl http://127.0.0.1:3000/api/v1/health
```

Expected response:

```json
{
  "status": "ok",
  "database": "up"
}
```

## Reverse proxy and HTTPS

Put Nginx or Caddy in front of the API and proxy traffic to `127.0.0.1:3000`.

Minimum reverse proxy requirements:

- Force HTTPS
- Forward `Host`, `X-Forwarded-For`, and `X-Forwarded-Proto`
- Set reasonable body size for image uploads
- Keep `/api/v1/health` reachable for probes

## Logs

```bash
docker compose -f docker-compose.production.yml logs -f api
docker compose -f docker-compose.production.yml logs -f migrate
docker compose -f docker-compose.production.yml logs -f postgres
```

## Upgrade flow

```bash
cd /srv/borrow-hub/repo
git pull --ff-only origin main
docker compose -f docker-compose.production.yml up -d --build
```

## Rollback

1. Find the last known-good commit.
2. Check it out on the server.
3. Rebuild and restart:

```bash
git checkout <known-good-commit>
docker compose -f docker-compose.production.yml up -d --build
```

If the failed release included a migration, validate rollback safety against [DATABASE_RUNBOOK.md](D:/Sharing/docs/deployment/DATABASE_RUNBOOK.md:1) before downgrading.
