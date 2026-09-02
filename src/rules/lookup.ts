import { DataFixerError } from '../domain/errors';
import type { CellValue, DataRow, Dataset, EngineResult, EvidenceEntry, LookupSettings } from '../domain/types';

function ensureUniqueNonBlank(columns: string[], field: string): void {
  if (columns.length === 0 || columns.some((column) => column.trim() === '') || new Set(columns).size !== columns.length) {
    throw new DataFixerError('INVALID_RULE', { field });
  }
}

function preflight(inputs: Dataset[], settings: LookupSettings): [Dataset, Dataset] {
  if (inputs.length !== 2) throw new DataFixerError('INVALID_RULE', { issue: 'lookup-two-files-required' });
  const [left, right] = inputs;
  ensureUniqueNonBlank(settings.leftKeyColumns, 'leftKeyColumns');
  ensureUniqueNonBlank(settings.rightKeyColumns, 'rightKeyColumns');
  if (settings.leftKeyColumns.length !== settings.rightKeyColumns.length) {
    throw new DataFixerError('INVALID_RULE', { issue: 'lookup-key-width-mismatch' });
  }
  for (const column of settings.leftKeyColumns) {
    if (!left.columns.includes(column)) throw new DataFixerError('MISSING_COLUMN', { side: 'left', column });
  }
  for (const column of settings.rightKeyColumns) {
    if (!right.columns.includes(column)) throw new DataFixerError('MISSING_COLUMN', { side: 'right', column });
  }
  const entries = Object.entries(settings.rightValueMap);
  if (entries.length === 0) throw new DataFixerError('INVALID_RULE', { field: 'rightValueMap' });
  const targets = new Set<string>();
  for (const [source, target] of entries) {
    if (!source.trim() || !target.trim()) throw new DataFixerError('INVALID_RULE', { field: 'rightValueMap' });
    if (!right.columns.includes(source)) throw new DataFixerError('MISSING_COLUMN', { side: 'right', column: source });
    if (left.columns.includes(target) || targets.has(target)) throw new DataFixerError('INVALID_RULE', { field: 'rightValueMap', column: target });
    targets.add(target);
  }
  return [left, right];
}



function orderedValueMappings(right: Dataset, settings: LookupSettings): Array<[string, string]> {
  return right.columns
    .filter((sourceColumn) => Object.prototype.hasOwnProperty.call(settings.rightValueMap, sourceColumn))
    .map((sourceColumn) => [sourceColumn, settings.rightValueMap[sourceColumn]]);
}

function keyFor(row: DataRow, columns: string[]): string | null {
  const values = columns.map((column) => row.values[column] ?? null);
  if (values.some((value) => value === null)) return null;
  return JSON.stringify(values);
}

function displayKey(row: DataRow, columns: string[]): string {
  return columns.map((column) => `${column}=${String(row.values[column] ?? '')}`).join(' | ');
}

function rejectEvidence(row: DataRow, reasonKey: 'lookup.notFound' | 'lookup.multipleMatches', settings: LookupSettings, matches?: number): EvidenceEntry {
  return {
    rowId: row.rowId,
    ruleId: 'lookup-exact',
    status: 'REJECTED',
    reasonKey,
    reasonParams: {
      key: displayKey(row, settings.leftKeyColumns),
      ...(matches === undefined ? {} : { matches }),
    },
  };
}

function valueEvidence(row: DataRow, referenceRow: DataRow, sourceColumn: string, targetColumn: string, value: CellValue): EvidenceEntry {
  return {
    rowId: row.rowId,
    ruleId: 'lookup-exact',
    status: 'CHANGED',
    column: targetColumn,
    before: null,
    after: value,
    reasonKey: 'lookup.valueAdded',
    reasonParams: { sourceColumn, targetColumn, referenceRowId: referenceRow.rowId, referenceSourceId: referenceRow.sourceId, referenceRowNumber: referenceRow.sourceRowNumber },
  };
}

export function lookupDatasets(inputs: Dataset[], settings: LookupSettings): EngineResult {
  const [left, right] = preflight(inputs, settings);
  const index = new Map<string, DataRow[]>();
  for (const row of right.rows) {
    const key = keyFor(row, settings.rightKeyColumns);
    if (key === null) continue;
    const matches = index.get(key) ?? [];
    matches.push(row);
    index.set(key, matches);
  }

  const valueMappings = orderedValueMappings(right, settings);
  const outputRows: DataRow[] = [];
  const rejectedRows: DataRow[] = [];
  const evidence: EvidenceEntry[] = [];
  for (const inputRow of left.rows) {
    const key = keyFor(inputRow, settings.leftKeyColumns);
    const matches = key === null ? [] : index.get(key) ?? [];
    if (matches.length === 0) {
      rejectedRows.push({ ...inputRow, values: { ...inputRow.values } });
      evidence.push(rejectEvidence(inputRow, 'lookup.notFound', settings));
      continue;
    }
    if (matches.length > 1) {
      rejectedRows.push({ ...inputRow, values: { ...inputRow.values } });
      evidence.push(rejectEvidence(inputRow, 'lookup.multipleMatches', settings, matches.length));
      continue;
    }

    const match = matches[0];
    const values = { ...inputRow.values };
    for (const [sourceColumn, targetColumn] of valueMappings) {
      const value = match.values[sourceColumn] ?? null;
      values[targetColumn] = value;
      evidence.push(valueEvidence(inputRow, match, sourceColumn, targetColumn, value));
    }
    outputRows.push({ ...inputRow, values });
  }

  return {
    dataset: {
      columns: [...left.columns, ...valueMappings.map(([, targetColumn]) => targetColumn)],
      rows: outputRows,
      sourceIds: [...left.sourceIds],
    },
    removedRows: [],
    rejectedRows,
    evidence,
  };
}
