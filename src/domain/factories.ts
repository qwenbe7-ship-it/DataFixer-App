import type { CellValue, DataRow, Dataset } from './types';

export function makeRow(
  sourceId: string,
  sourceRowNumber: number,
  values: Record<string, CellValue>,
): DataRow {
  return {
    rowId: `${sourceId}:${sourceRowNumber}`,
    sourceId,
    sourceRowNumber,
    values: { ...values },
  };
}

export function makeDataset(
  columns: string[],
  rows: DataRow[],
  sourceIds: string[],
): Dataset {
  return {
    columns: [...columns],
    rows: [...rows],
    sourceIds: [...sourceIds],
  };
}
