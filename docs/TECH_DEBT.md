# DataFixer Active Technical Debt

Only active debt or release-process gaps belong here. Resolved bootstrap and browser blockers are intentionally removed from the active list.

## Verified baseline

- Public repository: `qwenbe7-ship-it/DataFixer-App`
- Verified `main`: `11b8073991e015fb22789e409e8e88517bfe6982`
- GitHub Actions run: `33583805040`
- Harness: PASS
- Official production gates: PASS
- Unit tests: 74 PASS
- Browser tests: 4 PASS
- Playwright E2E: 33 PASS across Chrome, Edge and Firefox
- Vercel Git status on the verified commit: `success` / `Deployment has completed`
- Vercel target project: `qwenbe/data-fixer-app`

## TD-003 — Live Vercel host privacy/header capture pending

- **Severity:** P0 release-verification gate for a public/customer launch
- **State:** OPEN; local production-preview privacy verification is PASS, but the deployed Vercel response has not yet been captured directly
- **Trigger:** public/customer release
- **Evidence already PASS:** zero non-GET/off-origin requests and zero customer-data request/console leaks in Playwright; offline continuation works; repository `vercel.json` defines CSP `frame-ancestors 'none'`, `nosniff`, `DENY`, `no-referrer`, and restrictive Permissions-Policy
- **Remaining gap:** verify those headers and privacy behavior against the actual Vercel production URL
- **Exit criterion:** a live-host browser/curl capture confirms required response headers, and a browser smoke test against the deployed origin confirms no customer spreadsheet bytes or derived values are transmitted

## TD-005 — Performance baseline not versioned

- **Severity:** P2
- **State:** OPEN
- **Trigger:** large-file or algorithm changes
- **Impact:** functional regressions are caught more strongly than throughput regressions
- **Exit criterion:** versioned benchmark dataset plus objective timing/memory thresholds for representative row counts

## TD-007 — `main` protection/ruleset not configured

- **Severity:** P1 release-process gap
- **State:** OPEN
- **Evidence:** GitHub reports `main` as `protected: false` and repository rulesets are empty
- **Impact:** CI is green, but GitHub does not yet enforce PR-only changes or required checks at the repository boundary
- **Exit criterion:** an active `main` ruleset requires pull requests and the DataFixer production-gate checks, while blocking force-push/deletion

## TD-008 — Production bundle size warning

- **Severity:** P2
- **State:** OPEN; non-blocking
- **Evidence:** Vite reports the main JavaScript bundle at about 637 kB (about 205 kB gzip) and the data worker at about 522 kB, primarily because SheetJS is required for browser-side XLSX processing
- **Impact:** no correctness failure; potential initial-load and worker-start cost
- **Exit criterion:** measured code-splitting/lazy-loading improvement removes the warning or a benchmark demonstrates the current bundle is the better trade-off and the warning threshold is documented accordingly

## Resolved blockers

The following earlier P0 items are closed by the verified public repository and GitHub-hosted production run: canonical lockfile/bootstrap, real SheetJS execution, XLSX import/export verification, Chrome/Edge/Firefox browser matrix, remote official CI, and production build artifact generation.
