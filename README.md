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

## Tài khoản admin

### VPS đang sử dụng

Đã kiểm tra ngày 29/09/2026 trên backend `https://api.airplane.id.vn/api/v1`:

- Email đăng nhập: `admin@rentloop.local`
- Quyền: `SUPER_ADMIN`
- Trạng thái: `ACTIVE`
- Mật khẩu: mật khẩu được đặt khi khởi tạo tài khoản; không lưu mật khẩu production trong README. Chưa xác minh mật khẩu đăng nhập hiện tại.

Mở màn hình đăng nhập của app, nhập email trên và mật khẩu đã thiết lập. Tài khoản này khác với các tài khoản demo bên dưới.

Nếu quên mật khẩu admin VPS, người quản trị máy chủ có thể dùng script `apps/api/prisma/bootstrap-admin.ts` với `BOOTSTRAP_ADMIN_EMAIL=admin@rentloop.local`, mật khẩu mới trong `BOOTSTRAP_ADMIN_PASSWORD` và `BOOTSTRAP_ADMIN_RESET_PASSWORD=true`, rồi chạy `pnpm admin:bootstrap` trong môi trường có `DATABASE_URL` đúng. Cung cấp `BOOTSTRAP_ADMIN_FULL_NAME` và `BOOTSTRAP_ADMIN_PHONE` đúng với tài khoản để giữ thông tin hồ sơ. Đây là thao tác đổi mật khẩu, không cần chạy khi chỉ muốn đăng nhập.

### Tài khoản demo local (seed data)

Các tài khoản sau được tạo bởi `pnpm prisma:seed` trên database phát triển:

| Vai trò | Email | Mật khẩu ban đầu |
| --- | --- | --- |
| SUPER_ADMIN | `admin1@toolshare.local` | `Admin@123456` |
| SUPER_ADMIN | `admin2@toolshare.local` | `Admin@123456` |
| USER (thuê/cho thuê) | `user1@toolshare.local` đến `user5@toolshare.local` | `User@123456` |

Seed không đổi mật khẩu tài khoản đã tồn tại. Không chạy seed development trên VPS production và không dùng mật khẩu demo cho production.

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
