# Production environment unblock

## Current root cause

The ChatGPT execution container used during development cannot resolve or connect to external package hosts. The failure is environment-wide, not npm-specific. Local harness verification remains useful, but the official React/Vite/Vitest/Playwright/SheetJS production gates require a trusted network-enabled runner.

## Release bootstrap architecture

Production verification is intentionally split into two GitHub Actions workflows:

1. `.github/workflows/bootstrap-lockfile.yml` — **manual first-run bootstrap only**.
2. `.github/workflows/production-gates.yml` — **normal pull-request/main release gate after the lockfile is committed**.

This split avoids a deadlock where CI requires `package-lock.json` before any trusted runner has had a chance to generate it.

### First-run bootstrap workflow

`bootstrap-lockfile.yml` does the following on a network-enabled GitHub-hosted runner:

1. checks out the exact commit;
2. installs Node 22.16.0 without npm caching (there is no trusted lockfile yet);
3. runs `npm install --package-lock-only --ignore-scripts` so dependency resolution creates only the lockfile;
4. runs `node scripts/validate-lockfile.mjs`;
5. uploads the generated `package-lock.json` as the `datafixer-package-lock` artifact;
6. runs deterministic `npm ci --ignore-scripts` from that generated lock;
7. installs Playwright Chromium plus branded Chrome, Microsoft Edge and Firefox using the installed Playwright binary directly;
8. runs `python scripts/verify.py local` with the real project toolchain;
9. runs `python scripts/verify.py official`;
10. uploads verification reports and the production build when successful.

The bootstrap workflow is `workflow_dispatch` only. It does not silently modify the repository and does not claim the generated lockfile is canonical until its validator and official gates have run.

### Normal production workflow

Once the generated lockfile has been reviewed and committed, `production-gates.yml`:

1. requires committed `package-lock.json`;
2. validates direct dependency pins, SheetJS URL and SHA-512 integrity with `scripts/validate-lockfile.mjs`;
3. performs `npm ci --ignore-scripts`;
4. installs the declared browser matrix;
5. runs the repository harness;
6. runs all official production gates;
7. uploads machine-readable verification evidence and `dist/` only on success.

`production-gates.yml` must never generate or repair a missing lockfile. Lockfile drift is a release failure, not something CI is allowed to hide.

## Lockfile trust contract

`package.json` uses exact direct versions. `scripts/validate-lockfile.mjs` checks that:

- lockfile version is at least 3;
- root `dependencies` and `devDependencies` exactly match `package.json`;
- every direct dependency has a lock entry;
- normal direct packages resolve to the exact pinned version;
- the `xlsx` direct dependency resolves exactly to `https://cdn.sheetjs.com/xlsx-0.20.3/xlsx-0.20.3.tgz`;
- every direct dependency carries SHA-512 integrity metadata.

SheetJS documents the 0.20.3 tarball URL as its official Node package source. Vendoring the tarball may be considered later for additional supply-chain resilience, but it is not silently substituted during bootstrap.

## Browser and privacy release contract

The official Playwright matrix is now:

- Google Chrome stable (`channel: chrome`)
- Microsoft Edge stable (`channel: msedge`)
- Mozilla Firefox

Bundled Chromium is also installed because Vitest Browser Mode uses it.

Production E2E includes privacy checks that reject:

- any non-GET request during customer-file processing;
- any request to a different origin;
- customer filenames or cell values appearing in request URLs, request bodies or request headers;
- customer filenames or cell values appearing in console output;
- missing `frame-ancestors 'none'` in the production preview HTTP CSP header.

The preview CSP check proves the production bundle can be served with the required header. A real public host must still be checked after deployment because static build files cannot force hosting response headers by themselves.

## Exact path to first official PASS

1. Create a dedicated DataFixer GitHub repository. Do **not** reuse an unrelated repository.
2. Push the current verified `main` history to that repository.
3. In GitHub Actions, manually run **DataFixer bootstrap lockfile**.
4. Download the `datafixer-package-lock` artifact.
5. Review it and add it to the repository as `package-lock.json`.
6. Run `node scripts/validate-lockfile.mjs` locally or in CI.
7. Commit and push the lockfile.
8. Let **DataFixer production gates** run from the committed lockfile.
9. Inspect `datafixer-verification` and `datafixer-dist` artifacts.
10. Only after the workflow is green, update `docs/release-checklist.md` and close the matching P0 debt items.

## Current environment status

Available and verified in the development container:

- Node 22.16.0;
- system Chromium;
- Git history and isolated worktree workflow;
- offline/local TypeScript and Golden Dataset harness;
- lockfile/workflow/browser/privacy contracts.

Still impossible inside this container until outbound networking is enabled or dependencies are supplied locally:

- resolving npm dependencies;
- downloading the official SheetJS package;
- generating the real canonical `package-lock.json`;
- installing branded Chrome/Edge through Playwright;
- executing the official npm/browser production suite.

The connected GitHub account currently exposes other repositories but no dedicated DataFixer repository. The available GitHub connector can operate on an existing repository but cannot create a new repository, so provisioning that one repository remains the only external setup step before the bootstrap workflow can actually run.
