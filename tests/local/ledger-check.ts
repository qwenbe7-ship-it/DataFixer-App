import { DataFixerError } from '../../src/domain/errors';
import { makeDataset, makeRow } from '../../src/domain/factories';
import type { EngineResult, EvidenceEntry } from '../../src/domain/types';
import { finalizeEvidence } from '../../src/evidence/ledger';

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message);
}

function expectReconciliationError(fn: () => unknown): void {
  try {
    fn();
    throw new Error('expected RECONCILIATION_FAILED');
  } catch (error) {
    if (!(error instanceof DataFixerError) || error.code !== 'RECONCILIATION_FAILED') throw error;
  }
}

const a = makeRow('orders.csv', 2, { id: 'A', amount: 10 });
const b = makeRow('orders.csv', 3, { id: 'B', amount: 20 });
const c = makeRow('orders.csv', 4, { id: 'C', amount: null });
const input = makeDataset(['id', 'amount'], [a, b, c], ['orders.csv']);

const evidence: EvidenceEntry[] = [
  { rowId: c.rowId, ruleId: 'required', status: 'REJECTED', column: 'amount', before: null, reasonKey: 'validate.required', reasonParams: {} },
  { rowId: a.rowId, ruleId: 'trim-1', status: 'CHANGED', column: 'id', before: ' A ', after: 'A', reasonKey: 'clean.trimmed', reasonParams: {} },
  { rowId: a.rowId, ruleId: 'case-1', status: 'CHANGED', column: 'id', before: 'a', after: 'A', reasonKey: 'clean.caseChanged', reasonParams: {} },
];

const engineResult: EngineResult = {
  dataset: makeDataset(['id', 'amount'], [a, b], ['orders.csv']),
  removedRows: [],
  rejectedRows: [c],
  evidence,
};

const finalized = finalizeEvidence(input, engineResult);
assert(finalized.summary.inputRows === 3, 'input count');
assert(finalized.summary.changedRows === 1, 'multiple change evidence counts one row');
assert(finalized.summary.unchangedRows === 1, 'one unchanged row');
assert(finalized.summary.rejectedRows === 1, 'one rejected row');
assert(finalized.summary.removedRows === 0, 'no removed rows');
assert(finalized.summary.reconciled, 'partition reconciles');
assert(finalized.statusByRowId.get(a.rowId) === 'CHANGED', 'changed status');
assert(finalized.statusByRowId.get(b.rowId) === 'UNCHANGED', 'synthetic unchanged status');
assert(finalized.statusByRowId.get(c.rowId) === 'REJECTED', 'rejected precedence');
assert(finalized.evidence.length === 3, 'unchanged status is not added to downloadable evidence');
assert(finalized.evidence.map((entry) => entry.rowId).join(',') === `${a.rowId},${a.rowId},${c.rowId}`, 'evidence ordered by input row');

expectReconciliationError(() => finalizeEvidence(input, {
  ...engineResult,
  evidence: evidence.filter((entry) => entry.rowId !== c.rowId),
}));

expectReconciliationError(() => finalizeEvidence(input, {
  ...engineResult,
  dataset: makeDataset(['id', 'amount'], [a, b, c], ['orders.csv']),
}));

expectReconciliationError(() => finalizeEvidence(input, {
  ...engineResult,
  dataset: makeDataset(['id', 'amount'], [a], ['orders.csv']),
}));

console.log('PASS ledger-check');
