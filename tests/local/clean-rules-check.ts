import { makeRow } from '../../src/domain/factories';
import { applyCleanRule } from '../../src/rules/clean';

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message);
}
function eq(actual: unknown, expected: unknown, message: string) {
  if (JSON.stringify(actual) !== JSON.stringify(expected)) {
    throw new Error(`${message}: expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}`);
  }
}

let result = applyCleanRule(makeRow('a.csv', 2, { name: 'Alice   Kim' }), {
  id: 'spaces', kind: 'collapseSpaces', column: 'name',
});
assert(result.row.values.name === 'Alice Kim', 'collapseSpaces');
assert(result.evidence[0]?.reasonKey === 'clean.spacesCollapsed', 'collapseSpaces evidence');

result = applyCleanRule(makeRow('a.csv', 3, { note: 'N/A' }), {
  id: 'empty', kind: 'normalizeEmpty', column: 'note', emptyValues: ['', 'N/A', '-'],
});
assert(result.row.values.note === null, 'normalizeEmpty');
assert(result.evidence[0]?.reasonKey === 'clean.emptyNormalized', 'normalizeEmpty evidence');

result = applyCleanRule(makeRow('a.csv', 4, { city: 'sEOUL city' }), {
  id: 'case', kind: 'changeCase', column: 'city', mode: 'title',
});
assert(result.row.values.city === 'Seoul City', 'title case');

result = applyCleanRule(makeRow('a.csv', 5, { amount: '1,234.50' }), {
  id: 'number', kind: 'parseNumber', column: 'amount', removeThousandsSeparator: true,
});
assert(result.row.values.amount === 1234.5, 'parseNumber');

result = applyCleanRule(makeRow('a.csv', 6, { amount: '1,2,3' }), {
  id: 'number-commas', kind: 'parseNumber', column: 'amount', removeThousandsSeparator: true,
});
assert(result.reject === true, 'malformed thousands separators must reject');

result = applyCleanRule(makeRow('a.csv', 6, { amount: '12abc' }), {
  id: 'number-bad', kind: 'parseNumber', column: 'amount', removeThousandsSeparator: true,
});
assert(result.reject === true, 'invalid number must reject');
assert(result.row.values.amount === '12abc', 'invalid number must preserve input');
assert(result.evidence[0]?.status === 'REJECTED', 'invalid number evidence status');
assert(result.evidence[0]?.reasonKey === 'clean.invalidNumber', 'invalid number reason');

result = applyCleanRule(makeRow('a.csv', 7, { date: '2026/9/1' }), {
  id: 'date', kind: 'parseDate', column: 'date', output: 'YYYY-MM-DD',
});
assert(result.row.values.date === '2026-09-01', 'parseDate YYYY/M/D');

result = applyCleanRule(makeRow('a.csv', 8, { date: 46266 }), {
  id: 'date-serial', kind: 'parseDate', column: 'date', output: 'YYYY-MM-DD',
});
assert(result.row.values.date === '2026-09-01', 'parseDate Excel serial');

result = applyCleanRule(makeRow('a.csv', 8, { date: '2026-02-30' }), {
  id: 'date-bad', kind: 'parseDate', column: 'date', output: 'YYYY-MM-DD',
});
assert(result.reject === true, 'invalid date must reject');
assert(result.row.values.date === '2026-02-30', 'invalid date must preserve input');
assert(result.evidence[0]?.reasonKey === 'clean.invalidDate', 'invalid date reason');

result = applyCleanRule(makeRow('a.csv', 9, { sku: 'ABC-OLD-01' }), {
  id: 'replace', kind: 'replace', column: 'sku', search: 'OLD', replacement: 'NEW',
});
assert(result.row.values.sku === 'ABC-NEW-01', 'replace');

result = applyCleanRule(makeRow('a.csv', 10, { old_name: 'Alice', age: 30 }), {
  id: 'rename', kind: 'renameColumn', from: 'old_name', to: 'name',
});
eq(result.row.values, { name: 'Alice', age: 30 }, 'renameColumn values');
assert(result.evidence[0]?.reasonKey === 'clean.columnRenamed', 'rename evidence');

result = applyCleanRule(makeRow('a.csv', 11, { id: 1, name: 'Alice', secret: 'x' }), {
  id: 'keep', kind: 'keepColumns', columns: ['id', 'name'],
});
eq(result.row.values, { id: 1, name: 'Alice' }, 'keepColumns');
assert(result.evidence[0]?.reasonKey === 'clean.columnsFiltered', 'keepColumns evidence');

console.log('PASS clean-rules-check');

result = applyCleanRule(makeRow('a.csv', 12, { date: 9_999_999_999 }), {
  id: 'date-huge', kind: 'parseDate', column: 'date', output: 'YYYY-MM-DD',
});
assert(result.reject === true, 'out-of-range Excel date serial must reject');
