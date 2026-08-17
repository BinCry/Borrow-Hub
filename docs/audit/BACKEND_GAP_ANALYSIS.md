# BACKEND GAP ANALYSIS

This document tracks the gap between the current MVP backend and the Production requirements outlined in the Master Prompt.

## 1. Concurrency & Race Conditions (BLOCKER)
- **Current State**: In `RentalsService.create`, the check `ensureNoOverlap` runs outside of a transaction before inserting the `RentalRequest`.
- **Expected Production State**: Concurrent requests for the same asset at the same time could both pass `ensureNoOverlap` and create double bookings. Requires PostgreSQL transaction with serializable isolation or `FOR UPDATE` row lock on the Asset.
- **Severity**: BLOCKER
- **Files to Modify**: `rentals.service.ts`

## 2. Payment Webhook & Abstraction (CRITICAL)
- **Current State**: `recordPayment` in `RentalsService` blindly trusts the client payload (`RecordPaymentDto`) and marks payment as `SUCCESS` using `PaymentProvider.SANDBOX`.
- **Expected Production State**: Client should only initiate the payment intent. The actual `SUCCESS` state must be handled by a secure Webhook from the Payment Provider (e.g., Stripe, VNPay, Momo). Requires `PaymentService` abstraction.
- **Severity**: CRITICAL
- **Files to Modify**: `rentals.controller.ts`, `rentals.service.ts`, `finance/*`

## 3. KYC Provider Integration (CRITICAL)
- **Current State**: KYC seems to be mocked or relies on manual admin approval.
- **Expected Production State**: Need an abstraction `KycProvider` with a webhook to handle `VERIFIED` or `REJECTED` states automatically from a third-party KYC vendor.
- **Severity**: CRITICAL
- **Files to Modify**: `kyc.service.ts`, `kyc.controller.ts`

## 4. Object Storage for Files (HIGH)
- **Current State**: `main.ts` uses `express.static` to serve files from the local `uploads` directory.
- **Expected Production State**: Ephemeral container filesystems are lost on restart. Needs an `ObjectStorageService` (AWS S3, Cloudinary) to upload and serve files. Private files (evidence, KYC) must use signed URLs.
- **Severity**: HIGH
- **Files to Modify**: `main.ts`, new `storage.service.ts`

## 5. Rate Limiting Granularity (HIGH)
- **Current State**: `AppModule` has a global `ThrottlerModule` (120 req / 60s).
- **Expected Production State**: Auth endpoints (login, register, forgot-password) and Payment endpoints need stricter rate limits to prevent brute force.
- **Severity**: HIGH
- **Files to Modify**: `auth.controller.ts`, `rentals.controller.ts`

## 6. Account Deletion (HIGH)
- **Current State**: Missing dedicated account deletion flow.
- **Expected Production State**: A `POST /users/me/delete-request` endpoint handling data anonymization or soft-delete compliance.
- **Severity**: HIGH
- **Files to Modify**: `users.controller.ts`, `users.service.ts`
