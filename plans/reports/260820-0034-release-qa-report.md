---
title: "Borrow Hub release QA"
date: "2026-08-20"
scope: "API, mobile, Google Play, VPS"
---

# Test Report — Borrow Hub release candidate

## Summary

- API unit: 28 suites, 91 tests passed, 0 failed.
- API HTTP e2e: 1 suite, 6 tests passed, 0 failed.
- API build and ESLint: passed.
- Prisma generate/validate: passed.
- Mobile TypeScript and Expo ESLint: passed.
- Expo doctor: 21/21 checks passed.
- Expo web production export: 31 static routes exported.
- Docker Compose development/production config: passed with `.env.example`.
- `git diff --check`: no whitespace errors; only Windows line-ending notices.

## Coverage

| Metric | Result | Note |
|---|---:|---|
| Statements | 33.80% | Repository-wide, includes controllers/DTO/modules |
| Branches | 33.06% | No enforced project threshold |
| Functions | 35.33% | Critical services have targeted regression tests |
| Lines | 33.55% | Payment service ~80%; rentals, KYC, finance and deletion covered by focused tests |

Coverage does not meet the generic 80% recommendation. It is non-blocking because the repository has no configured coverage gate, but raising auth/rental/controller coverage is recommended for later releases.

## Runtime and UI validation

- Launch experience holds native splash, checks session, warms public/authenticated React Query caches and fades through Reanimated.
- Preload waits at most 1.4 seconds; remaining network work continues without blocking navigation.
- Reduce Motion is respected.
- Android microphone permission is explicitly blocked; Camera remains for QR handover.
- Live browser smoke testing was skipped because `agent-browser`/Chromium is not installed and installation could consume the prohibited C drive.

## External release gates

The codebase is configured for release, but a signed AAB and Play submission require the publisher's EAS/Google credentials, production domain, SMTP, bank/SePay values, legal contact and Android devices. Complete the unchecked items in `docs/google-play/RELEASE_CHECKLIST.md` before production rollout.
