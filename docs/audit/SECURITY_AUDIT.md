# SECURITY AUDIT

## 1. Authentication & Authorization
- **Status**: ✅ **GOOD**. The application uses global `AuthGuard` and `RolesGuard`, securing endpoints by default unless explicitly decorated with `@Public()`. 
- **Resource Authorization**: ✅ **GOOD**. Services like `RentalsService` properly implement resource-level checks (`assertOwner`, `assertRenter`) to prevent IDOR (Insecure Direct Object Reference).

## 2. File Uploads & Public Access (BLOCKER)
- **Vulnerability**: `app.use('/uploads', express.static(uploadsRoot));` exposes all uploaded files to the public internet. This includes sensitive KYC documents, private handover evidences, and chat images.
- **Fix**: Remove static file serving for sensitive directories. Implement Signed URLs via an Object Storage service, or secure the download route using JWT authentication.

## 3. JWT & Secret Management
- **Vulnerability**: Need to verify if `JWT_SECRET` is enforced in production and if Refresh Tokens are properly rotated. The prompt requires refresh token rotation and device logout.
- **Fix**: Ensure `auth.service.ts` invalidates old refresh tokens upon use.

## 4. Rate Limiting (Missing Strict Limits)
- **Vulnerability**: Global rate limit is too generous for Auth routes. Brute-forcing passwords or OTPs might be possible.
- **Fix**: Apply `@Throttle()` decorators with strict limits to `/auth/login`, `/auth/register`.

## 5. Idempotency (CRITICAL)
- **Vulnerability**: Double-tapping the "Confirm Handover" or "Approve Rental" button could potentially lead to duplicate state mutations or duplicate notifications/transactions.
- **Fix**: Implement an idempotency key mechanism for critical POST/PATCH mutations, or rely strictly on database state machine checks inside transactions.
