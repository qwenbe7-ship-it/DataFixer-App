import { makeDataset, makeRow } from '../../src/domain/factories';
import { processDatasets, sampleDatasets, sampleDatasetsForMode } from '../../src/app/process-job';
import { sha256Canonical } from '../../src/evidence/hash';

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message);
}

const cleanInput = makeDataset(
  ['name'],
  [makeRow('people.csv', 2, { name: ' Alice ' }), makeRow('people.csv', 3, { name: 'Bob' })],
  ['people.csv'],
);
async function main(): Promise<void> {
const clean = await processDatasets({
  mode: 'clean',
  datasets: [cleanInput],
  rules: [{ id: 'trim-name', kind: 'trim', column: 'name' }],
  mergeSettings: null,
  sourceHash: 'source',
});
assert(clean.output.rows[0].values.name === 'Alice', 'clean processing runs rules');
assert(clean.summary.inputRows === 2 && clean.summary.changedRows === 1 && clean.summary.unchangedRows === 1, 'clean summary reconciles');
assert(clean.settingsHash.length === 64, 'settings hash generated');
const legacyCleanSettingsHash = await sha256Canonical({ mode: 'clean', rules: [{ id: 'trim-name', kind: 'trim', column: 'name' }], mergeSettings: null });
assert(clean.settingsHash === legacyCleanSettingsHash, 'existing clean settings hash stays compatible after lookup mode is added');

const validate = await processDatasets({
  mode: 'validate', datasets: [cleanInput],
  rules: [{ id: 'required-name', kind: 'required', column: 'name' }],
  mergeSettings: null, sourceHash: 'source',
});
assert(validate.summary.rejectedRows === 0, 'validation processing works');

let refusedCleanValidationRule = false;
try {
  await processDatasets({
    mode: 'clean', datasets: [cleanInput],
    rules: [{ id: 'required-name', kind: 'required', column: 'name' }],
    mergeSettings: null, sourceHash: 'source',
  });
} catch { refusedCleanValidationRule = true; }
assert(refusedCleanValidationRule, 'clean processing rejects validation rules');

let refusedValidateCleanRule = false;
try {
  await processDatasets({
    mode: 'validate', datasets: [cleanInput],
    rules: [{ id: 'trim-name', kind: 'trim', column: 'name' }],
    mergeSettings: null, sourceHash: 'source',
  });
} catch { refusedValidateCleanRule = true; }
assert(refusedValidateCleanRule, 'validate processing rejects clean rules');

let refusedMultiple = false;
try {
  await processDatasets({ mode: 'clean', datasets: [cleanInput, cleanInput], rules: [{ id: 'trim-name', kind: 'trim', column: 'name' }], mergeSettings: null, sourceHash: 'source' });
} catch { refusedMultiple = true; }
assert(refusedMultiple, 'clean refuses multiple datasets');

const many = makeDataset(['id'], Array.from({ length: 260 }, (_, index) => makeRow('many.csv', index + 2, { id: index })), ['many.csv']);
const sampled = sampleDatasets([many], 200);
assert(sampled[0].rows.length === 200, 'preview caps total rows at 200');
assert(sampled[0].rows[199].sourceRowNumber === 201, 'preview preserves row numbers');





const lookupManyLeft = makeDataset(['id'], Array.from({ length: 260 }, (_, index) => makeRow('left-many.csv', index + 2, { id: index })), ['left-many.csv']);
const lookupManyRight = makeDataset(['id', 'value'], Array.from({ length: 500 }, (_, index) => makeRow('right-many.csv', index + 2, { id: index, value: `v${index}` })), ['right-many.csv']);
const lookupSample = sampleDatasetsForMode('lookup', [lookupManyLeft, lookupManyRight], 200);
assert(lookupSample[0].rows.length === 200, 'lookup preview caps base rows at 200');
assert(lookupSample[1].rows.length === 500, 'lookup preview retains all reference rows for accurate exact matching');

const lookupBase = makeDataset(
  ['sku', 'name'],
  [makeRow('orders.csv', 2, { sku: 'A', name: 'Alpha' }), makeRow('orders.csv', 3, { sku: 'B', name: 'Beta' })],
  ['orders.csv'],
);
const lookupReference = makeDataset(
  ['sku', 'stock'],
  [makeRow('inventory.csv', 2, { sku: 'A', stock: 10 })],
  ['inventory.csv'],
);
const lookup = await processDatasets({
  mode: 'lookup',
  datasets: [lookupBase, lookupReference],
  rules: [],
  mergeSettings: null,
  lookupSettings: { leftKeyColumns: ['sku'], rightKeyColumns: ['sku'], rightValueMap: { stock: 'inventory_stock' } },
  sourceHash: 'source',
});
assert(lookup.summary.inputRows === 2, 'lookup reconciliation counts only base rows');
assert(lookup.summary.changedRows === 1 && lookup.summary.rejectedRows === 1, 'lookup summarizes exact match and missing match');
assert(lookup.output.rows[0].values.inventory_stock === 10, 'lookup is integrated into processDatasets');



let refusedCleanMergeSettings = false;
try {
  await processDatasets({
    mode: 'clean', datasets: [cleanInput], rules: [{ id: 'trim-name', kind: 'trim', column: 'name' }],
    mergeSettings: { columnMapBySource: {}, outputColumns: ['x'], dedupeColumns: [] }, sourceHash: 'source',
  });
} catch { refusedCleanMergeSettings = true; }
assert(refusedCleanMergeSettings, 'clean rejects irrelevant merge settings instead of silently ignoring them');

let refusedMergeLookupSettings = false;
try {
  await processDatasets({
    mode: 'merge', datasets: [lookupBase, lookupReference], rules: [],
    mergeSettings: { columnMapBySource: { 'orders.csv': { sku: 'sku' }, 'inventory.csv': { sku: 'sku' } }, outputColumns: ['sku'], dedupeColumns: [] },
    lookupSettings: { leftKeyColumns: ['sku'], rightKeyColumns: ['sku'], rightValueMap: { stock: 'inventory_stock' } },
    sourceHash: 'source',
  });
} catch { refusedMergeLookupSettings = true; }
assert(refusedMergeLookupSettings, 'merge rejects irrelevant lookup settings instead of silently ignoring them');

console.log('PASS process-job-check');
}

main().catch((error) => { console.error(error); throw error; });
