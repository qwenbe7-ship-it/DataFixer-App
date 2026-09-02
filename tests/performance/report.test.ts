import { mkdtempSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { createBenchmarkReport, writeBenchmarkReport, type BenchmarkCaseResult } from './report';

const sampleCase: BenchmarkCaseResult = {
  id: 'clean-10k',
  operation: 'clean',
  rows: [10000],
  timingsMs: [10, 11, 12],
  medianMs: 11,
  heapBeforeBytes: [100, 100, 100],
  heapAfterGcBytes: [110, 108, 109],
  retainedHeapDeltaMiB: [0.1, 0.08, 0.09],
  maxRetainedHeapMiB: 0.1,
  maxMedianMs: null,
  maxRetainedHeapBudgetMiB: null,
  status: 'PASS',
};

describe('benchmark report', () => {
  it('contains the required machine-readable fields', () => {
    const report = createBenchmarkReport('1.0.0', false, [sampleCase]);
    expect(report).toMatchObject({
      schemaVersion: 1,
      node: process.version,
      manifestVersion: '1.0.0',
      enforceBudgets: false,
      cases: [{ id: 'clean-10k', medianMs: 11, maxRetainedHeapMiB: 0.1, status: 'PASS' }],
    });
    expect(report.platform).toContain(process.platform);
  });

  it('writes formatted JSON evidence', () => {
    const dir = mkdtempSync(join(tmpdir(), 'datafixer-performance-'));
    const path = join(dir, 'benchmark-report.json');
    writeBenchmarkReport(createBenchmarkReport('1.0.0', false, [sampleCase]), path);
    const parsed = JSON.parse(readFileSync(path, 'utf8')) as { schemaVersion: number; cases: unknown[] };
    expect(parsed.schemaVersion).toBe(1);
    expect(parsed.cases).toHaveLength(1);
  });
});
