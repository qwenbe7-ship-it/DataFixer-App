# Production environment and remote verification status

## Current state

The development container can still be unable to reach external package/deployment hosts, but that limitation is not a DataFixer release blocker. The trusted network-enabled release path is the public GitHub repository, GitHub-hosted Actions, Vercel Git deployment and the post-deployment live-host verifier.

Runtime verification baseline:

- repository: `qwenbe7-ship-it/DataFixer-App`;
- last runtime-affecting baseline commit: `6e782059180a36368aca1cac22d01f58acd16410`;
- GitHub production-gate run: `33587953565`;
- harness: PASS;
- official production gates: PASS;
- unit tests: 74/74 PASS;
- browser tests: 4/4 PASS;
- Playwright E2E: 36/36 PASS across Chrome, Edge and Firefox;
- `datafixer-verification` and `datafixer-dist` artifacts: generated from the same clean runtime baseline;
- Vercel Git status: `success` with `Deployment has completed` for project `qwenbe/data-fixer-app`;
- production origin: `https://data-fixer-app.vercel.app`;
- automated post-deployment live-host run: `33588151511` — PASS;
- deployed-host Chrome smoke/privacy suite: 5/5 PASS.

Documentation-only commits may advance `main` without changing this runtime baseline. Update the baseline only when application source, dependencies, build/hosting configuration, workflows or tests materially change.

## Production verification architecture

Production verification now has three complementary workflows:

1. `.github/workflows/bootstrap-lockfile.yml` — manual bootstrap/recovery path when a trusted lockfile must be generated deliberately.
2. `.github/workflows/production-gates.yml` — normal pull-request and `main` release gate using the committed lockfile.
3. `.github/workflows/live-host-verification.yml` — deployed-host gate that runs on relevant pull requests and automatically after a successful `main` production-gate run.

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

### Live-host workflow

`live-host-verification.yml`:

1. waits for the matching merged `main` Vercel commit status to become successful;
2. discovers and verifies the DataFixer production origin;
3. requires the deployed response to contain the configured CSP anti-framing directive plus `nosniff`, `DENY`, `no-referrer` and restrictive Permissions-Policy headers;
4. points Playwright at the deployed origin through `DATAFIXER_BASE_URL`, without starting the local preview server;
5. runs the CSV Clean smoke flow;
6. generates and uploads a real XLSX workbook and requires successful reconciliation;
7. reruns privacy/network assertions against the deployed origin;
8. verifies offline continuation and all four downloads from an already-opened deployed page.

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

The live deployed-host gate additionally verifies in Chrome:

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
5. the post-production workflow waits for Vercel success and runs live-host verification automatically;
6. retain the verification/build artifacts for the release evidence trail;
7. update the runtime verification baseline in current-state documentation.

Repository protection should enforce steps 1–2. GitHub still reports `main` as unprotected, so an active `main` ruleset is the remaining P1 release-process gap. Bundle-size/performance work remains P2 optimization debt.
