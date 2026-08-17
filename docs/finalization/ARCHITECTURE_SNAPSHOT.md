# Architecture Snapshot: Borrow Hub

## 1. Frontend (Mobile App)
- **Framework**: React Native (via Expo)
- **Routing**: Expo Router (file-based routing)
- **State Management (Client)**: Zustand (used for AuthStore)
- **Server State / Data Fetching**: TanStack React Query (`@tanstack/react-query`) with an Axios API Client
- **Styling**: TailwindCSS (NativeWind)
- **Auth Storage**: Expo SecureStore (assumed based on standard practice for React Native)

## 2. Backend (API)
- **Framework**: NestJS (v11)
- **Database ORM**: Prisma (v7)
- **Database Engine**: PostgreSQL
- **Caching**: `@nestjs/cache-manager` with Redis (`@keyv/redis`)
- **Realtime / WebSockets**: Socket.IO (`@nestjs/websockets`)
- **Validation**: `class-validator`, `class-transformer`
- **Authentication**: JWT (`@nestjs/jwt`), Argon2 for password hashing
- **Security**: Helmet, `@nestjs/throttler` (Rate Limiting)

## 3. Infrastructure & Deployment
- **Monorepo Manager**: pnpm workspaces
- **Docker**: Multistage `Dockerfile` inside `apps/api` and `docker-compose.yml` in root
- **Scripts**: Dedicated `.ps1` and NPM scripts for managing caches outside of C drive.

## 4. Key Business Domains (Implemented / Partial / Missing)
- **User & Auth**: Implemented (JWT, Argon2, User model, Roles/Permissions)
- **Asset Marketplace**: Implemented (Asset, Category, Favorite, Images, Availability)
- **Rental Lifecycle**: Implemented (RentalRequest, Handover, HandoverQrSession)
- **Contract Management**: Implemented (RentalContract, ContractSignature)
- **Payment & Finance**: Implemented (Payment, Refund, Payout models exist; external provider integration needs verification)
- **KYC (Identity Verification)**: Implemented (UserVerification model exists)
- **Chat & Messaging**: Implemented (Conversation, Message models; Socket.IO configured)
- **Disputes & Reports**: Implemented (Dispute, DisputeEvent, SupportTicket)
- **File Storage**: Partial (Evidence and AssetImage models exist, but provider abstraction needs check)
- **Notifications**: Implemented (Notification model exists)
- **Background Jobs**: Unknown / Needs check (Cron or Queues for Late Fees, Overdue Rentals)
