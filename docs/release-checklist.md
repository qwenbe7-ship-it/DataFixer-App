# DataFixer V1 Release Checklist

Status values are restricted to `PASS`, `FAIL`, `BLOCKED`, and `NOT_SUPPORTED`.

## Representative acceptance scenarios

| Scenario | Local engine acceptance | Real browser E2E | Expected result |
|---|---|---|---|
| Clean guided orders | PASS | BLOCKED | 4 input = 1 unchanged + 1 changed + 1 removed + 1 rejected |
| Merge two schemas | PASS | BLOCKED | Actual CSV example passes with explicit `amount:number`: 5 input = 0 unchanged + 3 changed + 1 removed + 1 rejected |
| Validate contacts | PASS | BLOCKED | Actual CSV numeric text is validated rule-semantically: 3 input = 1 unchanged + 0 changed + 0 removed + 2 rejected |
| Lookup exact SKU enrichment | PASS | BLOCKED | 3 base input = 0 unchanged + 1 changed + 0 removed + 2 rejected |
| Pattern Normalize phones/SKUs | PASS | BLOCKED | Actual CSV example: 3 input = 0 unchanged + 3 changed + 0 removed + 0 rejected |
| Fill / Default / Coalesce | PASS | BLOCKED | Actual CSV example: 4 input = 1 unchanged + 3 changed + 0 removed + 0 rejected |

Local acceptance is implemented in `tests/local/release-scenarios-check.ts`. Browser acceptance is implemented in `tests/e2e/clean.spec.ts`, `merge.spec.ts`, `lookup.spec.ts`, and `validate.spec.ts`, but cannot run in the current execution environment because the required npm packages are not installed and registry access is unavailable.

## Spec-to-build audit

| Design section | Evidence / check | Status |
|---|---|---|
| 1. Product definition | Original Clean/Merge/Validate plus user-approved Step 18 exact Lookup extension and local acceptance scenarios | PASS |
| 2. Problem to solve | Evidence ledger, reusable settings, guided workflow implement the stated solution | PASS |
| 3. Primary success criterion | Reconciliation and reason completeness pass locally; real one-screen browser inspection pending | BLOCKED |
| 4. Target users / bilingual | Korean and English dictionaries have matching keys; guides exist in both languages | PASS |
| 5.1 Supported input | File limits and normalization pass locally; real SheetJS CSV/XLSX round-trip pending | BLOCKED |
| 5.2 Clean rules | Local rule and engine checks pass, including approved Step 19 regexReplace/Pattern Normalize with hardened regex preflight and Step 20 Fill/Default/Coalesce | PASS |
| 5.3 Merge rules | Mapping, null fill, source column, stable order, dedupe, explicit output types, raw-CSV numeric normalization, type conflicts and mapping evidence pass locally | PASS |
| 5.4 Validate rules | All eight rule kinds, strict numeric CSV semantics, source-value preservation and multi-reason rejection pass locally | PASS |
| 5.4a Step 18 Lookup | Exact composite keys, one-match enrichment, missing/ambiguous rejection, provenance and stable output order pass locally | PASS |
| 5.5 Output files | Workbook models, HTML and settings pass locally; real XLSX binary round-trip pending | BLOCKED |
| 6. User flow | Reducer and UI structure pass locally; browser flow pending | BLOCKED |
| 7. Screen design | Components implemented; real accessibility/visual/browser inspection pending | BLOCKED |
| 8. Architecture | Static app, isolated modules, worker protocol and local worker checks | PASS |
| 9. Privacy and security | CSP/static no-network scan passes; actual browser network inspection pending | BLOCKED |
| 10. Error handling | Structured errors and preflight validation covered by local checks | PASS |
| 11. Tests and verification | Expanded local regression gates pass; Vitest/Playwright/browser gates unavailable | BLOCKED |
| 12. V1 completion criteria | Cannot be marked complete until all browser, real XLSX and network gates pass | BLOCKED |
| 13. Sales products mapping | Clean/Merge/Validate product mapping retained in design | PASS |
| 14. V1 exclusions | No login, cloud DB, AI API, email automation, OCR, payments or analytics found in runtime source | PASS |
| 15. Expansion conditions | Step 18 Lookup, Step 19 Pattern Normalize, and Step 20 Fill/Default/Coalesce are explicitly user-approved market-driven extensions; excluded fuzzy/API/cloud features remain out of scope | PASS |
| 16. Approved implementation choices | Static local-first app; CSV/XLSX; XLSX/HTML/JSON outputs; original Clean/Merge/Validate plus approved Lookup, Pattern Normalize, and Fill/Default/Coalesce extensions | PASS |

## Browser matrix

| Browser | Status | Notes |
|---|---|---|
| Chrome current | BLOCKED | Playwright `chrome` channel configured; first remote official run pending |
| Edge current | BLOCKED | Playwright `msedge` channel configured; first remote official run pending |
| Firefox current | BLOCKED | Playwright Firefox project configured; first remote official run pending |
| Safari | NOT_SUPPORTED | V1 does not promise Safari support |

## Privacy release gate

Current static source scan: `PASS`.

Release requires all of the following in a production build:
- zero non-GET requests during customer file processing;
- zero requests to an origin other than the app origin;
- no customer-derived value in request URL, body, headers, console telemetry, or remote error reporting;
- `Content-Security-Policy: frame-ancestors 'none'` delivered as a hosting response header.

Current real-browser privacy status: `BLOCKED`.

## Official completion path

Before the first lockfile, run the manual GitHub Actions workflow `.github/workflows/bootstrap-lockfile.yml`. Its canonical `datafixer-package-lock` artifact is published only after local + official bootstrap gates PASS; a failed bootstrap run must not supply a release lockfile. After the reviewed lockfile is committed, the deterministic command path is:

```bash
node scripts/validate-lockfile.mjs
npm ci --ignore-scripts
./node_modules/.bin/playwright install --with-deps chromium chrome msedge firefox
python scripts/verify.py official
```

Current status: `BLOCKED` because this sandbox cannot resolve/install npm dependencies and a dedicated DataFixer remote repository has not yet been provisioned for the networked bootstrap. DataFixer V1 must not be called release-complete until the committed-lockfile workflow exits 0, real Chrome/Edge/Firefox checks pass, real SheetJS XLSX round-trips pass, and browser network/privacy inspection passes. The deployed host must also be checked for the required CSP response header.
