# DataFixer V1 Release Checklist

Status values are restricted to `PASS`, `FAIL`, `BLOCKED`, and `NOT_SUPPORTED`.

Runtime verification baseline: commit `833193891777d264a919b8edc920ba23045754d7`, GitHub production-gate run `33590850615`, automated live-host run `33591009615`. Documentation-only commits may advance `main` without changing this baseline; update it when runtime-affecting source, dependency, build/hosting configuration, workflow, or test changes occur.

## Representative acceptance scenarios

| Scenario | Local engine acceptance | Real browser E2E | Expected result |
|---|---|---|---|
| Clean guided orders | PASS | PASS | 4 input = 1 unchanged + 1 changed + 1 removed + 1 rejected |
| Merge two schemas | PASS | PASS | Actual CSV example passes with explicit `amount:number`: 5 input = 0 unchanged + 3 changed + 1 removed + 1 rejected |
| Validate contacts | PASS | PASS | Actual CSV numeric text is validated rule-semantically: 3 input = 1 unchanged + 0 changed + 0 removed + 2 rejected |
| Lookup exact SKU enrichment | PASS | PASS | 3 base input = 0 unchanged + 1 changed + 0 removed + 2 rejected |
| Pattern Normalize phones/SKUs | PASS | PASS | Actual CSV example: 3 input = 0 unchanged + 3 changed + 0 removed + 0 rejected |
| Fill / Default / Coalesce | PASS | PASS | Actual CSV example: 4 input = 1 unchanged + 3 changed + 0 removed + 0 rejected |

Local acceptance is implemented in `tests/local/release-scenarios-check.ts`. The official Playwright run executes the E2E suite against the built production preview and passes across Chrome, Edge and Firefox. The deployed Vercel origin additionally passes dedicated CSV, XLSX, privacy/header and offline smoke verification in Chrome.

## Spec-to-build audit

| Design section | Evidence / check | Status |
|---|---|---|
| 1. Product definition | Clean/Merge/Validate plus approved Lookup, Pattern Normalize and Fill/Default/Coalesce workflows | PASS |
| 2. Problem to solve | Evidence ledger, reusable settings and guided workflow implement the stated solution | PASS |
| 3. Primary success criterion | Reconciliation, reason completeness and representative browser flows pass | PASS |
| 4. Target users / bilingual | Korean and English dictionaries have matching keys; guides exist in both languages | PASS |
| 5.1 Supported input | File limits, CSV normalization and real SheetJS CSV/XLSX handling pass official and live-host gates | PASS |
| 5.2 Clean rules | Rule/engine checks, regex safety and Fill/Default/Coalesce pass | PASS |
| 5.3 Merge rules | Mapping, null fill, source column, stable order, dedupe, output types, numeric normalization, conflicts and evidence pass | PASS |
| 5.4 Validate rules | All rule kinds, strict numeric CSV semantics, source preservation and multi-reason rejection pass | PASS |
| 5.4a Lookup | Exact composite keys, enrichment, missing/ambiguous rejection, provenance and stable output order pass | PASS |
| 5.5 Output files | Real XLSX generation/download, HTML evidence and JSON settings pass official gates | PASS |
| 6. User flow | Reducer, browser component tests and end-to-end flows pass | PASS |
| 7. Screen design | Automated browser flow is PASS; manual accessibility/visual polish remains non-blocking quality work | PASS |
| 8. Architecture | Static app, isolated modules, worker protocol and architecture harness pass | PASS |
| 9. Privacy and security | Production-preview and exact-SHA live Vercel header/network/privacy/offline verification pass | PASS |
| 10. Error handling | Structured errors and preflight validation are covered by regression/official checks | PASS |
| 11. Tests and verification | Harness, 74 unit tests, 4 browser tests and 36 Playwright E2E tests pass; live deployed-host suite is 5/5 PASS | PASS |
| 12. V1 runtime completion criteria | Product, CI, Vercel deployment, deployed-SHA provenance and live-host verification gates pass | PASS |
| 13. Public sample workflows | Synthetic Clean/Merge/Validate examples are retained without internal commercial strategy/customer data | PASS |
| 14. V1 exclusions | No login, cloud DB, AI API, email automation, OCR, payments or analytics in runtime source | PASS |
| 15. Expansion conditions | Lookup, Pattern Normalize and Fill/Default/Coalesce are approved extensions; fuzzy/API/cloud features remain out of scope | PASS |
| 16. Approved implementation choices | Static local-first app; CSV/XLSX; XLSX/HTML/JSON outputs; worker-based processing | PASS |

## Browser matrix

| Browser | Status | Notes |
|---|---|---|
| Chrome current | PASS | Official matrix passes; live production smoke/privacy gate also passes |
| Edge current | PASS | Official Playwright `msedge` project passes |
| Firefox current | PASS | Official Playwright Firefox project passes |
| Safari | NOT_SUPPORTED | V1 does not promise Safari support |

## Privacy and exact live-host release gate

Production origin: `https://data-fixer-app.vercel.app`

The release gate first proves it is testing the intended deployment: Vercel exposes `VERCEL_GIT_COMMIT_SHA` at build time, Vite writes it into the production HTML as `datafixer-build-sha`, and the live verifier requires exact equality with `DATAFIXER_EXPECTED_SHA` from the successful `main` production-gate workflow run.

Verified on runtime baseline `833193891777d264a919b8edc920ba23045754d7`:
- workflow checkout SHA: `833193891777d264a919b8edc920ba23045754d7`;
- expected deployed SHA: `833193891777d264a919b8edc920ba23045754d7`;
- deployed HTML `datafixer-build-sha`: `833193891777d264a919b8edc920ba23045754d7`;
- `Content-Security-Policy` contains `frame-ancestors 'none'`;
- `X-Content-Type-Options: nosniff`;
- `X-Frame-Options: DENY`;
- `Referrer-Policy: no-referrer`;
- restrictive `Permissions-Policy` for camera, microphone, geolocation, payment and USB;
- zero non-GET requests during customer-file processing;
- zero requests to an origin other than the app origin;
- no customer-derived value in request URL, body, headers or console output;
- CSV Clean smoke flow succeeds;
- a generated real XLSX workbook is accepted and reconciled successfully;
- processing and four downloads continue after the already-opened page is switched offline.

Automated live-host run `33591009615`: `PASS`, with exact provenance verification and 5/5 Chrome tests passing. The workflow runs automatically only after a successful `main` production-gate workflow, rather than treating the moving production alias as a pull-request Preview. Manual dispatch remains available for deliberate rechecks.

## Official production evidence

The deterministic path is green:

```bash
node scripts/validate-lockfile.mjs
npm ci --ignore-scripts
./node_modules/.bin/playwright install --with-deps chromium chrome msedge firefox
python scripts/verify.py official
```

Runtime baseline results:
- harness job: PASS;
- production job: PASS;
- unit tests: 74/74 PASS;
- browser tests: 4/4 PASS;
- Playwright E2E: 36/36 PASS across Chrome, Edge and Firefox;
- final marker: `ALL_OFFICIAL_PRODUCTION_GATES_PASS`;
- `datafixer-verification` artifact digest: `sha256:7383d8e4bbac8ba79b5d56089df499665dba8fcb30ae5c8f1540bf18257c33d6`;
- `datafixer-dist` artifact digest: `sha256:5c39b2addd80c7194a5d656c6c1703e98ba2a1fc08ba88d83c3ae5ddfc408cad`;
- both artifacts were generated from runtime baseline SHA `833193891777d264a919b8edc920ba23045754d7`.

## Remaining operational release-process gap

The runtime/customer-host release gates are `PASS`.

One repository-governance item remains: enable an enforced GitHub `main` ruleset requiring pull requests and the production-gate checks, with force-push and branch deletion blocked. GitHub currently reports `main` as unprotected and the repository ruleset collection is empty. This is a P1 release-process gap, not a known application/runtime correctness failure.
