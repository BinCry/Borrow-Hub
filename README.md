# Borrow Hub
![React Native](https://img.shields.io/badge/React%20Native-20232A?style=for-the-badge&logo=react&logoColor=61DAFB)
![Expo](https://img.shields.io/badge/Expo-000020?style=for-the-badge&logo=expo&logoColor=white)
![NestJS](https://img.shields.io/badge/NestJS-E0234E?style=for-the-badge&logo=nestjs&logoColor=white)
![PostgreSQL](https://img.shields.io/badge/PostgreSQL-316192?style=for-the-badge&logo=postgresql&logoColor=white)
![Turborepo](https://img.shields.io/badge/Turborepo-EF4444?style=for-the-badge&logo=turbo&logoColor=white)
![TypeScript](https://img.shields.io/badge/TypeScript-007ACC?style=for-the-badge&logo=typescript&logoColor=white)


Borrow Hub is a monorepo for a peer-to-peer rental product with a NestJS API and an Expo mobile app.

Current release status as of Monday, August 17, 2026: `NOT READY`.

Why it is not ready yet:

- payment is still sandbox-only
- KYC is still mock-backed
- password reset is still missing
- lint, full e2e, and mobile release verification are incomplete

See [docs/FINAL_CODEX_HANDOFF.md](D:/Sharing/docs/FINAL_CODEX_HANDOFF.md:1) for the current handoff status.

## Architecture

- Frontend: Expo 57, React Native 0.86, Expo Router, React Query, Zustand, SecureStore
- Backend: NestJS 11, Prisma 7, PostgreSQL 16, Socket.IO, JWT, Argon2id
- DevOps: Docker Compose for local development, production-oriented Dockerfile, VPS runbooks

Repo layout:

```text
.
|- apps/
|  |- api/
|  `- mobile/
|- docs/
|- docker-compose.yml
|- docker-compose.production.yml
`- package.json
```

## Requirements

- Node.js 24+
- pnpm 10.33.2+
- PostgreSQL 16
- Docker Desktop / Docker Engine for container workflows
- PowerShell for the Windows cache helper

## Local setup

1. Copy the environment template:

```powershell
Copy-Item .env.example .env
```

2. Optional on Windows: move repo temp/cache usage to `D:` for the current shell:

```powershell
. .\scripts\windows\use-d-drive-cache.ps1
```

3. Install dependencies:

```bash
pnpm install
```

4. Start local infrastructure:

```bash
docker compose up -d postgres redis
```

5. Generate Prisma client and seed dev data:

```bash
pnpm prisma:generate
pnpm prisma:seed
```

6. Start the API:

```bash
pnpm start:dev
```

The API default URL is `http://localhost:3000/api/v1`.

## Frontend

The mobile app lives in `apps/mobile`.

- Router: Expo Router file-based routes
- Auth storage: SecureStore on native, `localStorage` on web
- Server state: React Query
- API base URL: `EXPO_PUBLIC_API_URL`

Run the mobile app from its workspace:

```bash
pnpm --dir apps/mobile start
pnpm --dir apps/mobile android
pnpm --dir apps/mobile ios
pnpm --dir apps/mobile web
```

Known frontend gap:

- the Axios client still logs the user out on `401`; refresh-token retry is not implemented yet

## Backend

The API lives in `apps/api`.

Implemented backend areas include:

- auth, users, categories, assets, rentals, contracts, handovers, QR handover
- reviews, chat, disputes, reports, support, finance, notifications, analytics
- admin dashboard, audit logs, request logs, risk incidents, favorites

Notable backend gaps:

- password reset flow is still missing
- payment provider is sandbox-only
- KYC is still mock-backed
- storage provider is still local filesystem only

## Database

- Prisma schema: `apps/api/prisma/schema.prisma`
- Migrations: `apps/api/prisma/migrations`
- Seed script: `apps/api/prisma/seed.ts`

Deployment runbooks:

- [docs/deployment/VPS_DEPLOYMENT.md](D:/Sharing/docs/deployment/VPS_DEPLOYMENT.md:1)
- [docs/deployment/DATABASE_RUNBOOK.md](D:/Sharing/docs/deployment/DATABASE_RUNBOOK.md:1)

## Seed data

Development seed accounts:

- Admin: `admin@toolshare.local` / `Admin@123456`
- Owner: `owner@toolshare.local` / `User@123456`
- Renter: `renter@toolshare.local` / `User@123456`

Do not reuse these credentials outside development.

## Testing

Useful commands:

```bash
pnpm build
pnpm test
pnpm test:e2e
pnpm prisma:generate
pnpm prisma:migrate
pnpm prisma:seed
```

Current caveats:

- `pnpm lint` is configured, but the repo still needs an `eslint.config.js` migration for ESLint 9
- full e2e coverage and mobile release verification are still incomplete

## Development

Windows cache/path helpers:

- repo-local pnpm store: `D:\Sharing\.pnpm-store`
- repo-local npm cache: `D:\CodexHome\npm-cache`
- shell helper: [docs/development/WINDOWS_CACHE_SETUP.md](D:/Sharing/docs/development/WINDOWS_CACHE_SETUP.md:1)

## Deployment

Available deployment assets:

- development compose: `docker-compose.yml`
- production compose: `docker-compose.production.yml`
- production Dockerfile: `apps/api/Dockerfile`
- handoff/status: [docs/FINAL_CODEX_HANDOFF.md](D:/Sharing/docs/FINAL_CODEX_HANDOFF.md:1)

The repository is closer to VPS-ready than it was, but it is still `NOT READY` until the remaining blockers above are resolved and verified.
