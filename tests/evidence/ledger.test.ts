import { describe, expect, it } from 'vitest';
import { makeDataset, makeRow } from '../../src/domain/factories';
import type { EngineResult, EvidenceEntry } from '../../src/domain/types';
import { finalizeEvidence } from '../../src/evidence/ledger';

function fixture() {
  const a = makeRow('orders.csv', 2, { id: 'A' });
  const b = makeRow('orders.csv', 3, { id: 'B' });
  const c = makeRow('orders.csv', 4, { id: 'C' });
  const input = makeDataset(['id'], [a, b, c], ['orders.csv']);
  const evidence: EvidenceEntry[] = [
    { rowId: c.rowId, ruleId: 'reject', status: 'REJECTED', reasonKey: 'validate.required', reasonParams: {} },
    { rowId: a.rowId, ruleId: 'change-1', status: 'CHANGED', reasonKey: 'clean.trimmed', reasonParams: {} },
    { rowId: a.rowId, ruleId: 'change-2', status: 'CHANGED', reasonKey: 'clean.caseChanged', reasonParams: {} },
  ];
  const result: EngineResult = {
    dataset: makeDataset(['id'], [a, b], ['orders.csv']),
    removedRows: [],
    rejectedRows: [c],
    evidence,
  };
  return { a, b, c, input, evidence, result };
}

describe('finalizeEvidence', () => {
  it('counts each row once using final status precedence and keeps unchanged synthetic state out of evidence', () => {
    const { a, b, c, input, result } = fixture();
    const finalized = finalizeEvidence(input, result);
    expect(finalized.summary).toEqual({
      inputRows: 3, unchangedRows: 1, changedRows: 1, removedRows: 0, rejectedRows: 1, reconciled: true,
    });
    expect(finalized.statusByRowId.get(a.rowId)).toBe('CHANGED');
    expect(finalized.statusByRowId.get(b.rowId)).toBe('UNCHANGED');
    expect(finalized.statusByRowId.get(c.rowId)).toBe('REJECTED');
    expect(finalized.evidence).toHaveLength(3);
  });

  it('requires every removed or rejected row to have a matching reason', () => {
    const { c, input, result } = fixture();
    expect(() => finalizeEvidence(input, {
      ...result,
      evidence: result.evidence.filter((entry) => entry.rowId !== c.rowId),
    })).toThrowError('RECONCILIATION_FAILED');
  });

  it('rejects rows that appear in more than one output partition or disappear entirely', () => {
    const { a, b, c, input, result } = fixture();
    expect(() => finalizeEvidence(input, {
      ...result,
      dataset: makeDataset(['id'], [a, b, c], ['orders.csv']),
    })).toThrowError('RECONCILIATION_FAILED');
    expect(() => finalizeEvidence(input, {
      ...result,
      dataset: makeDataset(['id'], [a], ['orders.csv']),
    })).toThrowError('RECONCILIATION_FAILED');
  });
});
