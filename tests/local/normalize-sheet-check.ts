import { normalizeSheet } from '../../src/file-io/normalize-sheet';

function equal(actual: unknown, expected: unknown, message: string): void {
  const a = JSON.stringify(actual); const e = JSON.stringify(expected);
  if (a !== e) throw new Error(`${message}: expected ${e}, got ${a}`);
}
function code(fn: () => void): string | null {
  try { fn(); return null; } catch (error) { return error instanceof Error ? error.message : String(error); }
}

const dataset = normalizeSheet('people.csv', [
  ['name', 'age', 'active'],
  ['Alice', 30, true],
  ['Bob', null, false],
]);
equal(dataset.columns, ['name', 'age', 'active'], 'columns');
equal(dataset.sourceIds, ['people.csv'], 'source ids');
equal(dataset.rows.map((r) => r.rowId), ['people.csv:2', 'people.csv:3'], 'row ids');
equal(dataset.rows[0].values, { name: 'Alice', age: 30, active: true }, 'row values');
const csvBlankCell = normalizeSheet('blank-cell.csv', [
  ['name', 'amount'],
  ['Alice', ''],
]);
equal(csvBlankCell.rows[0].values.amount, null, 'empty CSV field normalizes to null so CSV and XLSX blanks behave the same');
const withBlankSourceRow = normalizeSheet('blank-gap.csv', [
  ['name'],
  ['Alice'],
  [''],
  ['Carol'],
]);
equal(withBlankSourceRow.rows.map((r) => r.rowId), ['blank-gap.csv:2', 'blank-gap.csv:4'], 'blank source row preserves later source row number');
equal(code(() => normalizeSheet('bad.csv', [['', 'age'], ['Alice', 30]])), 'PARSE_FAILED', 'blank header');
equal(code(() => normalizeSheet('bad.csv', [['name', 'name'], ['Alice', 'A']])), 'PARSE_FAILED', 'duplicate header');
equal(code(() => normalizeSheet('bad.csv', [['name'], ['Alice', 'extra']])), 'PARSE_FAILED', 'extra cell');
equal(code(() => normalizeSheet('bad.csv', [['name'], [{ nested: true }]])), 'PARSE_FAILED', 'unsupported cell');
console.log('PASS normalize-sheet-check');
