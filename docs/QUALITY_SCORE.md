# DataFixer Quality Score

This is an evidence scorecard, not a release badge. Scores below are anchored to the last runtime-affecting verification baseline, commit `11b8073991e015fb22789e409e8e88517bfe6982` and GitHub Actions run `33583805040`. Documentation-only commits may advance `main` without changing this evidence baseline.

| Area | Score | Verified evidence | Main remaining gap |
|---|---:|---|---|
| Domain/rule correctness | 9/10 | 74 unit tests plus local release scenarios and rule-specific regression checks | broader property/fuzz testing |
| Reconciliation/evidence | 9/10 | ledger, boundary, hash, workbook/report checks and official production gates | broader adversarial datasets |
| File semantics | 9/10 | real SheetJS 0.20.3, CSV/XLSX tests, binary export/download flows, numeric/blank-row semantics | wider real-world workbook fixture diversity |
| Harness/TDD discipline | 9/10 | harness contract, architecture gate, lockfile validation, local + official verifier, PR/main CI | independent reviewer/required-check enforcement |
| UI/browser confidence | 9/10 | Chromium browser tests plus 33 Playwright E2E tests across Chrome, Edge and Firefox | manual accessibility/visual review; Safari is outside V1 promise |
| Privacy | 8/10 | local production-preview network/header/privacy tests, offline continuation, restrictive CSP contract | direct capture against the live Vercel production origin |
| Release reproducibility | 9/10 | committed validated lockfile, clean `npm ci`, Node 22.16.0, repeatable GitHub Actions, verification + dist artifacts | `main` ruleset still not enforced |
| Documentation/operability | 9/10 | architecture, user guides, release checklist, deployment/security docs, refreshed current-state evidence | keep current-state docs synchronized with later runtime releases |

## Current interpretation

The code, dependency, browser, XLSX and CI gates are green on the public repository. The remaining customer-release work is operational rather than a known product-correctness failure: directly verify the deployed Vercel response/privacy behavior and enable GitHub `main` protection. Bundle-size and performance-baseline work remain P2 optimization debt.
