import { buildSourceIdentityDescriptor } from '../../src/worker/source-identity';

function notEqual(actual: unknown, other: unknown, message: string): void {
  if (JSON.stringify(actual) === JSON.stringify(other)) throw new Error(message);
}
function equal(actual: unknown, expected: unknown, message: string): void {
  const a=JSON.stringify(actual), e=JSON.stringify(expected); if (a!==e) throw new Error(`${message}: expected ${e}, got ${a}`);
}

const files = [
  { name: 'book.xlsx', bytes: 100, hash: 'abc', sheetName: 'Orders' },
  { name: 'other.xlsx', bytes: 50, hash: 'def', sheetName: 'Sheet1' },
];
const base = buildSourceIdentityDescriptor(files);
const differentSheet = buildSourceIdentityDescriptor([{ ...files[0], sheetName: 'Returns' }, files[1]]);
const differentOrder = buildSourceIdentityDescriptor([files[1], files[0]]);
equal(base[0], { name: 'book.xlsx', bytes: 100, hash: 'abc', sheetName: 'Orders' }, 'identity includes selected sheet');
notEqual(base, differentSheet, 'selected sheet must change source identity');
notEqual(base, differentOrder, 'file order must change source identity');
console.log('PASS source-identity-check');
