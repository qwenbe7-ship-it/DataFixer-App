---
name: datafixer-release
description: Verify DataFixer release readiness without masking blocked official gates.
---

# DataFixer Release Workflow

## First trusted network bootstrap

1. Require a clean verified Git commit and a dedicated DataFixer remote repository. Never reuse an unrelated repository.
2. Run `python scripts/verify.py local`; any FAIL is NO-GO.
3. Manually run `.github/workflows/bootstrap-lockfile.yml` on the exact commit.
4. Require the generated `package-lock.json` artifact to pass `scripts/validate-lockfile.mjs`, clean `npm ci`, the declared Chrome/Edge/Firefox browser matrix, local harness and official gates.
5. Review the lockfile artifact before committing it. The bootstrap workflow must not silently mutate the repository.

## Normal releases after the lockfile is committed

1. Require a clean Git worktree and committed `package-lock.json`.
2. Run `node scripts/validate-lockfile.mjs`; any mismatch is FAIL, not BLOCKED.
3. Run `python scripts/verify.py local`; any FAIL is NO-GO.
4. Run `./scripts/production-preflight.sh`; exit 2 means environment BLOCKED, exit 1 means project FAIL.
5. Run `python scripts/verify.py official` only in an environment with installed dependencies and browsers.
6. Require lint, unit, Vitest browser mode, production build, real SheetJS XLSX round-trip, Chrome/Edge/Firefox E2E, privacy leak checks and production preview CSP evidence.
7. Require `.github/workflows/production-gates.yml` to be green on the committed lockfile.
8. Compare `docs/release-checklist.md` with actual evidence; never upgrade `BLOCKED` by prose alone.
9. Record recurring failures in `docs/TECH_DEBT.md` only when they have severity, trigger and objective exit criteria.

A preview CSP PASS does not prove the eventual public host sends the same header. Verify the deployed host before public release.
