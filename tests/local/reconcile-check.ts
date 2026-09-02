import { reconcile } from '../../src/evidence/reconcile';

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message);
}

const exact = reconcile(10, { UNCHANGED: 3, CHANGED: 4, REMOVED: 2, REJECTED: 1 });
assert(exact.inputRows === 10, 'input row count preserved');
assert(exact.unchangedRows === 3, 'unchanged count');
assert(exact.changedRows === 4, 'changed count');
assert(exact.removedRows === 2, 'removed count');
assert(exact.rejectedRows === 1, 'rejected count');
assert(exact.reconciled === true, 'exact partition reconciles');

const mismatch = reconcile(10, { UNCHANGED: 3, CHANGED: 4, REMOVED: 2, REJECTED: 0 });
assert(mismatch.reconciled === false, 'mismatched partition does not reconcile');

console.log('PASS reconcile-check');
