# DataFixer Active Technical Debt

Only active debt or release-process gaps belong here. Resolved bootstrap, browser and live-host verification blockers are intentionally removed from the active list.

## Runtime verification baseline

This section identifies the last runtime-affecting commit used for release evidence. Documentation-only commits may advance `main` without changing this baseline; update it only when application source, dependencies, build/hosting configuration, workflows, or tests materially change.

- Runtime-affecting baseline commit: `6e782059180a36368aca1cac22d01f58acd16410`
- GitHub production-gate run: `33587953565`
- Harness: PASS
- Official production gates: PASS
- Unit tests: 74/74 PASS
- Browser tests: 4/4 PASS
- Playwright E2E: 36/36 PASS across Chrome, Edge and Firefox
- Production artifacts: `datafixer-verification` and `datafixer-dist` generated from the same baseline SHA
- Vercel Git status: `success` / `Deployment has completed`
- Vercel target project: `qwenbe/data-fixer-app`
- Production origin: `https://data-fixer-app.vercel.app`
- Automated live-host verification run: `33588151511` — PASS
- Live-host browser smoke: 5/5 PASS in Chrome (CSV, XLSX, privacy/header and offline behavior)

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
- **Impact:** CI and live-host verification are green, but GitHub does not yet enforce PR-only changes or required checks at the repository boundary
- **Exit criterion:** an active `main` ruleset requires pull requests and the production-gate checks, while blocking force-push/deletion

## TD-008 — Production bundle size warning

- **Severity:** P2
- **State:** OPEN; non-blocking
- **Evidence:** Vite reports the main JavaScript bundle at about 637 kB (about 205 kB gzip) and the data worker at about 522 kB, primarily because SheetJS is required for browser-side XLSX processing
- **Impact:** no correctness failure; potential initial-load and worker-start cost
- **Exit criterion:** measured code-splitting/lazy-loading improvement removes the warning or a benchmark demonstrates the current bundle is the better trade-off and the warning threshold is documented accordingly

## Resolved blockers

The following earlier blockers are closed by the verified public repository and GitHub-hosted release path:

- canonical lockfile/bootstrap and trusted dependency installation;
- real SheetJS execution and XLSX import/export verification;
- Chrome/Edge/Firefox browser matrix;
- remote official CI and production build artifact generation;
- live Vercel response-header verification;
- live customer-data privacy/network smoke verification;
- live CSV and XLSX browser smoke tests;
- offline continuation and download verification on the deployed production origin.

The live-host gate is now permanent: after a successful `main` production-gate run it waits for the matching Vercel status, verifies the production response headers, then reruns the deployed-host smoke/privacy suite.
