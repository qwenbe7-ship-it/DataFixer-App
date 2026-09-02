import { DataFixerError } from '../../src/domain/errors';
import { parseJobSettings, serializeJobSettings } from '../../src/export/job-settings';

function assert(condition: unknown, message: string): asserts condition { if (!condition) throw new Error(message); }
function expectInvalid(text: string): void {
  try { parseJobSettings(text); throw new Error('expected INVALID_RULE'); }
  catch (error) { if (!(error instanceof DataFixerError) || error.code !== 'INVALID_RULE') throw error; }
}

const cleanText = serializeJobSettings({ version: 1, mode: 'clean', rules: [{ id: 'trim-a', kind: 'trim', column: 'a' }], mergeSettings: null });
const clean = parseJobSettings(cleanText);
assert(clean.mode === 'clean' && clean.rules.length === 1 && clean.mergeSettings === null, 'clean settings round trip');

const regexCleanText = serializeJobSettings({ version: 1, mode: 'clean', rules: [{ id: 'phone-normalize', kind: 'regexReplace', column: 'phone', pattern: '[^0-9]+', replacement: '', replaceAll: true, caseInsensitive: false }], mergeSettings: null });
const regexClean = parseJobSettings(regexCleanText);
assert(regexClean.mode === 'clean' && regexClean.rules[0]?.kind === 'regexReplace', 'clean regexReplace settings round trip');

const mergeText = serializeJobSettings({
  version: 1, mode: 'merge', rules: [],
  mergeSettings: { columnMapBySource: { 'a.csv': { old: 'id' } }, outputColumns: ['id', 'source'], outputTypes: { id: 'string', source: 'string' }, sourceColumn: 'source', dedupeColumns: ['id'] },
});
const merge = parseJobSettings(mergeText);
assert(merge.mode === 'merge' && merge.mergeSettings?.columnMapBySource['a.csv'].old === 'id', 'merge mapping round trip');
assert(merge.mergeSettings?.outputTypes?.id === 'string', 'merge output types round trip');

expectInvalid(JSON.stringify({ version: 1, mode: 'merge', rules: [], mergeSettings: null }));
expectInvalid(JSON.stringify({ version: 1, mode: 'clean', rules: [], mergeSettings: null, script: 'evil()' }));
expectInvalid(JSON.stringify({ version: 1, mode: 'merge', rules: [], mergeSettings: { outputColumns: ['id'], dedupeColumns: [], columnMapBySource: {}, url: 'https://x.test' } }));
expectInvalid(JSON.stringify({ version: 1, mode: 'merge', rules: [], mergeSettings: { outputColumns: ['id'], outputTypes: { id: 'date' }, dedupeColumns: [], columnMapBySource: {} } }));


const lookupText = serializeJobSettings({
  version: 1,
  mode: 'lookup',
  rules: [],
  mergeSettings: null,
  lookupSettings: { leftKeyColumns: ['sku'], rightKeyColumns: ['product_sku'], rightValueMap: { stock: 'inventory_stock' } },
});
const lookup = parseJobSettings(lookupText);
assert(lookup.mode === 'lookup' && lookup.lookupSettings?.rightValueMap.stock === 'inventory_stock', 'lookup settings round trip');
expectInvalid(JSON.stringify({
  version: 1, mode: 'lookup', rules: [], mergeSettings: null,
  lookupSettings: { leftKeyColumns: ['sku'], rightKeyColumns: [], rightValueMap: { stock: 'inventory_stock' } },
}));

console.log('PASS job-settings-check');

expectInvalid(JSON.stringify({
  version: 1,
  mode: 'clean',
  rules: [{ id: 'required-a', kind: 'required', column: 'a' }],
  mergeSettings: null,
}));
expectInvalid(JSON.stringify({
  version: 1,
  mode: 'validate',
  rules: [{ id: 'trim-a', kind: 'trim', column: 'a' }],
  mergeSettings: null,
}));
