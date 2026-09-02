# DataFixer Quality Score

This is an evidence scorecard, not a release badge. A high local score cannot override blocked official browser/XLSX gates.

| Area | Score | Evidence | Main gap |
|---|---:|---|---|
| Domain/rule correctness | 9/10 | focused local engine checks + representative scenarios | more property/fuzz testing later |
| Reconciliation/evidence | 9/10 | ledger, boundary, hash, workbook/report checks | real XLSX binary round-trip blocked |
| File semantics | 8/10 | actual CSV examples, row-number and numeric semantics regressions | real SheetJS XLSX execution blocked |
| Harness/TDD discipline | 8/10 | RED→GREEN checks, scoped AGENTS, architecture gate | independent remote reviewer not active yet |
| UI/browser confidence | 6/10 | structure checks + Chrome/Edge/Firefox Playwright matrix + browser E2E suites | real remote browser run still blocked |
| Privacy | 8/10 | static checks + request/header/body/console leak assertions + preview CSP E2E contract | real remote browser capture and deployed-host header check blocked |
| Release reproducibility | 6/10 | Git history + lockfile validator + separate bootstrap/normal CI workflows | real package-lock and first remote official CI run still missing |
| Documentation/operability | 8/10 | guides, release checklist, architecture/spec/review sources | stale-doc automation is limited |

**Current interpretation:** strong offline/local correctness evidence; release remains NO-GO until official production blockers in `docs/TECH_DEBT.md` and `docs/release-checklist.md` are cleared.
