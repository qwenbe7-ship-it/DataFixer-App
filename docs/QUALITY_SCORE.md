# DataFixer Quality Score

This is an evidence scorecard, not a release badge. Scores below are anchored to the last runtime-affecting verification baseline, commit `833193891777d264a919b8edc920ba23045754d7`, GitHub production-gate run `33590850615`, and automated exact-SHA live-host run `33591009615`. Documentation-only commits may advance `main` without changing this evidence baseline.

| Area | Score | Verified evidence | Main remaining gap |
|---|---:|---|---|
| Domain/rule correctness | 9/10 | 74/74 unit tests plus local release scenarios and rule-specific regression checks | broader property/fuzz testing |
| Reconciliation/evidence | 9/10 | ledger, boundary, hash, workbook/report checks and official production gates | broader adversarial datasets |
| File semantics | 9/10 | real SheetJS 0.20.3, CSV/XLSX tests, binary export/download flows, numeric/blank-row semantics, live XLSX smoke | wider real-world workbook fixture diversity |
| Harness/TDD discipline | 9/10 | harness contract, architecture gate, lockfile validation, RED→GREEN exact-provenance contract, local + official verifier, PR/main CI | repository-level required-check enforcement |
| UI/browser confidence | 9/10 | 4 browser tests plus 36 Playwright E2E tests across Chrome, Edge and Firefox; deployed Chrome smoke is 5/5 PASS | manual accessibility/visual review; Safari is outside V1 promise |
| Privacy | 9/10 | local and deployed-host network/header/privacy tests, same-origin/GET-only processing assertions, offline continuation | broader long-duration/adversarial privacy testing |
| Release reproducibility | 9/10 | committed validated lockfile, Node 22.16.0, clean `npm ci`, repeatable production gates, signed main commit, verification/dist artifacts, exact checkout SHA and deployed HTML provenance equality | `main` ruleset still not enforced |
| Documentation/operability | 9/10 | architecture, user guides, release checklist, deployment/security docs and runtime-baseline policy synchronized to the exact-SHA release gate | routine maintenance as later runtime releases land |

## Current interpretation

DataFixer V1's runtime, dependency, browser, XLSX, privacy, Vercel deployment and deployed-host smoke gates are green on the public repository and production origin `https://data-fixer-app.vercel.app`.

The live-host evidence is now cryptographically anchored to the Git history at the workflow boundary: the verifier checks out `833193891777d264a919b8edc920ba23045754d7`, expects that SHA, and the deployed HTML reports the same SHA through `datafixer-build-sha` before any production smoke assertion is accepted.

The only remaining P1 release-process gap is GitHub `main` protection/ruleset enforcement. Performance benchmarking and bundle-size work remain P2 optimization debt rather than known correctness failures.
