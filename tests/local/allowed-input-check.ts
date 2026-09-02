import { formatAllowedValues, formatCellLiteral, parseAllowedValues, parseCellLiteral } from '../../src/ui/rule-input';

function assert(condition: unknown, message: string): asserts condition { if (!condition) throw new Error(message); }
const parsed = parseAllowedValues('1,true,null,"1",001,hello');
assert(JSON.stringify(parsed) === JSON.stringify([1, true, null, '1', '001', 'hello']), 'allowed literals keep cell types');
assert(formatAllowedValues(parsed) === '1,true,null,"1",001,hello', 'allowed literals round-trip visibly');
assert(parseAllowedValues(' , ').length === 0, 'blank allowed input stays empty for validation to reject');
const complex = ['Seoul, Korea', ' padded ', '"quoted"', 'plain'];
const complexText = formatAllowedValues(complex);
assert(JSON.stringify(parseAllowedValues(complexText)) === JSON.stringify(complex), 'allowed string values with commas, spaces, and quotes round-trip');
console.log('PASS allowed-input-check');

assert(parseCellLiteral('1') === 1, 'single literal parses number');
assert(parseCellLiteral('false') === false, 'single literal parses boolean');
assert(parseCellLiteral('001') === '001', 'single literal preserves identifier string');
assert(parseCellLiteral('Seoul, Korea') === 'Seoul, Korea', 'single literal keeps comma without treating it as a list');
assert(formatCellLiteral('001') === '001', 'single literal formatter preserves identifier display');
