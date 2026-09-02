import { DataFixerError } from '../domain/errors';
import type {
  DataRow,
  Dataset,
  EngineResult,
  EvidenceEntry,
  ProcessingSummary,
  RowStatus,
} from '../domain/types';
import { reconcile } from './reconcile';

export interface FinalizedEvidence {
  evidence: EvidenceEntry[];
  statusByRowId: Map<string, RowStatus>;
  summary: ProcessingSummary;
}

const STATUS_PRIORITY: Record<RowStatus, number> = {
  UNCHANGED: 0,
  CHANGED: 1,
  REMOVED: 2,
  REJECTED: 3,
};

function fail(rowId: string, issue: string): never {
  throw new DataFixerError('RECONCILIATION_FAILED', { rowId, issue });
}

function assertUniqueInputRows(input: Dataset): Map<string, number> {
  const order = new Map<string, number>();
  input.rows.forEach((row, index) => {
    if (order.has(row.rowId)) fail(row.rowId, 'duplicate-input-row-id');
    order.set(row.rowId, index);
  });
  return order;
}

function collectPartition(
  rows: DataRow[],
  name: 'output' | 'removed' | 'rejected',
  inputOrder: Map<string, number>,
): Set<string> {
  const ids = new Set<string>();
  for (const row of rows) {
    if (!inputOrder.has(row.rowId)) fail(row.rowId, `unknown-${name}-row`);
    if (ids.has(row.rowId)) fail(row.rowId, `duplicate-${name}-row`);
    ids.add(row.rowId);
  }
  return ids;
}

function highestStatus(current: RowStatus, candidate: RowStatus): RowStatus {
  return STATUS_PRIORITY[candidate] > STATUS_PRIORITY[current] ? candidate : current;
}

export function finalizeEvidence(input: Dataset, engineResult: EngineResult): FinalizedEvidence {
  const inputOrder = assertUniqueInputRows(input);
  const outputIds = collectPartition(engineResult.dataset.rows, 'output', inputOrder);
  const removedIds = collectPartition(engineResult.removedRows, 'removed', inputOrder);
  const rejectedIds = collectPartition(engineResult.rejectedRows, 'rejected', inputOrder);

  for (const row of input.rows) {
    const memberships = Number(outputIds.has(row.rowId))
      + Number(removedIds.has(row.rowId))
      + Number(rejectedIds.has(row.rowId));
    if (memberships !== 1) fail(row.rowId, memberships === 0 ? 'row-missing-from-partitions' : 'row-in-multiple-partitions');
  }

  const indexedEvidence = engineResult.evidence.map((entry, index) => ({ entry, index }));
  const evidenceByRow = new Map<string, EvidenceEntry[]>();
  for (const { entry } of indexedEvidence) {
    if (!inputOrder.has(entry.rowId)) fail(entry.rowId, 'evidence-for-unknown-row');
    if (!entry.ruleId.trim() || !entry.reasonKey.trim()) fail(entry.rowId, 'evidence-missing-reason');
    const entries = evidenceByRow.get(entry.rowId) ?? [];
    entries.push(entry);
    evidenceByRow.set(entry.rowId, entries);
  }

  const statusByRowId = new Map<string, RowStatus>();
  for (const row of input.rows) {
    let status: RowStatus = 'UNCHANGED';
    for (const entry of evidenceByRow.get(row.rowId) ?? []) {
      status = highestStatus(status, entry.status);
    }

    if (rejectedIds.has(row.rowId)) {
      const hasReason = (evidenceByRow.get(row.rowId) ?? []).some((entry) => entry.status === 'REJECTED');
      if (!hasReason) fail(row.rowId, 'rejected-row-missing-reason');
      status = highestStatus(status, 'REJECTED');
    } else if (removedIds.has(row.rowId)) {
      const hasReason = (evidenceByRow.get(row.rowId) ?? []).some((entry) => entry.status === 'REMOVED');
      if (!hasReason) fail(row.rowId, 'removed-row-missing-reason');
      status = highestStatus(status, 'REMOVED');
    }

    if (outputIds.has(row.rowId) && (status === 'REMOVED' || status === 'REJECTED')) {
      fail(row.rowId, 'output-row-has-terminal-evidence');
    }
    if (removedIds.has(row.rowId) && status !== 'REMOVED') {
      fail(row.rowId, 'removed-partition-status-mismatch');
    }
    if (rejectedIds.has(row.rowId) && status !== 'REJECTED') {
      fail(row.rowId, 'rejected-partition-status-mismatch');
    }

    statusByRowId.set(row.rowId, status);
  }

  const counts: Record<RowStatus, number> = { UNCHANGED: 0, CHANGED: 0, REMOVED: 0, REJECTED: 0 };
  for (const status of statusByRowId.values()) counts[status] += 1;
  const summary = reconcile(input.rows.length, counts);
  if (!summary.reconciled) fail('', 'row-count-mismatch');

  const evidence = indexedEvidence
    .sort((a, b) => (inputOrder.get(a.entry.rowId) ?? 0) - (inputOrder.get(b.entry.rowId) ?? 0) || a.index - b.index)
    .map(({ entry }) => entry);

  return { evidence, statusByRowId, summary };
}
