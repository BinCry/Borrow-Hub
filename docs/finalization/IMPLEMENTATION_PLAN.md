# Implementation Plan

Updated on Monday, August 17, 2026 from the current repository state.

## Objective

Move Borrow Hub toward a deployable VPS-ready state without creating large caches or temporary artifacts on `C:`.

## Phase Status

| Phase | Status | Notes |
| --- | --- | --- |
| 1. Repository + Claude-Kit audit | Completed | Repository scanned, skills loaded, git status and cache paths checked |
| 2. UI feature completeness audit | Partial | Existing frontend audit docs are present, but not fully re-verified in this session |
| 3. UI <-> backend contract audit | Partial | `docs/frontend/BACKEND_INTEGRATION_CONTRACT.md` exists but was not refreshed after the latest backend hardening |
| 4. Database + Prisma audit | Partial | Schema and migrations were inspected; blank-database deployment was not re-run in this session |
| 5. Auth + user lifecycle | Partial | Login/register/logout/me exist, but password reset is still missing and mobile refresh logic is unfinished |
| 6. Asset marketplace | Partial | Core CRUD/search/moderation exists; no fresh end-to-end audit in this session |
| 7. Rental lifecycle | Partial | Core booking/approval/payment/contract/handover/return flows exist; full critical-journey proof still missing |
| 8. Payment + finance | Partial | Sandbox payment is implemented; production PSP integration is still missing |
| 9. Contract + handover + QR | Partial | Backend support exists; full integration validation still pending |
| 10. Chat + notifications | Partial | Realtime chat and reminders exist; reconnect/mobile QA not fully proven |
| 11. KYC + trust | Partial | Trust/KYC flows exist, but KYC is still mock-backed |
| 12. Reviews + reports + disputes + support | Partial | Core backend domains exist; final QA coverage is still incomplete |
| 13. Storage/upload | Partial | Local storage exists; production object storage adapter is still missing |
| 14. Security + concurrency | Partial | Booking lock, audit/request logs, env validation, and throttling exist; not all domains have been re-reviewed |
| 15. Seed + bootstrap | Partial | Development seed exists; production bootstrap remains undocumented beyond current seed accounts |
| 16. Dev/Staging infrastructure | Partial | Docker Compose, Dockerfile, env validation, and Windows cache steering were improved |
| 17. Testing + QA | Partial | Targeted unit tests and build checks passed; lint, full e2e, mobile build, and docker image build remain incomplete |
| 18. Production readiness | Partial | VPS runbook, DB runbook, cache controls, and deploy config were added, but product blockers remain |
| 19. Documentation + handoff | In Progress | Finalization docs are being brought in sync with code |

## Commit Plan

| Commit | Scope | Files/Modules | Validation |
| --- | --- | --- | --- |
| `b23df93` | Admin cache layer | `apps/api/src/cache`, `admin.service`, `.env.example`, `docker-compose.yml` | `pnpm --filter toolshare-api test -- admin.service.spec.ts`, `pnpm --filter toolshare-api build` |
| `eebd132` | Runtime deploy hardening | `apps/api/Dockerfile`, env validation, compose, startup config | `pnpm --filter toolshare-api build`, compose config render |
| `a66c9ce` | VPS runbooks | `docs/deployment/*`, `docs/PRODUCTION_READINESS.md` | Manual doc review against current repo state |
| `42354ea` | Windows cache relocation | `.npmrc`, `package.json`, `scripts/windows`, `docs/development` | `npm config get cache`, `pnpm store path`, PowerShell cache script verification |
| Planned next scope | Finalization docs sync | `README.md`, `docs/finalization/*`, `docs/FINAL_CODEX_HANDOFF.md` | Doc review against code, clean git diff, commit + push |
