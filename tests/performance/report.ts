import { writeFileSync } from 'node:fs';
import { resolve } from 'node:path';

export interface BenchmarkCaseDefinition {
  id: string;
  operation: 'clean' | 'merge' | 'validate';
  rows: number[];
  seed: number;
  maxMedianMs: number | null;
  maxRetainedHeapMiB: number | null;
}

export interface BenchmarkCaseResult {
  id: string;
  operation: BenchmarkCaseDefinition['operation'];
  rows: number[];
  timingsMs: number[];
  medianMs: number;
  heapBeforeBytes: number[];
  heapAfterGcBytes: number[];
  retainedHeapDeltaMiB: number[];
  maxRetainedHeapMiB: number;
  maxMedianMs: number | null;
  maxRetainedHeapBudgetMiB: number | null;
  status: 'PASS' | 'FAIL';
}

export interface BenchmarkReport {
  schemaVersion: 1;
  commitSha: string | null;
  node: string;
  platform: string;
  manifestVersion: string;
  enforceBudgets: boolean;
  cases: BenchmarkCaseResult[];
}

export function createBenchmarkReport(
  manifestVersion: string,
  enforceBudgets: boolean,
  cases: BenchmarkCaseResult[],
): BenchmarkReport {
  return {
    schemaVersion: 1,
    commitSha: process.env.GITHUB_SHA ?? null,
    node: process.version,
    platform: `${process.platform}-${process.arch}`,
    manifestVersion,
    enforceBudgets,
    cases,
  };
}

export function writeBenchmarkReport(report: BenchmarkReport, path = 'benchmark-report.json'): void {
  writeFileSync(resolve(process.cwd(), path), `${JSON.stringify(report, null, 2)}\n`, 'utf8');
}
