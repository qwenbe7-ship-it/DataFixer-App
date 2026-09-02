import { DataFixerError } from '../../src/domain/errors';
import { makeDataset, makeRow } from '../../src/domain/factories';
import type { EngineResult } from '../../src/domain/types';
import { finalizeEvidence } from '../../src/evidence/ledger';
import { reconcile } from '../../src/evidence/reconcile';

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message);
}

function expectReconciliationError(fn: () => unknown, label: string): void {
  try {
    fn();
    throw new Error(`expected reconciliation failure: ${label}`);
  } catch (error) {
    if (!(error instanceof DataFixerError) || error.code !== 'RECONCILIATION_FAILED') throw error;
  }
}

// A row changed before dedupe must end as REMOVED, not CHANGED.
{
  const row = makeRow('a.csv', 2, { id: 'A' });
  const input = makeDataset(['id'], [row], ['a.csv']);
  const result: EngineResult = {
    dataset: makeDataset(['id'], [], ['a.csv']),
    removedRows: [row],
    rejectedRows: [],
    evidence: [
      { rowId: row.rowId, ruleId: 'trim', status: 'CHANGED', reasonKey: 'clean.trimmed', reasonParams: {} },
      { rowId: row.rowId, ruleId: 'dedupe', status: 'REMOVED', reasonKey: 'clean.duplicateRemoved', reasonParams: {} },
    ],
  };
  const finalized = finalizeEvidence(input, result);
  assert(finalized.statusByRowId.get(row.rowId) === 'REMOVED', 'REMOVED outranks CHANGED');
  assert(finalized.summary.removedRows === 1 && finalized.summary.changedRows === 0, 'row counted once at terminal status');
}

// Removed rows require a REMOVED reason, not merely some earlier change reason.
{
  const row = makeRow('a.csv', 2, { id: 'A' });
  const input = makeDataset(['id'], [row], ['a.csv']);
  expectReconciliationError(() => finalizeEvidence(input, {
    dataset: makeDataset(['id'], [], ['a.csv']),
    removedRows: [row],
    rejectedRows: [],
    evidence: [{ rowId: row.rowId, ruleId: 'trim', status: 'CHANGED', reasonKey: 'clean.trimmed', reasonParams: {} }],
  }), 'removed reason missing');
}

// Unknown evidence and duplicate input identities are never accepted.
{
  const row = makeRow('a.csv', 2, { id: 'A' });
  const input = makeDataset(['id'], [row], ['a.csv']);
  expectReconciliationError(() => finalizeEvidence(input, {
    dataset: makeDataset(['id'], [row], ['a.csv']),
    removedRows: [],
    rejectedRows: [],
    evidence: [{ rowId: 'ghost.csv:9', ruleId: 'x', status: 'CHANGED', reasonKey: 'x', reasonParams: {} }],
  }), 'unknown evidence row');
  expectReconciliationError(() => finalizeEvidence(makeDataset(['id'], [row, row], ['a.csv']), {
    dataset: makeDataset(['id'], [row], ['a.csv']),
    removedRows: [],
    rejectedRows: [],
    evidence: [],
  }), 'duplicate input row identity');
}

// Empty jobs reconcile cleanly at the accounting layer.
{
  const empty = reconcile(0, { UNCHANGED: 0, CHANGED: 0, REMOVED: 0, REJECTED: 0 });
  assert(empty.reconciled && empty.inputRows === 0, 'empty accounting reconciles');
}

console.log('PASS evidence-boundary-check');
