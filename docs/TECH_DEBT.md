# DataFixer Active Technical Debt

Only active debt or release-process gaps belong here. Resolved bootstrap, browser, deployment and live-host verification blockers are intentionally removed from the active list.

## Runtime verification baseline

This section identifies the last runtime-affecting commit used for release evidence. Documentation-only commits may advance `main` without changing this baseline; update it only when application source, dependencies, build/hosting configuration, workflows, or tests materially change.

- Runtime-affecting baseline commit: `833193891777d264a919b8edc920ba23045754d7`
- GitHub production-gate run: `33590850615`
- Harness: PASS
- Official production gates: PASS
- Unit tests: 74/74 PASS
- Browser tests: 4/4 PASS
- Playwright E2E: 36/36 PASS across Chrome, Edge and Firefox
- Production artifact `datafixer-verification`: `sha256:7383d8e4bbac8ba79b5d56089df499665dba8fcb30ae5c8f1540bf18257c33d6`
- Production artifact `datafixer-dist`: `sha256:5c39b2addd80c7194a5d656c6c1703e98ba2a1fc08ba88d83c3ae5ddfc408cad`
- Vercel Git status: `success` / `Deployment has completed`
- Vercel target project: `qwenbe/data-fixer-app`
- Production origin: `https://data-fixer-app.vercel.app`
- Automated live-host verification run: `33591009615` — PASS
- Exact deployed provenance: expected SHA and `datafixer-build-sha` both `833193891777d264a919b8edc920ba23045754d7`
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
- **Impact:** CI, exact-SHA deployment provenance and live-host verification are green, but GitHub does not yet enforce PR-only changes or required checks at the repository boundary
- **Exit criterion:** an active `main` ruleset requires pull requests and the DataFixer production-gate checks, while blocking force-push and deletion

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
- offline continuation and download verification on the deployed production origin;
- moving-production-alias false positives, closed by embedding Vercel's Git commit SHA in deployed HTML and requiring exact equality with the production-gate SHA before live tests run.

The live-host gate is permanent. It no longer runs from pull-request events against the production alias. After a successful `main` production-gate run, it checks out the exact `workflow_run.head_sha`, waits for Vercel success on that SHA, verifies the deployed `datafixer-build-sha` provenance and security headers, then runs the deployed-host smoke/privacy suite. Manual dispatch remains available for deliberate rechecks.
