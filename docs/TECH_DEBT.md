# DataFixer Active Technical Debt

Only active debt/blockers belong here. Every item needs severity, trigger and an objective exit criterion.

## TD-001 — Official npm dependency bootstrap unavailable

- **Severity:** P0 release blocker
- **State:** BLOCKED; bootstrap workflow is ready, but no dedicated DataFixer remote repository/real lockfile exists yet
- **Trigger:** any release or real production verification
- **Impact:** Vitest, browser mode, ESLint, Vite build, Playwright project runner and real SheetJS package cannot execute here.
- **Exit criterion:** dedicated DataFixer GitHub repo runs `bootstrap-lockfile.yml`, generated lock passes validation/official gates, reviewed `package-lock.json` is committed, and normal `production-gates.yml` is green.

## TD-002 — Real XLSX binary round-trip not yet proven

- **Severity:** P0 release blocker
- **State:** BLOCKED
- **Trigger:** XLSX import/export release claim
- **Impact:** local adapter tests verify the interface, not SheetJS binary correctness.
- **Exit criterion:** official SheetJS 0.20.3 reads/writes representative XLSX fixtures and round-trip tests PASS.

## TD-003 — Production browser privacy capture pending

- **Severity:** P0 release blocker
- **State:** BLOCKED
- **Trigger:** public/customer release
- **Impact:** static scan is PASS but production browser network behavior is not yet captured.
- **Exit criterion:** Chromium/Firefox production E2E shows zero off-origin and zero write requests during file processing; hosting CSP header verified.

## TD-004 — Browser matrix incomplete

- **Severity:** P1 release blocker
- **State:** BLOCKED
- **Trigger:** release candidate
- **Exit criterion:** promised Chrome, Edge and Firefox flows PASS with downloads and offline continuity.

## TD-005 — Performance baseline not versioned

- **Severity:** P2
- **State:** OPEN
- **Trigger:** large-file/algorithm changes
- **Impact:** functional regressions are caught more strongly than throughput regressions.
- **Exit criterion:** versioned benchmark dataset and threshold report for representative row counts.


## TD-006 — Dedicated remote CI repository not provisioned

- **Severity:** P0 release blocker
- **State:** OPEN
- **Trigger:** first GitHub-hosted production bootstrap
- **Impact:** the prepared network-enabled Actions workflows cannot execute until the verified local Git history is pushed to a dedicated DataFixer repository.
- **Exit criterion:** dedicated DataFixer repository exists, current `main` is pushed without reusing unrelated repositories, and `bootstrap-lockfile.yml` can be dispatched.
