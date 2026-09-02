import { describe, expect, it } from 'vitest';
import { makeRow } from '../../src/domain/factories';
import { applyCleanRule } from '../../src/rules/clean';

describe('applyCleanRule', () => {
  it('trims a string and records before, after, and reason', () => {
    const row = makeRow('people.csv', 2, { name: '  Alice  ' });
    const result = applyCleanRule(row, { id: 'trim-name', kind: 'trim', column: 'name' });
    expect(result.row.values.name).toBe('Alice');
    expect(result.evidence).toEqual([expect.objectContaining({
      rowId: 'people.csv:2', ruleId: 'trim-name', status: 'CHANGED',
      column: 'name', before: '  Alice  ', after: 'Alice', reasonKey: 'clean.trimmed',
    })]);
  });

  it('does not emit evidence when a trim changes nothing', () => {
    const row = makeRow('people.csv', 2, { name: 'Alice' });
    expect(applyCleanRule(row, { id: 'trim-name', kind: 'trim', column: 'name' }).evidence).toEqual([]);
  });

  it('normalizes spaces, empty values, case, replacement, and selected columns', () => {
    let row = makeRow('people.csv', 2, { name: 'ALICE   KIM', note: 'N/A', sku: 'OLD-1', secret: 'x' });
    row = applyCleanRule(row, { id: 'spaces', kind: 'collapseSpaces', column: 'name' }).row;
    row = applyCleanRule(row, { id: 'case', kind: 'changeCase', column: 'name', mode: 'title' }).row;
    row = applyCleanRule(row, { id: 'empty', kind: 'normalizeEmpty', column: 'note', emptyValues: ['N/A'] }).row;
    row = applyCleanRule(row, { id: 'replace', kind: 'replace', column: 'sku', search: 'OLD', replacement: 'NEW' }).row;
    row = applyCleanRule(row, { id: 'keep', kind: 'keepColumns', columns: ['name', 'note', 'sku'] }).row;
    expect(row.values).toEqual({ name: 'Alice Kim', note: null, sku: 'NEW-1' });
  });

  it('parses strict numbers and rejects partial or malformed values', () => {
    expect(applyCleanRule(makeRow('a.csv', 2, { amount: '1,234.50' }), {
      id: 'number', kind: 'parseNumber', column: 'amount', removeThousandsSeparator: true,
    }).row.values.amount).toBe(1234.5);

    for (const amount of ['12abc', '1,2,3']) {
      const result = applyCleanRule(makeRow('a.csv', 3, { amount }), {
        id: 'number', kind: 'parseNumber', column: 'amount', removeThousandsSeparator: true,
      });
      expect(result.reject).toBe(true);
      expect(result.row.values.amount).toBe(amount);
      expect(result.evidence[0]).toMatchObject({ status: 'REJECTED', reasonKey: 'clean.invalidNumber' });
    }
  });

  it('normalizes unambiguous dates and Excel serial dates while rejecting impossible dates', () => {
    expect(applyCleanRule(makeRow('a.csv', 2, { date: '2026/9/1' }), {
      id: 'date', kind: 'parseDate', column: 'date', output: 'YYYY-MM-DD',
    }).row.values.date).toBe('2026-09-01');

    expect(applyCleanRule(makeRow('a.csv', 3, { date: 46266 }), {
      id: 'date', kind: 'parseDate', column: 'date', output: 'YYYY-MM-DD',
    }).row.values.date).toBe('2026-09-01');

    const invalid = applyCleanRule(makeRow('a.csv', 4, { date: '2026-02-30' }), {
      id: 'date', kind: 'parseDate', column: 'date', output: 'YYYY-MM-DD',
    });
    expect(invalid.reject).toBe(true);
    expect(invalid.evidence[0]).toMatchObject({ status: 'REJECTED', reasonKey: 'clean.invalidDate' });
  });

  it('normalizes text with regular-expression replacement and capture groups', () => {
    const stripped = applyCleanRule(makeRow('contacts.csv', 2, { phone: '(010) 1234-5678' }), {
      id: 'phone-digits', kind: 'regexReplace', column: 'phone', pattern: '[^0-9]+', replacement: '', replaceAll: true, caseInsensitive: false,
    });
    expect(stripped.row.values.phone).toBe('01012345678');
    expect(stripped.evidence[0]).toMatchObject({ status: 'CHANGED', reasonKey: 'clean.regexReplaced' });

    const formatted = applyCleanRule(makeRow('contacts.csv', 3, { phone: '01012345678' }), {
      id: 'phone-format', kind: 'regexReplace', column: 'phone', pattern: '^(\\d{3})(\\d{4})(\\d{4})$', replacement: '$1-$2-$3', replaceAll: false, caseInsensitive: false,
    });
    expect(formatted.row.values.phone).toBe('010-1234-5678');
  });

  it('fills null defaults without overwriting zero, false, or existing text', () => {
    expect(applyCleanRule(makeRow('a.csv', 2, { country: null }), {
      id: 'country-default', kind: 'fillDefault', column: 'country', value: 'US',
    }).row.values.country).toBe('US');
    expect(applyCleanRule(makeRow('a.csv', 3, { score: 0 }), {
      id: 'score-default', kind: 'fillDefault', column: 'score', value: 99,
    }).row.values.score).toBe(0);
    expect(applyCleanRule(makeRow('a.csv', 4, { enabled: false }), {
      id: 'enabled-default', kind: 'fillDefault', column: 'enabled', value: true,
    }).row.values.enabled).toBe(false);
  });

  it('coalesces only an empty target and records the chosen fallback source', () => {
    const filled = applyCleanRule(makeRow('a.csv', 2, { phone: null, mobile: '01012345678', backup: '07000000000' }), {
      id: 'phone-fallback', kind: 'coalesce', column: 'phone', sourceColumns: ['phone', 'mobile', 'backup'],
    });
    expect(filled.row.values.phone).toBe('01012345678');
    expect(filled.evidence[0]).toMatchObject({ reasonKey: 'clean.coalesced', reasonParams: { sourceColumn: 'mobile' } });
    expect(applyCleanRule(makeRow('a.csv', 3, { phone: '021234567', mobile: '01099998888' }), {
      id: 'phone-fallback', kind: 'coalesce', column: 'phone', sourceColumns: ['phone', 'mobile'],
    }).row.values.phone).toBe('021234567');
  });

  it('renames a column without changing its position', () => {
    const result = applyCleanRule(makeRow('a.csv', 2, { old_name: 'Alice', age: 30 }), {
      id: 'rename', kind: 'renameColumn', from: 'old_name', to: 'name',
    });
    expect(result.row.values).toEqual({ name: 'Alice', age: 30 });
    expect(result.evidence[0].reasonKey).toBe('clean.columnRenamed');
  });
});
