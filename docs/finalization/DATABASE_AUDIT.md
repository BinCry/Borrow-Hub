# Database & Prisma Audit

## 1. Schema Overview
- **ORM**: Prisma (v7.9.1)
- **Database**: PostgreSQL
- **Key Models**: `User`, `Category`, `Asset`, `RentalRequest`, `Payment`, `Payout`, `Dispute`, `Review`, `Conversation`, `Notification`, etc.

## 2. Checks & Verifications

### 2.1. Relations & Constraints
- **Foreign Keys**: Well-defined using `@relation`. `onDelete` behaviors are explicitly set (`Cascade`, `SetNull`, `Restrict`).
- **Unique Constraints**: Used correctly for composite IDs (e.g., `@@id([userId, roleId])` in `UserRole` and `@@unique([contractId, userId])` in `ContractSignature`).
- **Indexes**: heavily used on fields that are commonly queried: `categoryId`, `ownerId`, `status`, `startAt, endAt`. This is excellent for read-heavy operations like finding available assets.

### 2.2. Nullability
- Non-essential fields are properly marked as optional (e.g., `avatarUrl`, `brand`, `model`, `serialNumber`, `meetingPoint`).
- Essential fields (like `pricePerDay`, `estimatedValue`) are strictly required.

### 2.3. Money Fields
- **Data Type**: Money is correctly stored as `Int` (e.g., `pricePerDay Int`, `rentalFee Int`). This is the recommended approach (storing smallest currency unit, like VND). No floating-point precision issues will occur.

### 2.4. Timestamps & Timezones
- **Audit Fields**: All models use `createdAt` and `updatedAt`.
- Timezones in PostgreSQL via Prisma's `DateTime` are stored in UTC, which is standard and correct. 

### 2.5. Enums
- Used extensively and appropriately to control statuses (e.g., `RentalStatus`, `AssetStatus`, `PaymentStatus`).

### 2.6. Deletions
- **Hard Delete / Cascade**: Present on join tables (e.g., `FavoriteAsset`).
- **Soft Delete**: Not explicitly implemented using an `isDeleted` flag, but entities use statuses like `ARCHIVED` (for Assets) or `DELETED` / `BANNED` (for Users). This is a solid approach to maintain referential integrity while hiding records.

## 3. Conclusion & Next Steps
- The database schema is very robust and well-designed for a rental marketplace.
- **Action**: Moving to Phase 5 (Auth & User Lifecycle). No immediate schema changes are required for the base structure.
