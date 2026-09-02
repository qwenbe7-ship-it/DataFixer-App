import { describe, expect, it } from 'vitest';
import { normalizeSheet } from '../../src/file-io/normalize-sheet';

describe('normalizeSheet', () => {
  it('creates deterministic rows starting at source row two', () => {
    const dataset = normalizeSheet('people.csv', [
      ['name', 'age'],
      ['Alice', 30],
      ['Bob', null],
    ]);
    expect(dataset.columns).toEqual(['name', 'age']);
    expect(dataset.rows.map((row) => row.rowId)).toEqual(['people.csv:2', 'people.csv:3']);
    expect(dataset.rows[0].values).toEqual({ name: 'Alice', age: 30 });
  });

  it('skips fully blank source rows while preserving later source row numbers', () => {
    const dataset = normalizeSheet('people.csv', [
      ['name'],
      ['Alice'],
      [''],
      ['Carol'],
    ]);
    expect(dataset.rows.map((row) => row.rowId)).toEqual(['people.csv:2', 'people.csv:4']);
  });

  it('rejects blank headers', () => {
    expect(() => normalizeSheet('bad.csv', [['', 'age'], ['Alice', 30]])).toThrowError('PARSE_FAILED');
  });

  it('rejects duplicate headers', () => {
    expect(() => normalizeSheet('bad.csv', [['name', 'name'], ['Alice', 'A']])).toThrowError('PARSE_FAILED');
  });

  it('rejects rows containing data beyond the header width', () => {
    expect(() => normalizeSheet('bad.csv', [['name'], ['Alice', 'extra']])).toThrowError('PARSE_FAILED');
  });

  it('rejects unsupported cell types', () => {
    expect(() => normalizeSheet('bad.csv', [['name'], [{ nested: true }]])).toThrowError('PARSE_FAILED');
  });
});
