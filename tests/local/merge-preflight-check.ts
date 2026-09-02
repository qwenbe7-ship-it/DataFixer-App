import { makeDataset, makeRow } from '../../src/domain/factories';
import { mergeDatasets } from '../../src/rules/merge';

function expectError(run: () => void, code: string): void {
  try {
    run();
  } catch (error) {
    if (error instanceof Error && error.message === code) return;
    throw error;
  }
  throw new Error(`expected ${code}`);
}

const input = makeDataset(['id'], [makeRow('a.csv', 2, { id: 'A' })], ['a.csv']);
expectError(() => mergeDatasets([input], {
  columnMapBySource: { 'a.csv': { missing: 'id' } },
  outputColumns: ['id'],
  dedupeColumns: [],
}), 'MISSING_COLUMN');


expectError(() => mergeDatasets([input], {
  columnMapBySource: { 'a.csv': { id: 'id' } },
  outputColumns: ['id', 'source'],
  outputTypes: { source: 'number' },
  sourceColumn: 'source',
  dedupeColumns: [],
}), 'INVALID_RULE');

console.log('PASS merge-preflight-check');
