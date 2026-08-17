# Windows Cache Setup

## Goal

Keep Borrow Hub development caches and temporary files on `D:` instead of `C:`.

## What is already repo-local

- PNPM store: [`.pnpm-store`](D:/Sharing/.pnpm-store)
- NPM cache: configured in [`.npmrc`](D:/Sharing/.npmrc:1) to use `D:\CodexHome\npm-cache`

## Session-safe shell setup

Borrow Hub now ships with [use-d-drive-cache.ps1](D:/Sharing/scripts/windows/use-d-drive-cache.ps1:1).

From PowerShell, run:

```powershell
. .\scripts\windows\use-d-drive-cache.ps1
```

That dot-sources the script into the current shell and sets:

- `TEMP`
- `TMP`
- `TMPDIR`
- `npm_config_cache`
- `npm_config_tmp`
- `pnpm_config_store_dir`
- `GRADLE_USER_HOME`
- `EXPO_HOME`

All of them point to `D:\DevCache\BorrowHub\...` or the repo-local `.pnpm-store`.

## Quick verification

```powershell
Get-ChildItem Env:TEMP,Env:TMP,Env:npm_config_cache,Env:pnpm_config_store_dir,Env:GRADLE_USER_HOME,Env:EXPO_HOME
npm config get cache
pnpm store path
```

## VS Code terminal workflow

Open a new terminal in the repo, then run:

```powershell
. .\scripts\windows\use-d-drive-cache.ps1
```

After that, keep using the same terminal for:

- `pnpm install`
- `pnpm build`
- `pnpm test`
- mobile bundling/build commands

## Docker Desktop note

This repo can keep PNPM/npm/temp artifacts on `D:`, but Docker Desktop stores its own VM/disk image outside repo control.

If Docker is part of your workflow, also move Docker Desktop disk storage to a `D:` location from Docker Desktop settings.
