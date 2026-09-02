import { DataFixerError } from '../domain/errors';
import type {
  CellValue,
  DataRow,
  Dataset,
  EngineResult,
  EvidenceEntry,
  MergeSettings,
  MergeValueType,
} from '../domain/types';

type ValueType = MergeValueType;

interface TypeConflict {
  column: string;
  value: CellValue;
  expected: ValueType;
  actual: ValueType;
}


function preflightSettings(inputs: Dataset[], settings: MergeSettings): void {
  const uniqueOutputColumns = new Set(settings.outputColumns);
  if (
    settings.outputColumns.length === 0
    || uniqueOutputColumns.size !== settings.outputColumns.length
    || settings.outputColumns.some((column) => column.trim() === '')
  ) {
    throw new DataFixerError('INVALID_RULE', { ruleId: 'merge-output-columns' });
  }

  if (settings.sourceColumn && !uniqueOutputColumns.has(settings.sourceColumn)) {
    throw new DataFixerError('INVALID_RULE', { ruleId: 'merge-source-column', column: settings.sourceColumn });
  }

  if (settings.sourceColumn && settings.outputTypes?.[settings.sourceColumn] && settings.outputTypes[settings.sourceColumn] !== 'string') {
    throw new DataFixerError('INVALID_RULE', { ruleId: 'merge-source-column', column: settings.sourceColumn });
  }

  for (const [column, expected] of Object.entries(settings.outputTypes ?? {})) {
    if (!uniqueOutputColumns.has(column) || (expected !== 'string' && expected !== 'number' && expected !== 'boolean')) {
      throw new DataFixerError('INVALID_RULE', { ruleId: 'merge-output-types', column });
    }
  }

  for (const column of settings.dedupeColumns) {
    if (!uniqueOutputColumns.has(column)) {
      throw new DataFixerError('MISSING_COLUMN', { ruleId: 'merge-dedupe', column });
    }
  }

  for (const dataset of inputs) {
    for (const sourceId of dataset.sourceIds) {
      const mapping = settings.columnMapBySource[sourceId];
      if (!mapping) {
        throw new DataFixerError('INVALID_RULE', { ruleId: 'merge-mapping', sourceId });
      }

      const targets = new Set<string>();
      for (const [sourceColumn, targetColumn] of Object.entries(mapping)) {
        if (!dataset.columns.includes(sourceColumn)) {
          throw new DataFixerError('MISSING_COLUMN', { sourceId, column: sourceColumn });
        }
        if (!uniqueOutputColumns.has(targetColumn)) {
          throw new DataFixerError('INVALID_RULE', { ruleId: 'merge-mapping', sourceId, column: targetColumn });
        }
        if (settings.sourceColumn === targetColumn) {
          throw new DataFixerError('INVALID_RULE', { ruleId: 'merge-source-column', sourceId, column: targetColumn });
        }
        if (targets.has(targetColumn)) {
          throw new DataFixerError('INVALID_RULE', { ruleId: 'merge-mapping', sourceId, column: targetColumn });
        }
        targets.add(targetColumn);
      }
    }
  }
}

function strictNumber(value: string): number | null {
  if (!/^[+-]?(?:\d+(?:\.\d+)?|\.\d+)$/.test(value)) return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function coerceValue(value: CellValue, expected: ValueType | undefined): { ok: true; value: CellValue } | { ok: false } {
  if (value === null || expected === undefined) return { ok: true, value };
  if (expected === 'string') return typeof value === 'string' ? { ok: true, value } : { ok: false };
  if (expected === 'number') {
    if (typeof value === 'number' && Number.isFinite(value)) return { ok: true, value };
    if (typeof value === 'string') {
      const parsed = strictNumber(value);
      if (parsed !== null) return { ok: true, value: parsed };
    }
    return { ok: false };
  }
  if (typeof value === 'boolean') return { ok: true, value };
  if (value === 'true') return { ok: true, value: true };
  if (value === 'false') return { ok: true, value: false };
  return { ok: false };
}

function mappedValues(row: DataRow, settings: MergeSettings): Record<string, CellValue> {
  const values: Record<string, CellValue> = Object.fromEntries(
    settings.outputColumns.map((column) => [column, null]),
  );
  const mapping = settings.columnMapBySource[row.sourceId] ?? {};
  for (const [sourceColumn, targetColumn] of Object.entries(mapping)) {
    const raw = row.values[sourceColumn] ?? null;
    const coerced = coerceValue(raw, settings.outputTypes?.[targetColumn]);
    values[targetColumn] = coerced.ok ? coerced.value : raw;
  }
  if (settings.sourceColumn) values[settings.sourceColumn] = row.sourceId;
  return values;
}


function mappedRowChanged(inputRow: DataRow, mapped: Record<string, CellValue>): boolean {
  const inputKeys = Object.keys(inputRow.values);
  const mappedKeys = Object.keys(mapped);
  if (inputKeys.length !== mappedKeys.length) return true;
  for (let index = 0; index < inputKeys.length; index += 1) {
    const inputKey = inputKeys[index];
    const mappedKey = mappedKeys[index];
    if (inputKey !== mappedKey || inputRow.values[inputKey] !== mapped[mappedKey]) return true;
  }
  return false;
}

function mappedEvidence(row: DataRow): EvidenceEntry {
  return {
    rowId: row.rowId,
    ruleId: 'merge-map',
    status: 'CHANGED',
    reasonKey: 'merge.mapped',
    reasonParams: { sourceId: row.sourceId },
  };
}

function duplicateKey(row: DataRow, columns: string[]): string {
  return JSON.stringify(columns.map((column) => row.values[column]));
}

function duplicateEvidence(row: DataRow, columns: string[]): EvidenceEntry {
  return {
    rowId: row.rowId,
    ruleId: 'merge-dedupe',
    status: 'REMOVED',
    reasonKey: 'merge.duplicateRemoved',
    reasonParams: { columns: columns.join(',') },
  };
}

function valueType(value: Exclude<CellValue, null>): ValueType {
  return typeof value as ValueType;
}

function findTypeConflicts(inputs: Dataset[], settings: MergeSettings): Map<string, TypeConflict[]> {
  const inferred = new Map<string, ValueType>();
  const conflicts = new Map<string, TypeConflict[]>();

  for (const dataset of inputs) {
    for (const row of dataset.rows) {
      const mapping = settings.columnMapBySource[row.sourceId] ?? {};
      for (const [sourceColumn, targetColumn] of Object.entries(mapping)) {
        const value = row.values[sourceColumn] ?? null;
        if (value === null) continue;
        const actual = valueType(value);
        const explicitExpected = settings.outputTypes?.[targetColumn];
        if (explicitExpected) {
          if (!coerceValue(value, explicitExpected).ok) {
            const rowConflicts = conflicts.get(row.rowId) ?? [];
            rowConflicts.push({ column: targetColumn, value, expected: explicitExpected, actual });
            conflicts.set(row.rowId, rowConflicts);
          }
          continue;
        }
        const expected = inferred.get(targetColumn);
        if (!expected) {
          inferred.set(targetColumn, actual);
          continue;
        }
        if (expected !== actual) {
          const rowConflicts = conflicts.get(row.rowId) ?? [];
          rowConflicts.push({ column: targetColumn, value, expected, actual });
          conflicts.set(row.rowId, rowConflicts);
        }
      }
    }
  }

  return conflicts;
}

function conflictEvidence(row: DataRow, conflict: TypeConflict): EvidenceEntry {
  return {
    rowId: row.rowId,
    ruleId: 'merge-type',
    status: 'REJECTED',
    column: conflict.column,
    before: conflict.value,
    reasonKey: 'merge.typeConflict',
    reasonParams: { expectedType: conflict.expected, actualType: conflict.actual },
  };
}

export function mergeDatasets(inputs: Dataset[], settings: MergeSettings): EngineResult {
  preflightSettings(inputs, settings);
  const typeConflicts = findTypeConflicts(inputs, settings);
  const outputRows: DataRow[] = [];
  const removedRows: DataRow[] = [];
  const rejectedRows: DataRow[] = [];
  const evidence: EvidenceEntry[] = [];
  const seen = new Set<string>();

  for (const dataset of inputs) {
    for (const inputRow of dataset.rows) {
      const conflicts = typeConflicts.get(inputRow.rowId);
      if (conflicts?.length) {
        rejectedRows.push({ ...inputRow, values: { ...inputRow.values } });
        evidence.push(...conflicts.map((conflict) => conflictEvidence(inputRow, conflict)));
        continue;
      }

      const mapped = mappedValues(inputRow, settings);
      const row = { ...inputRow, values: mapped };
      if (mappedRowChanged(inputRow, mapped)) evidence.push(mappedEvidence(inputRow));
      if (settings.dedupeColumns.length > 0) {
        const key = duplicateKey(row, settings.dedupeColumns);
        if (seen.has(key)) {
          removedRows.push(row);
          evidence.push(duplicateEvidence(row, settings.dedupeColumns));
          continue;
        }
        seen.add(key);
      }
      outputRows.push(row);
    }
  }

  return {
    dataset: {
      columns: [...settings.outputColumns],
      rows: outputRows,
      sourceIds: inputs.flatMap((dataset) => dataset.sourceIds),
    },
    removedRows,
    rejectedRows,
    evidence,
  };
}
