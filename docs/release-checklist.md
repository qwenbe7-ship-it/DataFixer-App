# DataFixer V1 Release Checklist

Status values are restricted to `PASS`, `FAIL`, `BLOCKED`, and `NOT_SUPPORTED`.

Evidence baseline: verified `main` commit `11b8073991e015fb22789e409e8e88517bfe6982`, GitHub Actions run `33583805040`.

## Representative acceptance scenarios

| Scenario | Local engine acceptance | Real browser E2E | Expected result |
|---|---|---|---|
| Clean guided orders | PASS | PASS | 4 input = 1 unchanged + 1 changed + 1 removed + 1 rejected |
| Merge two schemas | PASS | PASS | Actual CSV example passes with explicit `amount:number`: 5 input = 0 unchanged + 3 changed + 1 removed + 1 rejected |
| Validate contacts | PASS | PASS | Actual CSV numeric text is validated rule-semantically: 3 input = 1 unchanged + 0 changed + 0 removed + 2 rejected |
| Lookup exact SKU enrichment | PASS | PASS | 3 base input = 0 unchanged + 1 changed + 0 removed + 2 rejected |
| Pattern Normalize phones/SKUs | PASS | PASS | Actual CSV example: 3 input = 0 unchanged + 3 changed + 0 removed + 0 rejected |
| Fill / Default / Coalesce | PASS | PASS | Actual CSV example: 4 input = 1 unchanged + 3 changed + 0 removed + 0 rejected |

Local acceptance is implemented in `tests/local/release-scenarios-check.ts`. The official Playwright run executes the E2E suite against the built production preview and passes across Chrome, Edge and Firefox.

## Spec-to-build audit

| Design section | Evidence / check | Status |
|---|---|---|
| 1. Product definition | Clean/Merge/Validate plus approved Lookup, Pattern Normalize and Fill/Default/Coalesce workflows | PASS |
| 2. Problem to solve | Evidence ledger, reusable settings and guided workflow implement the stated solution | PASS |
| 3. Primary success criterion | Reconciliation, reason completeness and representative browser flows pass | PASS |
| 4. Target users / bilingual | Korean and English dictionaries have matching keys; guides exist in both languages | PASS |
| 5.1 Supported input | File limits, CSV normalization and real SheetJS CSV/XLSX handling pass official gates | PASS |
| 5.2 Clean rules | Rule/engine checks, regex safety and Fill/Default/Coalesce pass | PASS |
| 5.3 Merge rules | Mapping, null fill, source column, stable order, dedupe, output types, numeric normalization, conflicts and evidence pass | PASS |
| 5.4 Validate rules | All rule kinds, strict numeric CSV semantics, source preservation and multi-reason rejection pass | PASS |
| 5.4a Lookup | Exact composite keys, enrichment, missing/ambiguous rejection, provenance and stable output order pass | PASS |
| 5.5 Output files | Real XLSX generation/download, HTML evidence and JSON settings pass official gates | PASS |
| 6. User flow | Reducer, browser component tests and end-to-end flows pass | PASS |
| 7. Screen design | Automated browser flow is PASS; manual accessibility/visual polish remains non-blocking quality work | PASS |
| 8. Architecture | Static app, isolated modules, worker protocol and architecture harness pass | PASS |
| 9. Privacy and security | Local production-preview network/privacy/CSP tests pass; live Vercel host capture remains | BLOCKED |
| 10. Error handling | Structured errors and preflight validation are covered by regression/official checks | PASS |
| 11. Tests and verification | Harness, 74 unit tests, 4 browser tests and 33 Playwright E2E tests pass | PASS |
| 12. V1 completion criteria | Product/CI gates pass; live-host verification and `main` protection are still required for the operational release gate | BLOCKED |
| 13. Public sample workflows | Synthetic Clean/Merge/Validate examples are retained without internal commercial strategy/customer data | PASS |
| 14. V1 exclusions | No login, cloud DB, AI API, email automation, OCR, payments or analytics in runtime source | PASS |
| 15. Expansion conditions | Lookup, Pattern Normalize and Fill/Default/Coalesce are approved extensions; fuzzy/API/cloud features remain out of scope | PASS |
| 16. Approved implementation choices | Static local-first app; CSV/XLSX; XLSX/HTML/JSON outputs; worker-based processing | PASS |

## Browser matrix

| Browser | Status | Notes |
|---|---|---|
| Chrome current | PASS | Official Playwright `chrome` project passes |
| Edge current | PASS | Official Playwright `msedge` project passes |
| Firefox current | PASS | Official Playwright Firefox project passes |
| Safari | NOT_SUPPORTED | V1 does not promise Safari support |

## Privacy release gate

Local production-preview browser status: `PASS`.

Verified by Playwright:
- zero non-GET requests during customer-file processing;
- zero requests to an origin other than the app origin;
- no customer-derived value in request URL, body, headers or console output;
- processing and downloads continue after the already-opened page is put offline;
- the local production preview delivers CSP containing `frame-ancestors 'none'`.

Live Vercel host status: `BLOCKED` only because the actual deployed response/network trace has not yet been captured directly. `vercel.json` defines the required hosting headers and GitHub reports the Vercel deployment for the verified `main` commit as successful.

## Official production evidence

The deterministic path is green:

```bash
node scripts/validate-lockfile.mjs
npm ci --ignore-scripts
./node_modules/.bin/playwright install --with-deps chromium chrome msedge firefox
python scripts/verify.py official
```

Latest verified results:
- harness job: PASS;
- production job: PASS;
- unit tests: 74 PASS;
- browser tests: 4 PASS;
- Playwright E2E: 33 PASS;
- final marker: `ALL_OFFICIAL_PRODUCTION_GATES_PASS`;
- `datafixer-verification` and `datafixer-dist` artifacts generated from the same clean `main` SHA.

## Remaining operational release gates

Current status: `BLOCKED` for public/customer release by two operational items only:

1. Directly capture the live Vercel production response and repeat the privacy smoke test against that deployed origin.
2. Enable an enforced GitHub `main` ruleset requiring pull requests and the production-gate checks, with force-push/deletion blocked.

The former bootstrap, package-registry, real-XLSX, browser-matrix and remote-CI blockers are resolved and must not be reported as current blockers.
