import { DataFixerError } from '../domain/errors';
import { makeDataset, makeRow } from '../domain/factories';
import type { CellValue, Dataset } from '../domain/types';

function fail(sourceId: string, details: Record<string, string | number>): never {
  throw new DataFixerError('PARSE_FAILED', { file: sourceId, ...details });
}

function normalizeCell(sourceId: string, rowNumber: number, column: string, value: unknown): CellValue {
  if (value === undefined || value === null || value === '') return null;
  if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') return value;
  return fail(sourceId, { row: rowNumber, column, reason: 'UNSUPPORTED_CELL_TYPE' });
}

export function normalizeSheet(sourceId: string, matrix: unknown[][]): Dataset {
  if (matrix.length === 0) fail(sourceId, { reason: 'EMPTY_SHEET' });

  const rawHeaders = matrix[0] ?? [];
  if (rawHeaders.length === 0) fail(sourceId, { reason: 'EMPTY_HEADER' });

  const columns = rawHeaders.map((header, index) => {
    if (typeof header !== 'string' && typeof header !== 'number' && typeof header !== 'boolean') {
      return fail(sourceId, { columnIndex: index + 1, reason: 'INVALID_HEADER' });
    }
    const name = String(header).trim();
    if (!name) return fail(sourceId, { columnIndex: index + 1, reason: 'BLANK_HEADER' });
    return name;
  });

  const seen = new Set<string>();
  for (const column of columns) {
    if (seen.has(column)) fail(sourceId, { column, reason: 'DUPLICATE_HEADER' });
    seen.add(column);
  }

  const rows = matrix.slice(1).flatMap((rawRow, rowIndex) => {
    const sourceRowNumber = rowIndex + 2;
    const isBlankSourceRow = rawRow.length === 0 || rawRow.every((value) => value === null || value === undefined || value === '');
    if (isBlankSourceRow) return [];
    if (rawRow.length > columns.length) {
      fail(sourceId, { row: sourceRowNumber, reason: 'EXTRA_CELL' });
    }

    const values: Record<string, CellValue> = {};
    for (let columnIndex = 0; columnIndex < columns.length; columnIndex += 1) {
      const column = columns[columnIndex];
      values[column] = normalizeCell(sourceId, sourceRowNumber, column, rawRow[columnIndex]);
    }
    return [makeRow(sourceId, sourceRowNumber, values)];
  });

  return makeDataset(columns, rows, [sourceId]);
}
