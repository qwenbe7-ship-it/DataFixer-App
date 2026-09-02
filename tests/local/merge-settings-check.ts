import { makeDataset, makeRow } from '../../src/domain/factories';
import { mergeDatasets } from '../../src/rules/merge';

function expectError(run: () => void, code: string, label: string): void {
  try {
    run();
  } catch (error) {
    if (error instanceof Error && error.message === code) return;
    throw new Error(`${label}: wrong error ${error instanceof Error ? error.message : String(error)}`, { cause: error });
  }
  throw new Error(`${label}: expected ${code}`);
}

const input = makeDataset(['id', 'name'], [makeRow('a.csv', 2, { id: 'A', name: 'Alice' })], ['a.csv']);

expectError(() => mergeDatasets([input], {
  columnMapBySource: { 'a.csv': { id: 'missing-target' } },
  outputColumns: ['id'], dedupeColumns: [],
}), 'INVALID_RULE', 'target must exist');

expectError(() => mergeDatasets([input], {
  columnMapBySource: { 'a.csv': { id: 'value', name: 'value' } },
  outputColumns: ['value'], dedupeColumns: [],
}), 'INVALID_RULE', 'two sources cannot overwrite one target');

expectError(() => mergeDatasets([input], {
  columnMapBySource: { 'a.csv': { id: 'id' } },
  outputColumns: ['id'], sourceColumn: 'source', dedupeColumns: [],
}), 'INVALID_RULE', 'source column must be declared');

expectError(() => mergeDatasets([input], {
  columnMapBySource: { 'a.csv': { id: 'source' } },
  outputColumns: ['source'], sourceColumn: 'source', dedupeColumns: [],
}), 'INVALID_RULE', 'source column cannot overwrite mapped data');

expectError(() => mergeDatasets([input], {
  columnMapBySource: { 'a.csv': { id: 'id' } },
  outputColumns: ['id'], dedupeColumns: ['missing'],
}), 'MISSING_COLUMN', 'dedupe column must exist');

expectError(() => mergeDatasets([input], {
  columnMapBySource: {},
  outputColumns: ['id'], dedupeColumns: [],
}), 'INVALID_RULE', 'every source needs a mapping');

expectError(() => mergeDatasets([input], {
  columnMapBySource: { 'a.csv': { id: 'id' } },
  outputColumns: ['id', 'id'], dedupeColumns: [],
}), 'INVALID_RULE', 'output columns must be unique');

expectError(() => mergeDatasets([input], {
  columnMapBySource: { 'a.csv': { id: 'id' } },
  outputColumns: ['id', ''], dedupeColumns: [],
}), 'INVALID_RULE', 'output columns cannot be blank');

console.log('PASS merge-settings-check');
