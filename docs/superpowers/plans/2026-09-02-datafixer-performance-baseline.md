# DataFixer Performance Baseline V1 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a deterministic, CI-calibrated performance regression gate for Clean, Merge, and Validate without changing production runtime behavior.

**Architecture:** A dedicated Vitest `performance` project generates synthetic deterministic datasets from a versioned manifest and calls the production `processDatasets()` orchestration directly. It measures median elapsed time and explicit-GC retained heap, writes `benchmark-report.json`, and is invoked by the existing official production gate so there is no second release path.

**Tech Stack:** TypeScript 6.0.3, Vitest 4.1.11, Node 22.16.0, Python harness contracts, GitHub Actions v7.

**Spec:** `docs/superpowers/specs/2026-09-02-datafixer-performance-baseline-design.md`

## Global Constraints

- Customer-derived data must never be used; benchmark rows are synthetic and deterministic.
- Node calibration target is exactly `22.16.0` on GitHub-hosted Ubuntu.
- Initial cases are `clean-10k`, `clean-50k`, `merge-10k-plus-10k`, `merge-50k-plus-50k`, `validate-10k`, and `validate-50k`.
- Performance execution uses one worker, no file parallelism, and `--expose-gc`.
- Each case runs one warm-up and three measured iterations.
- Timing observation is the median of the three measured iterations.
- Memory observation is the maximum positive explicit-GC retained-heap delta.
- Calibration requires at least three trusted GitHub Actions runs.
- Timing budget is at least `1.75 × slowest observed median`, rounded upward to a clear engineering value.
- Retained-heap budget is at least `1.5 × largest observed retained-heap delta`, rounded upward.
- Timing variance `max median / min median > 1.35` must be investigated rather than hidden with a large budget.
- Calibration-only budget enforcement must never merge to `main`.
- TD-008 bundle/lazy-loading work does not begin until this plan is merged and TD-005 is closed.

---

### Task 1: Add the performance contract and prove RED

**Files:**
- Create: `tests/harness/performance-baseline-contract-check.py`
- Modify: `tests/harness/harness-contract-check.py`
- Modify: `scripts/verify.py`
- Modify: `.github/workflows/production-gates.yml`

**Interfaces:**
- Consumes: repository files and text configuration only.
- Produces: `performance-baseline-contract-check.py` returning exit code 0 only when the performance project, manifest, package script, official gate invocation, and CI artifact upload all exist.

- [ ] **Step 1: Create the failing contract test**

The check must require these files:

```python
REQUIRED_FILES = [
    'tests/performance/baseline.json',
    'tests/performance/fixtures.ts',
    'tests/performance/report.ts',
    'tests/performance/pipeline-performance.test.ts',
]
```

It must load `package.json`, `vitest.config.ts`, `scripts/production-gates.sh`, and `.github/workflows/production-gates.yml` and assert all of these markers:

```python
'"test:performance"'
"name: 'performance'"
"execArgv: ['--expose-gc']"
'maxWorkers: 1'
'fileParallelism: false'
'npm run test:performance'
'name: datafixer-performance'
'path: benchmark-report.json'
```

Failures print `FAIL <message>` and return 1; success prints `PASS performance-baseline-contract-check`.

- [ ] **Step 2: Wire the contract into the existing harness before implementation**

Add `tests/harness/performance-baseline-contract-check.py` to `REQUIRED_FILES` in `tests/harness/harness-contract-check.py`.

Add this entry to `local_checks()` in `scripts/verify.py`, immediately after `privacy-production-contract`:

```python
('performance-baseline-contract', [py, 'tests/harness/performance-baseline-contract-check.py']),
```

Add this harness workflow step after `Privacy production contract`:

```yaml
      - name: Performance baseline contract
        run: python tests/harness/performance-baseline-contract-check.py
```

- [ ] **Step 3: Run the contract and confirm RED**

Run through PR CI/harness. Expected: `performance-baseline-contract-check.py` fails because `tests/performance/*`, `test:performance`, the Vitest project, production-gate invocation, and artifact do not exist yet. Existing earlier harness checks must remain PASS.

- [ ] **Step 4: Commit the RED contract**

Commit message:

```text
test: define performance baseline contract
```

---

### Task 2: Add deterministic benchmark data and correctness tests

**Files:**
- Create: `tests/performance/baseline.json`
- Create: `tests/performance/fixtures.ts`
- Create: `tests/performance/fixtures.test.ts`

**Interfaces:**
- Produces: `generateCleanDataset(rows: number, seed: number): Dataset`, `generateMergeDatasets(rowsPerSource: number, seed: number): Dataset[]`, `generateValidateDataset(rows: number, seed: number): Dataset`, plus canonical deterministic fixture hashes.

- [ ] **Step 1: Create calibration manifest**

Use schema version 1 and `enforceBudgets: false`. Define all six cases with fixed seeds and `maxMedianMs` / `maxRetainedHeapMiB` set to `null` during calibration. Example shape:

```json
{
  "schemaVersion": 1,
  "manifestVersion": "1.0.0",
  "enforceBudgets": false,
  "calibration": {"node": "22.16.0", "platform": "github-ubuntu"},
  "cases": [
    {"id":"clean-10k","operation":"clean","rows":[10000],"seed":101,"maxMedianMs":null,"maxRetainedHeapMiB":null},
    {"id":"clean-50k","operation":"clean","rows":[50000],"seed":102,"maxMedianMs":null,"maxRetainedHeapMiB":null},
    {"id":"merge-10k-plus-10k","operation":"merge","rows":[10000,10000],"seed":201,"maxMedianMs":null,"maxRetainedHeapMiB":null},
    {"id":"merge-50k-plus-50k","operation":"merge","rows":[50000,50000],"seed":202,"maxMedianMs":null,"maxRetainedHeapMiB":null},
    {"id":"validate-10k","operation":"validate","rows":[10000],"seed":301,"maxMedianMs":null,"maxRetainedHeapMiB":null},
    {"id":"validate-50k","operation":"validate","rows":[50000],"seed":302,"maxMedianMs":null,"maxRetainedHeapMiB":null}
  ]
}
```

- [ ] **Step 2: Implement deterministic generators**

Use a repository-owned xorshift32 PRNG:

```ts
export function seededRandom(seed: number): () => number {
  let state = seed >>> 0;
  return () => {
    state ^= state << 13;
    state ^= state >>> 17;
    state ^= state << 5;
    return (state >>> 0) / 0x100000000;
  };
}
```

Generate rows with stable `rowId`, `sourceId`, and `sourceRowNumber`. Clean data columns: `id`, `name`, `amount`, `status`, `fallback`. Merge data uses two sources with `id`, `name`, `amount`, stable key overlap/misses, source-specific column maps, and deterministic duplicate keys. Validate data includes deterministic required/type/range/allowed violations.

- [ ] **Step 3: Add determinism tests before performance tests**

`fixtures.test.ts` must generate a small fixed sample twice and assert deep equality. It must also canonicalize the first 100 generated rows and assert a fixed SHA-256 hash using the existing `sha256Canonical()` helper. The fixed hash is committed only after the first deterministic generator run establishes it; any later generator drift requires an explicit review/update.

- [ ] **Step 4: Run the focused tests**

Run:

```bash
npx vitest run tests/performance/fixtures.test.ts --environment node
```

Expected: PASS after fixing the committed fixture hash to the first known deterministic value.

- [ ] **Step 5: Commit**

```text
feat: add deterministic performance fixtures
```

---

### Task 3: Add the serial performance runner and machine-readable report

**Files:**
- Create: `tests/performance/report.ts`
- Create: `tests/performance/report.test.ts`
- Create: `tests/performance/pipeline-performance.test.ts`
- Modify: `vitest.config.ts`
- Modify: `package.json`
- Modify: `scripts/production-gates.sh`
- Modify: `.github/workflows/production-gates.yml`

**Interfaces:**
- `writeBenchmarkReport(report: BenchmarkReport, path?: string): void` writes `benchmark-report.json`.
- `measureCase(caseDef: BenchmarkCase): Promise<BenchmarkCaseResult>` returns raw timings, median, heap observations, retained heap delta, budgets, and status.

- [ ] **Step 1: Add report schema test**

Assert report shape contains `schemaVersion`, `commitSha`, `node`, `platform`, `manifestVersion`, `enforceBudgets`, and `cases`, and that case entries contain `timingsMs`, `medianMs`, `heapBeforeBytes`, `heapAfterGcBytes`, `maxRetainedHeapMiB`, configured budgets, and `status`.

- [ ] **Step 2: Implement `report.ts` minimally**

Use `JSON.stringify(report, null, 2) + '\n'`. Commit SHA comes from `GITHUB_SHA ?? null`. Write to repository-root `benchmark-report.json` by default.

- [ ] **Step 3: Add the dedicated Vitest project**

Add a third project in `vitest.config.ts`:

```ts
{
  test: {
    name: 'performance',
    include: ['tests/performance/**/*.test.ts'],
    environment: 'node',
    pool: 'forks',
    execArgv: ['--expose-gc'],
    maxWorkers: 1,
    fileParallelism: false,
  },
},
```

- [ ] **Step 4: Implement the benchmark cases against production orchestration**

Import `processDatasets` from `src/app/process-job.ts`. Use these representative rules/settings:

```ts
const cleanRules: CleanRule[] = [
  { id: 'trim-name', kind: 'trim', column: 'name' },
  { id: 'parse-amount', kind: 'parseNumber', column: 'amount', removeThousandsSeparator: true },
  { id: 'fill-status', kind: 'fillDefault', column: 'status', value: 'active' },
  { id: 'coalesce-name', kind: 'coalesce', column: 'name', sourceColumns: ['fallback'] },
  { id: 'dedupe-id', kind: 'dedupe', columns: ['id'] },
];

const validationRules: ValidationRule[] = [
  { id: 'required-id', kind: 'required', column: 'id' },
  { id: 'amount-type', kind: 'type', column: 'amount', expected: 'number' },
  { id: 'amount-range', kind: 'numberRange', column: 'amount', min: 0, max: 1000000 },
  { id: 'status-allowed', kind: 'allowed', column: 'status', values: ['active', 'inactive'] },
  { id: 'unique-id', kind: 'unique', columns: ['id'] },
];
```

Merge settings:

```ts
const mergeSettings: MergeSettings = {
  columnMapBySource: {
    'source-a': { id: 'id', name: 'name', amount: 'amount' },
    'source-b': { id: 'id', name: 'name', amount: 'amount' },
  },
  outputColumns: ['id', 'name', 'amount'],
  outputTypes: { id: 'string', name: 'string', amount: 'number' },
  sourceColumn: 'source',
  dedupeColumns: ['id'],
};
```

Every measured iteration must call explicit GC before baseline heap, run only `processDatasets()` inside the timed section, call GC after the result is released from the timed local scope, then calculate positive retained heap delta. Warm-up is not recorded.

- [ ] **Step 5: Add calibration-mode behavior**

When `enforceBudgets` is `false`, all six cases still execute and write evidence, but timing/heap threshold assertions are skipped. Correctness assertions remain active: result summary must reconcile and processed input count must equal expected generated rows.

When `enforceBudgets` is `true`, null budgets are configuration failures and each case must fail if median or retained heap exceeds budget.

- [ ] **Step 6: Wire package and official gate**

Add:

```json
"test:performance": "vitest run --project performance"
```

Insert after unit tests in `scripts/production-gates.sh`:

```bash
npm run test:performance
```

Add CI artifact upload after verification evidence:

```yaml
      - name: Upload performance evidence
        if: ${{ always() }}
        uses: actions/upload-artifact@v7
        with:
          name: datafixer-performance
          path: benchmark-report.json
```

- [ ] **Step 7: Confirm contract GREEN and performance project PASS in calibration mode**

Run:

```bash
python tests/harness/performance-baseline-contract-check.py
npm run test:performance
python scripts/verify.py local --report verify-report-local.json
```

Expected: all PASS; `benchmark-report.json` exists and contains all six cases.

- [ ] **Step 8: Commit calibration implementation**

```text
feat: add performance benchmark runner
```

---

### Task 4: Calibrate trusted CI budgets and enable enforcement

**Files:**
- Modify: `tests/performance/baseline.json`
- Optionally modify only isolation code if variance analysis proves necessary; do not alter production runtime for calibration.

**Interfaces:**
- Consumes: three `datafixer-performance` artifacts from trusted GitHub Actions runs on the same feature-branch calibration implementation.
- Produces: objective enforced budgets in `baseline.json`.

- [ ] **Step 1: Run trusted calibration three times**

For each run, record every case's `medianMs` and `maxRetainedHeapMiB` from `benchmark-report.json`. All runs must use Node `22.16.0` and GitHub-hosted Ubuntu.

- [ ] **Step 2: Check variance before choosing thresholds**

For each case calculate:

```text
timingVarianceRatio = max(medianMs across runs) / min(medianMs across runs)
```

If any ratio exceeds `1.35`, inspect benchmark isolation and allocation behavior before continuing. Do not derive a required timing budget from a high-variance case until understood.

- [ ] **Step 3: Derive budgets mechanically**

For each stable case:

```text
rawTimingBudget = slowestMedianMs * 1.75
rawHeapBudget = largestRetainedHeapMiB * 1.5
```

Round timing upward to a readable 25/50/100 ms boundary appropriate to the magnitude. Round heap upward to a whole MiB. The committed number must be greater than or equal to the raw formula result.

- [ ] **Step 4: Enable enforcement**

Set:

```json
"enforceBudgets": true
```

and replace every null budget with the derived numbers. Add calibration run IDs and observed extrema to `calibration` metadata.

- [ ] **Step 5: Verify enforcement on fresh CI**

Expected: `npm run test:performance` PASS with active assertions and `datafixer-performance` artifact uploaded.

- [ ] **Step 6: Commit**

```text
test: enforce calibrated performance budgets
```

---

### Task 5: Close TD-005 and run full release verification

**Files:**
- Modify: `docs/TECH_DEBT.md`
- Modify: `docs/release-checklist.md` if it tracks active performance evidence.
- Regenerate: `docs/REPO_MAP.md` if the repository-map generator includes the new files.

**Interfaces:**
- Consumes: enforced benchmark report, production-gate run ID, artifact digest, Vercel status, exact-SHA live-host run.
- Produces: auditable TD-005 closure without claiming TD-007 or TD-008 are resolved.

- [ ] **Step 1: Run repository map generation/check**

```bash
python scripts/generate-repo-map.py
python scripts/generate-repo-map.py --check
```

- [ ] **Step 2: Run complete verification**

```bash
python scripts/verify.py local --report verify-report-local.json
python scripts/verify.py official --report verify-report-official.json
```

CI must show `harness=success` and `production=success`.

- [ ] **Step 3: Review against repository review guides**

Confirm no production runtime source was modified solely to improve the benchmark, no customer data enters the report, no threshold was guessed, and TD-007 remains OPEN.

- [ ] **Step 4: Update technical debt evidence**

Move TD-005 to resolved blockers with exact calibration run IDs, enforced budgets, final performance artifact digest, and official gate run. Keep TD-007 as P1 OPEN and TD-008 as P2 OPEN.

- [ ] **Step 5: Open final implementation PR and verify exact head**

The PR must include the approved spec, this plan, benchmark implementation, calibrated budgets, harness/workflow integration, and evidence docs. Require Vercel Preview success plus full GitHub production gates.

- [ ] **Step 6: Merge only the verified exact head**

After merge, verify the new `main` GitHub production gate, Vercel deployment status, and exact-SHA live-host verification all PASS. Only then mark TD-005 complete.
