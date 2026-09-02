import { describe, expect, it } from 'vitest';
import { DataFixerError } from '../../src/domain/errors';
import { makeDataset, makeRow } from '../../src/domain/factories';
import { applyRules } from '../../src/rules/engine';

describe('applyRules', () => {
  it('runs rules in declared order without mutating input', () => {
    const input = makeDataset(['email'], [makeRow('a.csv', 2, { email: ' A@EXAMPLE.COM ' })], ['a.csv']);
    const result = applyRules(input, [
      { id: 'trim', kind: 'trim', column: 'email' },
      { id: 'lower', kind: 'changeCase', column: 'email', mode: 'lower' },
    ]);
    expect(result.dataset.rows[0].values.email).toBe('a@example.com');
    expect(result.evidence.map((entry) => entry.ruleId)).toEqual(['trim', 'lower']);
    expect(input.rows[0].values.email).toBe(' A@EXAMPLE.COM ');
  });

  it('keeps the first selected-column duplicate and removes later rows deterministically', () => {
    const input = makeDataset(['email'], [
      makeRow('a.csv', 2, { email: 'a@example.com' }),
      makeRow('a.csv', 3, { email: 'a@example.com' }),
      makeRow('a.csv', 4, { email: 'b@example.com' }),
    ], ['a.csv']);
    const result = applyRules(input, [{ id: 'dedupe', kind: 'dedupe', columns: ['email'] }]);
    expect(result.dataset.rows.map((row) => row.rowId)).toEqual(['a.csv:2', 'a.csv:4']);
    expect(result.removedRows.map((row) => row.rowId)).toEqual(['a.csv:3']);
    expect(result.evidence).toEqual([expect.objectContaining({ rowId: 'a.csv:3', status: 'REMOVED', ruleId: 'dedupe' })]);
  });

  it('uses the complete current row when dedupe columns are empty', () => {
    const input = makeDataset(['id', 'amount'], [
      makeRow('a.csv', 2, { id: 'A', amount: 100 }),
      makeRow('a.csv', 3, { id: 'A', amount: 100 }),
      makeRow('a.csv', 4, { id: 'A', amount: 200 }),
    ], ['a.csv']);
    const result = applyRules(input, [{ id: 'dedupe', kind: 'dedupe', columns: [] }]);
    expect(result.dataset.rows.map((row) => row.rowId)).toEqual(['a.csv:2', 'a.csv:4']);
    expect(result.removedRows.map((row) => row.rowId)).toEqual(['a.csv:3']);
  });

  it('preflights missing columns and rename collisions before processing any row', () => {
    const input = makeDataset(['email', 'name'], [makeRow('a.csv', 2, { email: ' A ', name: 'Alice' })], ['a.csv']);
    expect(() => applyRules(input, [
      { id: 'trim', kind: 'trim', column: 'email' },
      { id: 'bad', kind: 'trim', column: 'missing' },
    ])).toThrowError(DataFixerError);
    expect(() => applyRules(input, [
      { id: 'collision', kind: 'renameColumn', from: 'email', to: 'name' },
    ])).toThrowError('INVALID_RULE');
    expect(input.rows[0].values.email).toBe(' A ');
  });

  it('excludes rejected rows from output and keeps them exactly once', () => {
    const input = makeDataset(['amount'], [
      makeRow('a.csv', 2, { amount: '12abc' }),
      makeRow('a.csv', 3, { amount: '1,200' }),
    ], ['a.csv']);
    const result = applyRules(input, [{ id: 'number', kind: 'parseNumber', column: 'amount', removeThousandsSeparator: true }]);
    expect(result.dataset.rows.map((row) => row.rowId)).toEqual(['a.csv:3']);
    expect(result.rejectedRows.map((row) => row.rowId)).toEqual(['a.csv:2']);
  });

  it('updates schema in rule order for rename and keep rules', () => {
    const input = makeDataset(['old_name', 'age'], [makeRow('a.csv', 2, { old_name: ' Alice ', age: 30 })], ['a.csv']);
    const result = applyRules(input, [
      { id: 'rename', kind: 'renameColumn', from: 'old_name', to: 'name' },
      { id: 'trim', kind: 'trim', column: 'name' },
      { id: 'keep', kind: 'keepColumns', columns: ['name'] },
    ]);
    expect(result.dataset.columns).toEqual(['name']);
    expect(result.dataset.rows[0].values).toEqual({ name: 'Alice' });
  });
});
