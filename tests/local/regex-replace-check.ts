import { makeDataset, makeRow } from '../../src/domain/factories';
import { applyCleanRule } from '../../src/rules/clean';
import { applyRules } from '../../src/rules/engine';

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message);
}

let result = applyCleanRule(makeRow('contacts.csv', 2, { phone: '(010) 1234-5678' }), {
  id: 'phone-digits',
  kind: 'regexReplace',
  column: 'phone',
  pattern: '[^0-9]+',
  replacement: '',
  replaceAll: true,
  caseInsensitive: false,
});
assert(result.row.values.phone === '01012345678', 'regexReplace must remove every non-digit group');
assert(result.evidence[0]?.reasonKey === 'clean.regexReplaced', 'regexReplace evidence reason');

result = applyCleanRule(makeRow('products.csv', 2, { sku: 'ab- 001' }), {
  id: 'sku-normalize',
  kind: 'regexReplace',
  column: 'sku',
  pattern: '[-\\s]+',
  replacement: '',
  replaceAll: true,
  caseInsensitive: false,
});
assert(result.row.values.sku === 'ab001', 'regexReplace must normalize repeated separators');

result = applyCleanRule(makeRow('contacts.csv', 3, { phone: '01012345678' }), {
  id: 'phone-format',
  kind: 'regexReplace',
  column: 'phone',
  pattern: '^(\\d{3})(\\d{4})(\\d{4})$',
  replacement: '$1-$2-$3',
  replaceAll: false,
  caseInsensitive: false,
});
assert(result.row.values.phone === '010-1234-5678', 'capture groups must be usable in replacement');

result = applyCleanRule(makeRow('products.csv', 3, { code: 'ABC-1' }), {
  id: 'no-match',
  kind: 'regexReplace',
  column: 'code',
  pattern: '^ZZZ',
  replacement: 'X',
  replaceAll: true,
  caseInsensitive: false,
});
assert(result.evidence.length === 0 && result.row.values.code === 'ABC-1', 'no match must remain unchanged');

result = applyCleanRule(makeRow('products.csv', 4, { quantity: 12 }), {
  id: 'non-string',
  kind: 'regexReplace',
  column: 'quantity',
  pattern: '\\d+',
  replacement: 'x',
  replaceAll: true,
  caseInsensitive: false,
});
assert(result.evidence.length === 0 && result.row.values.quantity === 12, 'non-string values must remain unchanged');

result = applyCleanRule(makeRow('products.csv', 5, { code: 'ab-AB' }), {
  id: 'case-insensitive', kind: 'regexReplace', column: 'code', pattern: 'ab', replacement: 'X', replaceAll: true, caseInsensitive: true,
});
assert(result.row.values.code === 'X-X', 'case-insensitive replacement must replace every case variant');

const dataset = makeDataset(['code'], [makeRow('products.csv', 2, { code: 'ABC' })], ['products.csv']);
let invalidRejected = false;
try {
  applyRules(dataset, [{ id: 'bad-regex', kind: 'regexReplace', column: 'code', pattern: '[', replacement: '', replaceAll: true, caseInsensitive: false }]);
} catch (error) {
  invalidRejected = error instanceof Error && (error as { code?: string }).code === 'INVALID_RULE';
}
assert(invalidRejected, 'invalid regular expressions must fail preflight');

let emptyRejected = false;
try {
  applyRules(dataset, [{ id: 'empty-regex', kind: 'regexReplace', column: 'code', pattern: '', replacement: 'X', replaceAll: true, caseInsensitive: false }]);
} catch (error) {
  emptyRejected = error instanceof Error && (error as { code?: string }).code === 'INVALID_RULE';
}
assert(emptyRejected, 'empty regex patterns must fail preflight');


let unsafeRejected = false;
try {
  applyRules(dataset, [{ id: 'unsafe-regex', kind: 'regexReplace', column: 'code', pattern: '(a+)+$', replacement: '', replaceAll: true, caseInsensitive: false }]);
} catch (error) {
  unsafeRejected = error instanceof Error && (error as { code?: string }).code === 'INVALID_RULE';
}
assert(unsafeRejected, 'catastrophic nested-quantifier regexReplace patterns must fail preflight');


for (const pattern of ['(a|aa)+$', '(a+)\\1']) {
  let rejected = false;
  try {
    applyRules(dataset, [{ id: `unsafe-${pattern}`, kind: 'regexReplace', column: 'code', pattern, replacement: '', replaceAll: true, caseInsensitive: false }]);
  } catch (error) {
    rejected = error instanceof Error && (error as { code?: string }).code === 'INVALID_RULE';
  }
  assert(rejected, `unsafe regex variant must fail preflight: ${pattern}`);
}

console.log('PASS regex-replace-check');
