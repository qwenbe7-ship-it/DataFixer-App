import { describe, expect, it } from 'vitest';
import { DataFixerError } from '../../src/domain/errors';
import { makeDataset, makeRow } from '../../src/domain/factories';
import { validateDataset } from '../../src/rules/validate';

describe('validateDataset', () => {
  it('rejects a row once while retaining every failed rule reason', () => {
    const input = makeDataset(['email'], [makeRow('contacts.csv', 2, { email: '' })], ['contacts.csv']);
    const result = validateDataset(input, [
      { id: 'required-email', kind: 'required', column: 'email' },
      { id: 'email-shape', kind: 'regex', column: 'email', pattern: '^[^@]+@[^@]+$' },
    ]);
    expect(result.rejectedRows).toHaveLength(1);
    expect(result.evidence.map((entry) => entry.ruleId)).toEqual(['required-email', 'email-shape']);
    expect(result.evidence.every((entry) => entry.status === 'REJECTED')).toBe(true);
  });

  it('applies strict type validation including real calendar dates', () => {
    const input = makeDataset(
      ['text', 'integer', 'number', 'date'],
      [
        makeRow('types.csv', 2, { text: 'ok', integer: 3, number: 3.5, date: '2024-02-29' }),
        makeRow('types.csv', 3, { text: 3, integer: 3.5, number: '3.5', date: '2026-02-29' }),
      ],
      ['types.csv'],
    );
    const result = validateDataset(input, [
      { id: 's', kind: 'type', column: 'text', expected: 'string' },
      { id: 'i', kind: 'type', column: 'integer', expected: 'integer' },
      { id: 'n', kind: 'type', column: 'number', expected: 'number' },
      { id: 'd', kind: 'type', column: 'date', expected: 'date' },
    ]);
    expect(result.dataset.rows.map((row) => row.rowId)).toEqual(['types.csv:2']);
    const failures = result.evidence.filter((entry) => entry.rowId === 'types.csv:3');
    expect(failures).toHaveLength(3);
    expect(failures.some((entry) => entry.ruleId === 'n')).toBe(false);
  });

  it('marks every member of a duplicated composite key', () => {
    const input = makeDataset(
      ['id', 'region'],
      [
        makeRow('u.csv', 2, { id: 'A', region: 'KR' }),
        makeRow('u.csv', 3, { id: 'A', region: 'KR' }),
        makeRow('u.csv', 4, { id: 'B', region: 'KR' }),
      ],
      ['u.csv'],
    );
    const result = validateDataset(input, [{ id: 'u', kind: 'unique', columns: ['id', 'region'] }]);
    expect(result.rejectedRows.map((row) => row.rowId)).toEqual(['u.csv:2', 'u.csv:3']);
    expect(result.evidence[0]?.reasonParams.values).toBe('["A","KR"]');
  });

  it('checks allowed values', () => {
    const input = makeDataset(['status'], [makeRow('a.csv', 2, { status: 'BAD' })], ['a.csv']);
    expect(validateDataset(input, [{ id: 'a', kind: 'allowed', column: 'status', values: ['OPEN'] }]).rejectedRows).toHaveLength(1);
  });

  it('uses inclusive numeric ranges', () => {
    const input = makeDataset(
      ['amount'],
      [makeRow('n.csv', 2, { amount: 10 }), makeRow('n.csv', 3, { amount: 20 }), makeRow('n.csv', 4, { amount: 21 })],
      ['n.csv'],
    );
    const result = validateDataset(input, [{ id: 'r', kind: 'numberRange', column: 'amount', min: 10, max: 20 }]);
    expect(result.dataset.rows).toHaveLength(2);
    expect(result.rejectedRows.map((row) => row.rowId)).toEqual(['n.csv:4']);
  });

  it('accepts real Excel date serials when the rule explicitly expects a date', () => {
    const input = makeDataset(
      ['date'],
      [makeRow('dates.xlsx', 2, { date: 46266 }), makeRow('dates.xlsx', 3, { date: 60 })],
      ['dates.xlsx'],
    );
    const result = validateDataset(input, [{ id: 'd', kind: 'type', column: 'date', expected: 'date' }]);
    expect(result.dataset.rows.map((row) => row.rowId)).toEqual(['dates.xlsx:2']);
    expect(result.rejectedRows.map((row) => row.rowId)).toEqual(['dates.xlsx:3']);
  });

  it('counts string length in Unicode code points', () => {
    const input = makeDataset(['value'], [makeRow('l.csv', 2, { value: '😀😀' })], ['l.csv']);
    expect(validateDataset(input, [{ id: 'l', kind: 'length', column: 'value', min: 2, max: 2 }]).dataset.rows).toHaveLength(1);
  });

  it('checks regular expressions', () => {
    const input = makeDataset(['sku'], [makeRow('r.csv', 2, { sku: 'bad' })], ['r.csv']);
    expect(validateDataset(input, [{ id: 'r', kind: 'regex', column: 'sku', pattern: '^[A-Z]{2}-\\d{3}$' }]).rejectedRows).toHaveLength(1);
  });

  it('compares columns without type coercion', () => {
    const input = makeDataset(
      ['min', 'max'],
      [makeRow('c.csv', 2, { min: 10, max: 10 }), makeRow('c.csv', 3, { min: '9', max: 10 })],
      ['c.csv'],
    );
    const result = validateDataset(input, [{ id: 'c', kind: 'columnCompare', left: 'min', operator: 'lte', right: 'max' }]);
    expect(result.dataset.rows.map((row) => row.rowId)).toEqual(['c.csv:2']);
    expect(result.rejectedRows.map((row) => row.rowId)).toEqual(['c.csv:3']);
  });

  it('rejects invalid regex and missing columns before processing', () => {
    const input = makeDataset(['email'], [makeRow('p.csv', 2, { email: 'a@example.com' })], ['p.csv']);
    expect(() => validateDataset(input, [{ id: 'bad', kind: 'regex', column: 'email', pattern: '[' }]))
      .toThrowError(DataFixerError);
    expect(() => validateDataset(input, [{ id: 'missing', kind: 'required', column: 'missing' }]))
      .toThrowError('MISSING_COLUMN');
  });

  it('rejects duplicate rule IDs because evidence IDs must be unambiguous', () => {
    const input = makeDataset(['email'], [makeRow('p.csv', 2, { email: '' })], ['p.csv']);
    expect(() => validateDataset(input, [
      { id: 'same', kind: 'required', column: 'email' },
      { id: 'same', kind: 'regex', column: 'email', pattern: '.+' },
    ])).toThrowError('INVALID_RULE');
  });
});
