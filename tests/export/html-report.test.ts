import { describe, expect, it } from 'vitest';
import { makeDataset, makeRow } from '../../src/domain/factories';
import type { ProcessingResult } from '../../src/domain/types';
import { buildHtmlReport } from '../../src/export/html-report';

const result: ProcessingResult = {
  output: makeDataset(['name'], [makeRow('people.csv', 2, { name: 'Alice' })], ['people.csv']),
  rejected: makeDataset(['name'], [], ['people.csv']),
  evidence: [{ rowId: 'people.csv:2', ruleId: 'trim', status: 'CHANGED', column: 'name', before: '<script>alert(1)</script>', after: 'Alice', reasonKey: 'clean.trimmed', reasonParams: {} }],
  summary: { inputRows: 1, unchangedRows: 0, changedRows: 1, removedRows: 0, rejectedRows: 0, reconciled: true },
  sourceHash: 'source-hash', settingsHash: 'settings-hash',
};

describe('HTML report', () => {
  it('is bilingual, self-contained, and escapes dynamic values', () => {
    const ko = buildHtmlReport(result, 'ko');
    const en = buildHtmlReport(result, 'en');
    expect(ko).toContain('DataFixer 처리 보고서');
    expect(en).toContain('DataFixer Processing Report');
    expect(ko).toContain('&lt;script&gt;alert(1)&lt;/script&gt;');
    expect(ko).not.toContain('<script>');
    expect(ko).not.toMatch(/https?:\/\//i);
    expect(ko).toContain('앞뒤 공백을 제거했습니다');
    expect(en).toContain('Removed leading and trailing whitespace');
    expect(ko).toContain('source-hash');
    expect(ko).toContain('settings-hash');
  });
});
