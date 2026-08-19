---
title: "Borrow Hub security scan"
date: "2026-08-20"
scope: "Source, dependencies, environment and deployment"
---

# Security Scan Report — Borrow Hub

## Summary

| Category | Critical | High | Moderate | Low |
|---|---:|---:|---:|---:|
| Secrets | 0 | 0 | 0 | 0 |
| Code patterns | 0 | 0 | 0 | 0 |
| Dependencies | 0 | 3 | 1 | 0 |

## Completed checks

- No production `.env`, private key, structured cloud key, JWT or credential is tracked.
- `.env.example` contains placeholders only; caches and temporary exports are ignored.
- No dynamic `eval`, unsafe HTML assignment, command construction, raw SQL concatenation or security-token `Math.random` pattern was found in application source.
- Local storage keys reject absolute paths, empty segments and traversal; KYC links are signed and expire.
- API secrets are required in production; SePay webhook uses HMAC and payment settlement is idempotent.
- `@nestjs/swagger` was upgraded to 11.4.7, removing the vulnerable transitive `js-yaml` release.

## Remaining dependency advisories

1. High: `image-size@1.2.1`, twice through Expo Metro. Advisory concerns malformed ICNS/JXL/HEIF parsed by the build tool. It is not used by the production NestJS request path and currently has no patched release in the audit metadata.
2. High: `deepmerge-ts@7.1.5` through Prisma CLI/config. Exploitation requires recursive JavaScript object graphs; Prisma config is repository-controlled. Upgrading to major 8 by override was rejected to avoid breaking Prisma 7.9.1.
3. Moderate: `uuid@7.0.3` through Expo's `xcode` build dependency. The affected v3/v5/v6 buffer API is not called by Borrow Hub runtime. A major override was rejected to preserve Expo SDK 57 compatibility.

## Recommendation

Track Expo SDK and Prisma patch releases, rerun `pnpm audit`, and remove the three advisories when upstream packages update. Do not expose Metro, Prisma CLI or build tooling on the public VPS runtime.
