import { describe, expect, it } from 'vitest';
import { reconcile } from '../../src/evidence/reconcile';

describe('reconcile', () => {
  it('accepts an exact partition of input rows', () => {
    expect(reconcile(10, { UNCHANGED: 3, CHANGED: 4, REMOVED: 2, REJECTED: 1 }))
      .toEqual({ inputRows: 10, unchangedRows: 3, changedRows: 4, removedRows: 2, rejectedRows: 1, reconciled: true });
  });

  it('marks a mismatched partition as unreconciled', () => {
    expect(reconcile(10, { UNCHANGED: 3, CHANGED: 4, REMOVED: 2, REJECTED: 0 }).reconciled).toBe(false);
  });
});
