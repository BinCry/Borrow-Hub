# REPOSITORY AUDIT

## 1.1. Architecture Map

*   **Mobile App**: `apps/mobile` - React Native (Expo) app using `expo-router` for navigation, NativeWind for styling (`react-native-css-interop`), and Zustand for state.
*   **API**: `apps/api` - NestJS application using Prisma ORM.
*   **Database**: PostgreSQL (via `@prisma/adapter-pg` and `pg`).
*   **Package Manager**: `pnpm` workspace with `apps/*` and `packages/*`.
*   **State Management (Mobile)**: Zustand, React Query for server state.
*   **Navigation (Mobile)**: Expo Router (file-based).
*   **Realtime**: Socket.IO for chat/notifications (`@nestjs/platform-socket.io`).
*   **File Handling / Image**: Handled in API (currently scanning for object storage implementation).
*   **Authentication**: JWT based (`@nestjs/jwt`, Argon2 for hashing).
*   **Payment**: Providers like Sandbox, Bank Transfer, QR, E-wallet defined in Schema.

## 1.2. Screen Inventory

| Screen | Route | Role |
| :--- | :--- | :--- |
| Home | `(tabs)/index` | Tab - Dashboard / Main |
| Discover | `(tabs)/discover` | Tab - Search / Explore Assets |
| Messages | `(tabs)/messages` | Tab - Chat List |
| Rentals | `(tabs)/rentals` | Tab - My Rentals / Transactions |
| Profile | `(tabs)/profile` | Tab - User Profile / Settings |
| Login | `auth/login` | Authentication |
| Register | `auth/register` | Authentication |
| Asset Detail | `asset/[id]` | View Asset |
| Create Asset | `asset/create` | Post New Asset |
| Book Asset | `asset/[id]/book` | Booking Flow |
| Rental Detail | `rental/[id]` | View Rental Transaction |
| Contract | `rental/[id]/contract` | Sign / View Contract |
| Handover | `rental/[id]/handover` | Handover Checklist / QR |

## 1.3. API Inventory

| Module | Endpoint Base | Role |
| :--- | :--- | :--- |
| Auth | `/auth` | Authentication (login, register, refresh) |
| Users | `/users` | User management, profile |
| Assets | `/assets` | CRUD for listings |
| Categories | `/categories` | Asset categories |
| Rentals | `/rentals` | Rental request management |
| Chat | `/chat` | Messaging |
| Disputes | `/disputes` | Dispute resolution |
| Finance | `/finance` | Payments, refunds, payouts |
| Favorites | `/favorites` | Wishlist |
| KYC | `/kyc` | Identity verification |
| Notifications | `/notifications` | Push / In-app alerts |
| Reports | `/reports` | User / Asset reporting |
| Reviews | `/reviews` | Rating and feedback |
| Support | `/support/tickets` | Support desk |
| Risk | `/risk` | Fraud and risk management |
| Admin | `/admin` | Admin dashboard APIs |
| Analytics | `/analytics` | Usage tracking |
| Health | `/health` | Liveness / Readiness |
