# Production environment and remote verification status

## Current state

The development container can still be unable to reach external package/deployment hosts, but that limitation is not a DataFixer release blocker. The trusted network-enabled release path is the public GitHub repository, GitHub-hosted Actions, Vercel Git deployment and the post-deployment exact-SHA live-host verifier.

Runtime verification baseline:

- repository: `qwenbe7-ship-it/DataFixer-App`;
- last runtime-affecting baseline commit: `833193891777d264a919b8edc920ba23045754d7`;
- GitHub production-gate run: `33590850615`;
- harness: PASS;
- official production gates: PASS;
- unit tests: 74/74 PASS;
- browser tests: 4/4 PASS;
- Playwright E2E: 36/36 PASS across Chrome, Edge and Firefox;
- `datafixer-verification` digest: `sha256:7383d8e4bbac8ba79b5d56089df499665dba8fcb30ae5c8f1540bf18257c33d6`;
- `datafixer-dist` digest: `sha256:5c39b2addd80c7194a5d656c6c1703e98ba2a1fc08ba88d83c3ae5ddfc408cad`;
- Vercel Git status: `success` with `Deployment has completed` for project `qwenbe/data-fixer-app`;
- production origin: `https://data-fixer-app.vercel.app`;
- automated post-deployment live-host run: `33591009615` — PASS;
- exact deployed provenance: expected SHA and deployed `datafixer-build-sha` both `833193891777d264a919b8edc920ba23045754d7`;
- deployed-host Chrome smoke/privacy suite: 5/5 PASS.

Documentation-only commits may advance `main` without changing this runtime baseline. Update the baseline only when application source, dependencies, build/hosting configuration, workflows or tests materially change.

## Production verification architecture

Production verification has three complementary workflows:

1. `.github/workflows/bootstrap-lockfile.yml` — manual bootstrap/recovery path when a trusted lockfile must be generated deliberately.
2. `.github/workflows/production-gates.yml` — normal pull-request and `main` release gate using the committed lockfile.
3. `.github/workflows/live-host-verification.yml` — post-deployment gate invoked automatically after a successful `main` production-gate workflow and available by manual dispatch for deliberate rechecks.

The live-host workflow intentionally does **not** run directly from pull-request events against the production alias. Pull requests prove build/test correctness through the production gates and Vercel Preview status; the production-origin smoke gate is reserved for deployed `main` and binds itself to the exact successful production-gate SHA.

The first bootstrap has already been completed. Normal releases must not regenerate or repair the lockfile silently.

### Normal production workflow

`production-gates.yml`:

1. requires the committed `package-lock.json`;
2. validates direct dependency pins, the SheetJS tarball source and integrity;
3. performs `npm ci --ignore-scripts`;
4. installs Chromium plus branded Chrome, Microsoft Edge and Firefox;
5. runs the repository harness;
6. runs local verification with the real project toolchain;
7. runs all official production gates;
8. uploads machine-readable verification evidence and the production `dist/` artifact on success.

### Exact-SHA live-host workflow

`live-host-verification.yml`:

1. receives the successful `main` production-gate `workflow_run.head_sha`;
2. checks out that exact SHA rather than a moving branch ref;
3. exports the same SHA as `DATAFIXER_EXPECTED_SHA`;
4. waits for the Vercel commit status for that exact SHA to become successful;
5. reads the production HTML and requires its `datafixer-build-sha` meta value to equal `DATAFIXER_EXPECTED_SHA` exactly;
6. only after provenance equality passes, verifies CSP anti-framing plus `nosniff`, `DENY`, `no-referrer` and restrictive Permissions-Policy headers;
7. points Playwright at the deployed origin through `DATAFIXER_BASE_URL`, without starting the local preview server;
8. runs the CSV Clean smoke flow;
9. generates and uploads a real XLSX workbook and requires successful reconciliation;
10. reruns privacy/network assertions against the deployed origin;
11. verifies offline continuation and all four downloads from an already-opened deployed page.

Vite obtains the provenance value from Vercel's build-time `VERCEL_GIT_COMMIT_SHA` and injects it as `<meta name="datafixer-build-sha" ...>` only when that deployment metadata is available. This closes the false-positive case where a moving production alias could otherwise have advanced to a different commit before smoke verification begins.

The verified production origin is `https://data-fixer-app.vercel.app`.

## Lockfile trust contract

`package.json` uses exact direct versions. `scripts/validate-lockfile.mjs` checks that:

- lockfile version is at least 3;
- root dependencies exactly match `package.json`;
- every direct dependency has a lock entry and integrity metadata;
- normal direct packages resolve to the exact pinned version;
- `xlsx` resolves exactly to the approved SheetJS 0.20.3 tarball.

## Browser and privacy evidence

The official Playwright matrix passes on:

- Google Chrome stable (`channel: chrome`);
- Microsoft Edge stable (`channel: msedge`);
- Mozilla Firefox.

The exact-SHA live deployed-host gate additionally verifies in Chrome:

- deployed HTML provenance equals the expected successful `main` SHA;
- no non-GET requests during customer-file processing;
- no requests to another origin;
- no customer filenames/cell values in request URL/body/headers;
- no customer filenames/cell values in console output;
- `Content-Security-Policy` contains `frame-ancestors 'none'`;
- `X-Content-Type-Options: nosniff`;
- `X-Frame-Options: DENY`;
- `Referrer-Policy: no-referrer`;
- restrictive camera/microphone/geolocation/payment/USB Permissions-Policy;
- CSV and XLSX processing succeeds;
- processing and downloads continue after the browser is switched offline.

## Current release path

For a normal runtime-affecting change:

1. create a branch and pull request;
2. require `DataFixer production gates` to pass;
3. review the exact commit and merge;
4. let Vercel deploy the merged SHA;
5. after the successful `main` production-gate run, the post-production workflow checks out that exact SHA, waits for its Vercel status, proves the production HTML was built from the same SHA, then runs live-host verification;
6. retain the verification/build artifacts for the release evidence trail;
7. update the runtime verification baseline in current-state documentation.

Repository protection should enforce steps 1–2. GitHub still reports `main` as unprotected and the repository ruleset collection is empty, so an active `main` ruleset is the remaining P1 release-process gap. Bundle-size/performance work remains P2 optimization debt.
