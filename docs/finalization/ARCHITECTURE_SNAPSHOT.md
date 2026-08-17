# Architecture Snapshot

Generated from the current repository state on Monday, August 17, 2026.

| Area | Status | Evidence | Notes |
| --- | --- | --- | --- |
| Frontend framework | Implemented | `apps/mobile/package.json`, `apps/mobile/app.json` | Expo 57, React Native 0.86, Expo Router |
| Routing | Implemented | `apps/mobile/src/app/_layout.tsx`, `apps/mobile/src/app/(tabs)/_layout.tsx` | File-based routing via Expo Router |
| State management | Implemented | `apps/mobile/src/store/authStore.ts` | Zustand handles auth session state |
| Server state | Implemented | `apps/mobile/src/app/_layout.tsx` | React Query `QueryClientProvider` is wired globally |
| Auth storage | Partial | `apps/mobile/src/store/authStore.ts`, `apps/mobile/src/services/api/client.ts` | Access token storage exists; refresh-token retry is still TODO in the mobile API client |
| API client | Implemented | `apps/mobile/src/services/api/client.ts`, `apps/mobile/src/utils/env.ts` | Axios client reads `EXPO_PUBLIC_API_URL` |
| Backend framework | Implemented | `apps/api/package.json`, `apps/api/src/app.module.ts` | NestJS 11 monolith |
| Database | Implemented | `apps/api/prisma/schema.prisma`, `apps/api/prisma/migrations` | PostgreSQL via Prisma |
| Realtime | Implemented | `apps/api/src/chat/chat.gateway.ts` | Socket.IO chat namespace with token-based auth |
| File storage | Partial | `apps/api/src/storage/storage.service.ts`, `apps/api/src/storage/providers/local-storage.provider.ts` | Local filesystem provider exists; object storage adapter is still missing |
| Payment | Partial | `apps/api/src/payment/payment.service.ts`, `apps/api/src/payment/providers/sandbox-payment.provider.ts` | Sandbox provider only; no real payment service provider is integrated |
| KYC | Mock | `apps/api/src/auth/auth.service.ts`, `apps/api/src/kyc` | KYC uses `mock-kyc` plus internal review, not an external vendor |
| Background jobs | Partial | `apps/api/src/notifications/notifications.controller.ts`, `apps/api/src/notifications/notifications.service.ts` | Reminder jobs exist but are manually triggered through an admin endpoint |
| Notifications | Implemented | `apps/api/src/notifications/notifications.service.ts`, `apps/api/prisma/schema.prisma` | In-app notification model plus reminder generation |
| Deployment | Partial | `apps/api/Dockerfile`, `docker-compose.yml`, `docker-compose.production.yml`, `docs/deployment/*` | Production Docker/Compose and runbooks exist, but Docker image build was not verified in this session because the Docker daemon was unavailable on Monday, August 17, 2026 |
