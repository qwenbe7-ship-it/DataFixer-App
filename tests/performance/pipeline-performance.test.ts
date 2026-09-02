import { performance } from 'node:perf_hooks';
import { describe, expect, it } from 'vitest';
import { processDatasets, type ProcessDatasetsRequest } from '../../src/app/process-job';
import type { CleanRule, MergeSettings, ProcessingResult, ValidationRule } from '../../src/domain/types';
import baselineJson from './baseline.json';
import { generateCleanDataset, generateMergeDatasets, generateValidateDataset } from './fixtures';
import {
  createBenchmarkReport,
  writeBenchmarkReport,
  type BenchmarkCaseDefinition,
  type BenchmarkCaseResult,
} from './report';

interface BenchmarkManifest {
  schemaVersion: 1;
  manifestVersion: string;
  enforceBudgets: boolean;
  calibration: { node: string; platform: string; runIds: number[] };
  cases: BenchmarkCaseDefinition[];
}

const manifest = baselineJson as BenchmarkManifest;
const MIB = 1024 * 1024;

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

const mergeSettings: MergeSettings = {
  columnMapBySource: {
    'source-a': { id: 'id', name: 'name', amount: 'amount' },
    'source-b': { id: 'id', name: 'name', amount: 'amount' },
  },
  outputColumns: ['id', 'name', 'amount'],
  outputTypes: { id: 'string', name: 'string', amount: 'number' },
  dedupeColumns: ['id'],
};

function gcOrThrow(): () => void {
  const gc = (globalThis as typeof globalThis & { gc?: () => void }).gc;
  if (!gc) throw new Error('Performance project requires Node --expose-gc');
  return gc;
}

function buildRequest(caseDef: BenchmarkCaseDefinition): ProcessDatasetsRequest {
  if (caseDef.operation === 'clean') {
    return {
      mode: 'clean',
      datasets: [generateCleanDataset(caseDef.rows[0], caseDef.seed)],
      rules: cleanRules,
      mergeSettings: null,
      lookupSettings: null,
      sourceHash: `benchmark-${caseDef.id}`,
    };
  }
  if (caseDef.operation === 'validate') {
    return {
      mode: 'validate',
      datasets: [generateValidateDataset(caseDef.rows[0], caseDef.seed)],
      rules: validationRules,
      mergeSettings: null,
      lookupSettings: null,
      sourceHash: `benchmark-${caseDef.id}`,
    };
  }
  return {
    mode: 'merge',
    datasets: generateMergeDatasets(caseDef.rows[0], caseDef.seed),
    rules: [],
    mergeSettings,
    lookupSettings: null,
    sourceHash: `benchmark-${caseDef.id}`,
  };
}

function assertCorrectness(result: ProcessingResult, expectedRows: number): void {
  expect(result.summary.reconciled).toBe(true);
  expect(result.summary.inputRows).toBe(expectedRows);
  expect(
    result.summary.unchangedRows
      + result.summary.changedRows
      + result.summary.removedRows
      + result.summary.rejectedRows,
  ).toBe(expectedRows);
}

async function warmUp(caseDef: BenchmarkCaseDefinition): Promise<void> {
  const request = buildRequest(caseDef);
  const result = await processDatasets(request);
  assertCorrectness(result, caseDef.rows.reduce((sum, value) => sum + value, 0));
}

async function measuredIteration(caseDef: BenchmarkCaseDefinition): Promise<{
  elapsedMs: number;
  heapBeforeBytes: number;
  heapAfterGcBytes: number;
  retainedHeapMiB: number;
}> {
  const gc = gcOrThrow();
  const request = buildRequest(caseDef);
  gc();
  const heapBeforeBytes = process.memoryUsage().heapUsed;
  const started = performance.now();
  let elapsedMs: number;
  {
    const result = await processDatasets(request);
    elapsedMs = performance.now() - started;
    assertCorrectness(result, caseDef.rows.reduce((sum, value) => sum + value, 0));
  }
  gc();
  const heapAfterGcBytes = process.memoryUsage().heapUsed;
  const retainedHeapMiB = Math.max(0, heapAfterGcBytes - heapBeforeBytes) / MIB;
  return { elapsedMs, heapBeforeBytes, heapAfterGcBytes, retainedHeapMiB };
}

function median(values: number[]): number {
  const sorted = [...values].sort((a, b) => a - b);
  return sorted[Math.floor(sorted.length / 2)];
}

async function measureCase(caseDef: BenchmarkCaseDefinition): Promise<BenchmarkCaseResult> {
  await warmUp(caseDef);
  const measurements = [];
  for (let iteration = 0; iteration < 3; iteration += 1) {
    measurements.push(await measuredIteration(caseDef));
  }
  const timingsMs = measurements.map((item) => item.elapsedMs);
  const heapBeforeBytes = measurements.map((item) => item.heapBeforeBytes);
  const heapAfterGcBytes = measurements.map((item) => item.heapAfterGcBytes);
  const retainedHeapDeltaMiB = measurements.map((item) => item.retainedHeapMiB);
  const medianMs = median(timingsMs);
  const maxRetainedHeapMiB = Math.max(...retainedHeapDeltaMiB);
  const timingPass = !manifest.enforceBudgets || (caseDef.maxMedianMs !== null && medianMs <= caseDef.maxMedianMs);
  const heapPass = !manifest.enforceBudgets
    || (caseDef.maxRetainedHeapMiB !== null && maxRetainedHeapMiB <= caseDef.maxRetainedHeapMiB);
  return {
    id: caseDef.id,
    operation: caseDef.operation,
    rows: [...caseDef.rows],
    timingsMs,
    medianMs,
    heapBeforeBytes,
    heapAfterGcBytes,
    retainedHeapDeltaMiB,
    maxRetainedHeapMiB,
    maxMedianMs: caseDef.maxMedianMs,
    maxRetainedHeapBudgetMiB: caseDef.maxRetainedHeapMiB,
    status: timingPass && heapPass ? 'PASS' : 'FAIL',
  };
}

describe('production pipeline performance baseline', () => {
  it('measures every versioned case and enforces calibrated budgets when enabled', async () => {
    expect(manifest.schemaVersion).toBe(1);
    expect(manifest.cases).toHaveLength(6);
    gcOrThrow();

    const results: BenchmarkCaseResult[] = [];
    for (const caseDef of manifest.cases) results.push(await measureCase(caseDef));

    writeBenchmarkReport(createBenchmarkReport(manifest.manifestVersion, manifest.enforceBudgets, results));

    if (manifest.enforceBudgets) {
      for (const caseDef of manifest.cases) {
        expect(caseDef.maxMedianMs, `${caseDef.id} missing timing budget`).not.toBeNull();
        expect(caseDef.maxRetainedHeapMiB, `${caseDef.id} missing retained-heap budget`).not.toBeNull();
      }
    }
    expect(results.filter((result) => result.status === 'FAIL')).toEqual([]);
  }, 120_000);
});
