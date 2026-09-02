import type { DataRow, Dataset } from '../../src/domain/types';

export function seededRandom(seed: number): () => number {
  let state = seed >>> 0;
  return () => {
    state ^= state << 13;
    state ^= state >>> 17;
    state ^= state << 5;
    return (state >>> 0) / 0x100000000;
  };
}

function thousands(value: number): string {
  return value.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',');
}

function row(sourceId: string, prefix: string, index: number, values: DataRow['values']): DataRow {
  return {
    rowId: `${prefix}-${index + 1}`,
    sourceId,
    sourceRowNumber: index + 1,
    values,
  };
}

export function generateCleanDataset(rows: number, seed: number): Dataset {
  const random = seededRandom(seed);
  const generated: DataRow[] = [];
  for (let index = 0; index < rows; index += 1) {
    const amount = 1000 + Math.floor(random() * 900000);
    const idIndex = index > 0 && index % 211 === 0 ? index - 1 : index;
    generated.push(row('source-clean', 'clean', index, {
      id: `ID-${idIndex}`,
      name: index % 11 === 0 ? null : (index % 7 === 0 ? `  Name   ${index}  ` : `Name ${index}`),
      amount: index % 9 === 0 ? thousands(amount) : amount,
      status: index % 5 === 0 ? null : (index % 3 === 0 ? 'inactive' : 'active'),
      fallback: `Fallback ${index}`,
    }));
  }
  return {
    columns: ['id', 'name', 'amount', 'status', 'fallback'],
    rows: generated,
    sourceIds: ['source-clean'],
  };
}

function mergeKeyIndex(sourceId: 'source-a' | 'source-b', rows: number, index: number): number {
  if (sourceId === 'source-a') return index;
  if (index > 1 && index % 211 === 0) return index - 2;
  if (index % 5 === 0) return rows + index;
  return index;
}

function generateMergeSource(sourceId: 'source-a' | 'source-b', rows: number, seed: number): Dataset {
  const random = seededRandom(seed);
  const generated: DataRow[] = [];
  for (let index = 0; index < rows; index += 1) {
    const keyIndex = mergeKeyIndex(sourceId, rows, index);
    generated.push(row(sourceId, sourceId, index, {
      id: `K-${keyIndex}`,
      name: `${sourceId}-Name-${index}`,
      amount: 100 + Math.floor(random() * 500000),
    }));
  }
  return {
    columns: ['id', 'name', 'amount'],
    rows: generated,
    sourceIds: [sourceId],
  };
}

export function generateMergeDatasets(rowsPerSource: number, seed: number): Dataset[] {
  return [
    generateMergeSource('source-a', rowsPerSource, seed),
    generateMergeSource('source-b', rowsPerSource, seed ^ 0x9e3779b9),
  ];
}

export function generateValidateDataset(rows: number, seed: number): Dataset {
  const random = seededRandom(seed);
  const generated: DataRow[] = [];
  for (let index = 0; index < rows; index += 1) {
    const normalAmount = Math.floor(random() * 900000);
    const idIndex = index > 0 && index % 211 === 0 ? index - 1 : index;
    const amount = index % 10 === 0 ? 'bad' : (index % 17 === 0 ? 2000000 : normalAmount);
    generated.push(row('source-validate', 'validate', index, {
      id: index % 101 === 0 ? null : `ID-${idIndex}`,
      name: `Name ${index}`,
      amount,
      status: index % 8 === 0 ? 'unknown' : (index % 3 === 0 ? 'inactive' : 'active'),
    }));
  }
  return {
    columns: ['id', 'name', 'amount', 'status'],
    rows: generated,
    sourceIds: ['source-validate'],
  };
}
