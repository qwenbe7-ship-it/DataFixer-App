# Production environment and remote verification status

## Current state

The development container can still be unable to reach external package/deployment hosts, but that limitation is no longer a DataFixer release blocker. The trusted network-enabled path is the public GitHub repository and its GitHub-hosted Actions runner.

Verified public baseline:

- repository: `qwenbe7-ship-it/DataFixer-App`;
- `main`: `11b8073991e015fb22789e409e8e88517bfe6982`;
- normal production workflow run: `33583805040`;
- harness: PASS;
- official production gates: PASS;
- `datafixer-verification` and `datafixer-dist` artifacts: generated from the same clean commit;
- Vercel Git status: `success` with `Deployment has completed` for project `qwenbe/data-fixer-app`.

## Production verification architecture

Production verification remains split into two workflows:

1. `.github/workflows/bootstrap-lockfile.yml` — manual bootstrap/recovery path when a trusted lockfile must be generated deliberately.
2. `.github/workflows/production-gates.yml` — normal pull-request and `main` release gate using the committed lockfile.

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

The production-preview E2E privacy gate rejects:

- non-GET requests during customer-file processing;
- requests to another origin;
- customer filenames/cell values in request URL/body/headers;
- customer filenames/cell values in console output;
- missing `frame-ancestors 'none'` in the preview CSP response header.

The already-opened application is also verified to complete processing and downloads after the browser is switched offline.

## Vercel deployment state

GitHub commit status proves that the verified `main` commit is connected to Vercel project `qwenbe/data-fixer-app` and that Vercel reported `Deployment has completed`. The repository `vercel.json` defines the production CSP, anti-framing, MIME-sniffing, referrer and Permissions-Policy headers plus immutable caching for hashed assets.

The remaining deployment verification is intentionally narrower: directly capture the live production response and repeat a browser privacy smoke test against the deployed Vercel origin. This verifies hosting behavior rather than build correctness.

## Current release path

For a normal change:

1. create a branch and pull request;
2. require `DataFixer production gates` to pass;
3. review the exact commit and merge;
4. confirm the Vercel status on the merged SHA is successful;
5. verify the live production headers and browser privacy behavior;
6. retain the verification/build artifacts for the release evidence trail.

Repository protection should enforce steps 1–2. At present GitHub still reports `main` as unprotected, so an active `main` ruleset remains an operational release-process gap.
