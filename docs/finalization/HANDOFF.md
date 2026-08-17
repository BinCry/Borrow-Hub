# Borrow Hub - Production Handoff & Architecture Guide

## 1. Overview
Borrow Hub has been fully finalized for production readiness. The backend serves as a robust engine managing users, assets, rental lifecycles, finances, and trust/risk scoring.

## 2. Technical Stack
- **Framework**: NestJS 11
- **Database**: PostgreSQL (via Prisma ORM)
- **Caching**: Redis (via `@nestjs/cache-manager` and `keyv`)
- **WebSockets**: Socket.IO for real-time Chat and Notifications.
- **Image Processing**: `sharp` (WebP conversion and resizing)
- **Logging**: `winston` and `nest-winston` (Console + File logging)

## 3. Environment Variables
Reference `.env.example` for all variables. Key variables include:
- `DATABASE_URL`: PostgreSQL connection string.
- `REDIS_URL`: Redis connection string (enables caching if present).
- `JWT_SECRET`, `JWT_REFRESH_SECRET`: Secrets for Auth.
- `THROTTLE_TTL`, `THROTTLE_LIMIT`: API rate limiting configuration.
- `CACHE_TTL_MS`: Cache Time-to-Live.

## 4. Key Workflows Completed
- **Rental Lifecycle**: Fully implemented state machine with race-condition prevention (using `FOR UPDATE` row locks). States: `PENDING_OWNER` -> `AWAITING_PAYMENT` -> `AWAITING_SIGNATURE` -> `CONFIRMED` -> `READY_FOR_HANDOVER` -> `ONGOING` -> `RETURN_PENDING` -> `COMPLETED`.
- **Payment & Finance**: Idempotent payment recording. Automatic payout and refund logic based on cancellation outcome. Support for sandbox provider.
- **Chat**: Room-isolated WebSockets chat supporting real-time messaging and off-platform signal detection (auto-warning).
- **KYC & Trust Score**: Auto-recalculated Trust Score based on successful rentals, reviews, verified KYC, and penalties for open disputes/risk incidents. Mock KYC provider included for staging.
- **Media Storage**: Upload endpoint utilizes `sharp` to resize and compress asset images into `webp` before storing them locally in `/uploads`.

## 5. Deployment Scripts
- **Docker Compose**: `docker-compose.yml` (dev) and `docker-compose.production.yml` (prod). Provides PostgreSQL, Redis, and the NestJS API container.
- **Deploy Script**: `deploy.sh` script automatically pulls the latest code, installs dependencies, pushes the schema, and builds/starts the Docker containers.
- **Seed Script**: Run `pnpm prisma:seed` to populate the database with Admin roles, Users, Demo Assets (20+), Categories, and Mock Bookings.

## 6. API Documentation
The API is fully documented via Swagger.
Once running, visit: `http://localhost:3000/api/docs` to view the Swagger UI, complete with Bearer Auth capabilities.

## 7. QA & Testing
- The API has been verified to compile cleanly with **0 Type Errors** and **0 Lint Errors**.
- Core logic flows (Login/Register, Asset Creation, Rental Booking, Search) have been thoroughly tested.
- `task.md` lists all passed test cases.

---
**Status**: Ready for Staging/Production Deployment.
