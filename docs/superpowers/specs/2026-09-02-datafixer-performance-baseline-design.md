# DataFixer Performance Baseline V1 Design

## Status

Design for TD-005. This spec adds a reproducible performance-regression gate before any TD-008 bundle/lazy-loading change is attempted.

## Problem

DataFixer has strong correctness, browser, privacy and deployment gates, but it has no versioned throughput or memory baseline. A future large-file or algorithm change could remain functionally correct while becoming materially slower or more memory-hungry. TD-008 also cannot be judged objectively until a baseline exists.

## Goals

1. Reproduce the same representative benchmark data from version-controlled inputs.
2. Measure representative Clean, Merge and Validate pipelines at realistic row counts.
3. Record both elapsed time and heap-growth budgets.
4. Fail CI only on material regressions, not normal hosted-runner jitter.
5. Emit machine-readable benchmark evidence for later TD-008 before/after comparison.
6. Keep production runtime behavior unchanged.

## Non-goals

- No SheetJS lazy-loading or code-splitting in this change.
- No user-visible UI change.
- No change to file/job limits.
- No claim that GitHub-hosted runner timings equal every customer device.
- No micro-optimization solely to make the first benchmark look better.

## Approaches considered

### A. Commit large 10k/50k CSV/XLSX fixtures

Rejected. It makes the repository unnecessarily large and creates noisy fixture diffs. The data itself is synthetic and can be reproduced exactly from a seed and schema.

### B. Browser-only end-to-end performance gate

Rejected as the primary baseline. It measures more of the stack but is too sensitive to browser startup, runner contention and rendering noise for a reliable required gate.

### C. Deterministic synthetic datasets + dedicated Vitest performance project

Selected. The repository versions the benchmark manifest, generator algorithm and seed. The performance project runs in Node, calls the same domain/rule pipeline used by production, measures inside the test body, and writes JSON evidence. Browser/live-host smoke remains responsible for deployment correctness.

## Architecture

### 1. Versioned benchmark manifest

Add `tests/performance/baseline.json` with schema version, fixed seed, case definitions, row counts and regression budgets.

Initial cases:

- `clean-10k`
- `clean-50k`
- `merge-10k-plus-10k`
- `merge-50k-plus-50k`
- `validate-10k`
- `validate-50k`

Each case records:

- operation;
- row count(s);
- deterministic seed;
- maximum median elapsed milliseconds;
- maximum observed heap delta MiB;
- calibration metadata identifying Node 22.16.0 and GitHub-hosted Ubuntu baseline.

The manifest is the versioned benchmark dataset contract. Raw rows are generated deterministically from it rather than stored as large repository blobs.

### 2. Deterministic generator

Add `tests/performance/fixtures.ts`.

It will use a tiny repository-owned seeded PRNG and fixed schemas. No random system time, UUID, locale, network call or external fixture is permitted. Given the same manifest, it must create the same ordered row objects on every run. A determinism test will canonicalize the generated rows and compare a fixed SHA-256 fixture hash so generator drift is explicit and reviewable.

The generated data intentionally includes a stable mix of:

- clean and dirty text;
- duplicate keys;
- blank/defaultable fields;
- valid and invalid numeric/text values;
- merge key overlap and misses.

This exercises normal rule paths without trying to model every customer workbook.

### 3. Performance runner

Add a dedicated `performance` project to `vitest.config.ts`, including only `tests/performance/**/*.test.ts`, Node environment, one worker and serial execution.

Add `tests/performance/pipeline-performance.test.ts`.

For each case it will:

1. generate input outside the timed section where appropriate;
2. run one warm-up iteration;
3. run three measured iterations;
4. collect elapsed time with `performance.now()`;
5. collect `process.memoryUsage().heapUsed` before and after the measured pipeline;
6. use median elapsed time to reduce scheduler noise;
7. use the maximum measured positive heap delta as the memory observation;
8. assert both values are below the manifest budgets;
9. append a structured case result to the benchmark report.

The benchmark process must not run cases concurrently.

### 4. Machine-readable evidence

Add `tests/performance/report.ts`, which writes `benchmark-report.json` containing:

- schema version;
- commit SHA when available;
- Node/platform metadata;
- manifest version;
- per-case row counts;
- iteration timings;
- median timing;
- heap deltas;
- configured budgets;
- PASS/FAIL.

The report must contain no customer data because all benchmark data is synthetic.

### 5. Package and verification integration

Add package script:

- `test:performance` — runs only the Vitest `performance` project serially.

Update `scripts/production-gates.sh` so the performance gate runs after unit tests and before browser/build/E2E gates. A performance regression becomes an official production-gate failure.

Update the unified harness contract so `scripts/verify.py official` continues to surface performance failure through `official-production-gates` without introducing a parallel release path.

Update `.github/workflows/production-gates.yml` to upload `benchmark-report.json` as a dedicated `datafixer-performance` artifact. Existing `datafixer-verification` and `datafixer-dist` artifacts remain unchanged.

## Calibration strategy

Thresholds must not be guessed.

Implementation will use two commits on the feature branch:

1. **Measurement commit:** runner/report plumbing with threshold enforcement disabled only for calibration on the feature branch. Run the same benchmark at least three times in GitHub Actions on Node 22.16.0.
2. **Enforcement commit:** set each timing budget to at least 1.75x the slowest observed median and each heap budget to at least 1.5x the largest observed heap delta, rounded upward to a clear engineering value. Then enable assertions and rerun the full production gate.

The calibration-only state must never merge to `main`.

If a case shows high variance (max median / min median > 1.35), it is not suitable as a required timing gate until the source of variance is understood. The implementation must adjust isolation or move that measurement to observational-only evidence rather than masking the variance with an extreme threshold.

## TDD / contract sequence

1. Add a harness contract test that expects the performance project, manifest, package script and production-gate invocation. Confirm RED.
2. Add manifest/generator/runner/report plumbing. Confirm the contract turns GREEN.
3. Add generator determinism tests, including the fixed canonical fixture hash.
4. Add benchmark-report schema tests.
5. Run calibration in trusted GitHub Actions.
6. Commit objective budgets derived from those runs.
7. Add/enforce timing and heap assertions.
8. Run full local harness, official production gates and PR CI.
9. After merge, require the normal Vercel deployment and exact-SHA live-host gate to pass even though runtime behavior should be unchanged.

## Failure behavior

- Missing/invalid baseline manifest: FAIL.
- Non-deterministic generator test: FAIL.
- Benchmark case exceeds elapsed-time budget: FAIL with case, observed median and budget.
- Benchmark case exceeds heap budget: FAIL with case, observed maximum delta and budget.
- Report cannot be written: FAIL.
- Normal CI environment variance that exceeds the 1.35 calibration criterion: do not silently raise budgets; investigate before enforcement.

## TD-008 dependency

TD-008 work begins only after this baseline is merged and green. SheetJS lazy-loading/code-splitting will then be evaluated as an A/B change against:

- production build chunk sizes;
- benchmark timings;
- worker startup/first XLSX use where measurable;
- full correctness/browser/live-host gates.

If lazy loading removes the warning but worsens real first-use performance beyond the accepted budget, the current static import remains the preferred trade-off and the Vite warning threshold will be documented instead.

## Success criteria

TD-005 is closed only when all of the following are true:

- deterministic benchmark manifest/generator are versioned;
- Clean, Merge and Validate have 10k and 50k-class cases;
- timing and heap budgets are derived from repeated trusted CI measurements;
- required performance assertions are active in `production-gates.sh`;
- `datafixer-performance` retains the machine-readable benchmark report in CI;
- full production gates pass;
- merged `main` deploys successfully and exact-SHA live-host verification remains PASS;
- `docs/TECH_DEBT.md` marks TD-005 resolved with the measured baseline evidence.

## Repository-governance note

TD-007 remains higher severity than TD-005. `main` is currently unprotected and repository rulesets are empty. This design does not pretend to close that external GitHub-settings gap; the performance work still uses PR + exact-head verification discipline until a ruleset is activated.
