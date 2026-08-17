# Database Runbook

## Create the database stack

Borrow Hub ships with PostgreSQL in `docker-compose.production.yml`. The API expects:

- `POSTGRES_DB`
- `POSTGRES_USER`
- `POSTGRES_PASSWORD`
- `DATABASE_URL`

Example connection string:

```text
postgresql://borrowhub:<strong-password>@postgres:5432/borrowhub?schema=public
```

## Apply migrations

For Docker Compose deployments:

```bash
docker compose -f docker-compose.production.yml run --rm migrate
```

For direct host execution:

```bash
pnpm --filter toolshare-api exec prisma migrate deploy
```

## Development seed

Development-only:

```bash
pnpm prisma:seed
```

Do not run seed data against production unless you have created a separate bootstrap script with intentionally safe records.

## Backup

Logical backup:

```bash
docker compose -f docker-compose.production.yml exec -T postgres \
  pg_dump -U "$POSTGRES_USER" "$POSTGRES_DB" > /srv/borrow-hub/backups/borrowhub-$(date +%F-%H%M%S).sql
```

## Restore

```bash
cat /srv/borrow-hub/backups/<backup-file>.sql | \
  docker compose -f docker-compose.production.yml exec -T postgres \
  psql -U "$POSTGRES_USER" "$POSTGRES_DB"
```

## Restore validation

After every restore test:

```bash
curl http://127.0.0.1:3000/api/v1/health
docker compose -f docker-compose.production.yml logs --tail=50 api
```

## Retention

- Keep daily backups for 7 days
- Keep weekly backups for 4 weeks
- Keep monthly backups for 3 months

## Production safety notes

- Never expose PostgreSQL publicly unless remote admin access is required.
- Rotate database credentials if a backup leaves the controlled environment.
- Test restore on a non-production stack before declaring backups valid.
