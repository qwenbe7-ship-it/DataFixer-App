import { makeDataset, makeRow } from '../../src/domain/factories';
import type { ProcessingResult } from '../../src/domain/types';
import { buildHtmlReport } from '../../src/export/html-report';

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message);
}

const result: ProcessingResult = {
  output: makeDataset(['name'], [makeRow('people.csv', 2, { name: '<script>alert(1)</script>' })], ['people.csv']),
  rejected: makeDataset(['name'], [], ['people.csv']),
  evidence: [
    { rowId: 'people.csv:2', ruleId: 'trim-name', status: 'CHANGED', column: 'name', before: '<script>alert(1)</script>', after: 'Alice', reasonKey: 'clean.trimmed', reasonParams: {} },
  ],
  summary: { inputRows: 1, unchangedRows: 0, changedRows: 1, removedRows: 0, rejectedRows: 0, reconciled: true },
  sourceHash: 'abc123',
  settingsHash: 'def456',
};

const ko = buildHtmlReport(result, 'ko');
assert(ko.includes('DataFixer 처리 보고서'), 'Korean report title');
assert(ko.includes('전체 행'), 'Korean summary label');
assert(ko.includes('abc123') && ko.includes('def456'), 'hashes included');
assert(ko.includes('clean.trimmed'), 'reason key included');
assert(ko.includes('앞뒤 공백을 제거했습니다'), 'Korean human reason included');
assert(ko.includes('&lt;script&gt;alert(1)&lt;/script&gt;'), 'dynamic source values escaped');
assert(!ko.includes('<script>'), 'no script tag');
assert(!/https?:\/\//i.test(ko), 'no external URL');
assert(!/<(?:img|link|iframe|object)\b/i.test(ko), 'no external-resource elements');

const en = buildHtmlReport(result, 'en');
assert(en.includes('DataFixer Processing Report'), 'English report title');
assert(en.includes('Input rows'), 'English summary label');
assert(en.includes('Reconciled'), 'English reconciliation label');
assert(en.includes('Removed leading and trailing whitespace'), 'English human reason included');



const lookupResult: ProcessingResult = {
  output: makeDataset(['sku', 'stock'], [makeRow('orders.csv', 2, { sku: 'A', stock: 10 })], ['orders.csv']),
  rejected: makeDataset(['sku'], [makeRow('orders.csv', 3, { sku: 'B' })], ['orders.csv']),
  evidence: [
    { rowId: 'orders.csv:2', ruleId: 'lookup-exact', status: 'CHANGED', column: 'stock', before: null, after: 10, reasonKey: 'lookup.valueAdded', reasonParams: { sourceColumn: 'stock', targetColumn: 'stock' } },
    { rowId: 'orders.csv:3', ruleId: 'lookup-exact', status: 'REJECTED', reasonKey: 'lookup.notFound', reasonParams: { key: 'sku=B' } },
  ],
  summary: { inputRows: 2, unchangedRows: 0, changedRows: 1, removedRows: 0, rejectedRows: 1, reconciled: true },
  sourceHash: 'lookup-source', settingsHash: 'lookup-settings',
};
const lookupKo = buildHtmlReport(lookupResult, 'ko');
assert(lookupKo.includes('정확히 일치한 참고 행에서 값을 가져왔습니다.'), 'Korean lookup matched reason included');
assert(lookupKo.includes('정확히 일치하는 참고 행을 찾지 못했습니다.'), 'Korean lookup not-found reason included');
const lookupEn = buildHtmlReport(lookupResult, 'en');
assert(lookupEn.includes('Added a value from the single exact reference match.'), 'English lookup matched reason included');


const regexReplaceResult: ProcessingResult = {
  output: makeDataset(['phone'], [makeRow('contacts.csv', 2, { phone: '01012345678' })], ['contacts.csv']),
  rejected: makeDataset(['phone'], [], ['contacts.csv']),
  evidence: [
    { rowId: 'contacts.csv:2', ruleId: 'phone-normalize', status: 'CHANGED', column: 'phone', before: '(010) 1234-5678', after: '01012345678', reasonKey: 'clean.regexReplaced', reasonParams: {} },
  ],
  summary: { inputRows: 1, unchangedRows: 0, changedRows: 1, removedRows: 0, rejectedRows: 0, reconciled: true },
  sourceHash: 'regex-source', settingsHash: 'regex-settings',
};
assert(buildHtmlReport(regexReplaceResult, 'ko').includes('정규식 패턴과 일치한 문자열을 바꿨습니다.'), 'Korean regexReplace reason included');
assert(buildHtmlReport(regexReplaceResult, 'en').includes('Replaced text matching the regular expression pattern.'), 'English regexReplace reason included');


const fillResult: ProcessingResult = {
  output: makeDataset(['country', 'phone', 'mobile'], [makeRow('contacts.csv', 2, { country: 'US', phone: '01012345678', mobile: '01012345678' })], ['contacts.csv']),
  rejected: makeDataset(['country', 'phone', 'mobile'], [], ['contacts.csv']),
  evidence: [
    { rowId: 'contacts.csv:2', ruleId: 'country-default', status: 'CHANGED', column: 'country', before: null, after: 'US', reasonKey: 'clean.defaultFilled', reasonParams: {} },
    { rowId: 'contacts.csv:2', ruleId: 'phone-fallback', status: 'CHANGED', column: 'phone', before: null, after: '01012345678', reasonKey: 'clean.coalesced', reasonParams: { sourceColumn: 'mobile' } },
  ],
  summary: { inputRows: 1, unchangedRows: 0, changedRows: 1, removedRows: 0, rejectedRows: 0, reconciled: true },
  sourceHash: 'fill-source', settingsHash: 'fill-settings',
};
assert(buildHtmlReport(fillResult, 'ko').includes('빈 값에 기본값을 채웠습니다.'), 'Korean fillDefault reason included');
assert(buildHtmlReport(fillResult, 'ko').includes('비어 있는 대상에 첫 번째 사용 가능한 값을 채웠습니다.'), 'Korean coalesce reason included');
assert(buildHtmlReport(fillResult, 'en').includes('Filled an empty value with the configured default.'), 'English fillDefault reason included');
assert(buildHtmlReport(fillResult, 'en').includes('Filled the empty target with the first available source value.'), 'English coalesce reason included');

let invalidLocale = false;
try { buildHtmlReport(result, 'ja' as 'ko'); } catch { invalidLocale = true; }
assert(invalidLocale, 'unsupported locale rejected');

console.log('PASS html-report-check');
