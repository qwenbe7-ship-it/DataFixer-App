import { DataFixerError } from '../domain/errors';
import type {
  CellValue,
  DataRow,
  Dataset,
  EngineResult,
  EvidenceEntry,
  ValidationRule,
} from '../domain/types';
import { isSafeRegexPattern } from './regex-safety';

interface ValidationContext {
  regexByRule: Map<ValidationRule, RegExp>;
  uniqueCountsByRule: Map<ValidationRule, Map<string, number>>;
}

function cloneRow(row: DataRow): DataRow {
  return { ...row, values: { ...row.values } };
}

function assertColumn(dataset: Dataset, column: string, ruleId: string): void {
  if (!dataset.columns.includes(column)) {
    throw new DataFixerError('MISSING_COLUMN', { ruleId, column });
  }
}

function assertFiniteBound(value: number | undefined, ruleId: string): void {
  if (value !== undefined && !Number.isFinite(value)) {
    throw new DataFixerError('INVALID_RULE', { ruleId });
  }
}

function preflight(dataset: Dataset, rules: ValidationRule[]): ValidationContext {
  const regexByRule = new Map<ValidationRule, RegExp>();
  const uniqueCountsByRule = new Map<ValidationRule, Map<string, number>>();
  const seenRuleIds = new Set<string>();

  for (const rule of rules) {
    if (!rule.id.trim() || seenRuleIds.has(rule.id)) {
      throw new DataFixerError('INVALID_RULE', { ruleId: rule.id });
    }
    seenRuleIds.add(rule.id);

    if (rule.kind === 'unique') {
      if (rule.columns.length === 0) throw new DataFixerError('INVALID_RULE', { ruleId: rule.id });
      for (const column of rule.columns) assertColumn(dataset, column, rule.id);
      const counts = new Map<string, number>();
      for (const row of dataset.rows) {
        const key = uniqueKey(row, rule.columns);
        counts.set(key, (counts.get(key) ?? 0) + 1);
      }
      uniqueCountsByRule.set(rule, counts);
      continue;
    }

    if (rule.kind === 'columnCompare') {
      assertColumn(dataset, rule.left, rule.id);
      assertColumn(dataset, rule.right, rule.id);
      continue;
    }

    assertColumn(dataset, rule.column, rule.id);

    if (rule.kind === 'allowed' && rule.values.length === 0) {
      throw new DataFixerError('INVALID_RULE', { ruleId: rule.id });
    }

    if (rule.kind === 'regex') {
      if (!isSafeRegexPattern(rule.pattern)) throw new DataFixerError('INVALID_RULE', { ruleId: rule.id });
      try {
        regexByRule.set(rule, new RegExp(rule.pattern));
      } catch {
        throw new DataFixerError('INVALID_RULE', { ruleId: rule.id });
      }
    }

    if (rule.kind === 'numberRange') {
      assertFiniteBound(rule.min, rule.id);
      assertFiniteBound(rule.max, rule.id);
      if (rule.min === undefined && rule.max === undefined) {
        throw new DataFixerError('INVALID_RULE', { ruleId: rule.id });
      }
      if (rule.min !== undefined && rule.max !== undefined && rule.min > rule.max) {
        throw new DataFixerError('INVALID_RULE', { ruleId: rule.id });
      }
    }

    if (rule.kind === 'length') {
      if (rule.min === undefined && rule.max === undefined) {
        throw new DataFixerError('INVALID_RULE', { ruleId: rule.id });
      }
      for (const bound of [rule.min, rule.max]) {
        if (bound !== undefined && (!Number.isInteger(bound) || bound < 0)) {
          throw new DataFixerError('INVALID_RULE', { ruleId: rule.id });
        }
      }
      if (rule.min !== undefined && rule.max !== undefined && rule.min > rule.max) {
        throw new DataFixerError('INVALID_RULE', { ruleId: rule.id });
      }
    }
  }

  return { regexByRule, uniqueCountsByRule };
}

function uniqueValue(value: CellValue): string {
  if (value === null) return 'null:null';
  return `${typeof value}:${JSON.stringify(value)}`;
}

function uniqueKey(row: DataRow, columns: string[]): string {
  return columns.map((column) => uniqueValue(row.values[column] ?? null)).join('|');
}

function isValidDate(value: CellValue): boolean {
  if (typeof value === 'number') {
    if (!Number.isFinite(value) || value <= 0 || value > 2_958_465) return false;
    return Math.floor(value) !== 60;
  }
  if (typeof value !== 'string') return false;
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!match) return false;
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const date = new Date(Date.UTC(year, month - 1, day));
  return date.getUTCFullYear() === year
    && date.getUTCMonth() === month - 1
    && date.getUTCDate() === day;
}

function strictNumericValue(value: CellValue): number | null {
  if (typeof value === 'number') return Number.isFinite(value) ? value : null;
  if (typeof value !== 'string' || !/^[+-]?(?:\d+(?:\.\d+)?|\.\d+)$/.test(value)) return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function passesType(value: CellValue, expected: Extract<ValidationRule, { kind: 'type' }>['expected']): boolean {
  switch (expected) {
    case 'string': return typeof value === 'string';
    case 'integer': {
      const numeric = strictNumericValue(value);
      return numeric !== null && Number.isInteger(numeric);
    }
    case 'number': return strictNumericValue(value) !== null;
    case 'date': return isValidDate(value);
  }
}

function comparableOrder(left: CellValue, right: CellValue): number | null {
  if (typeof left === 'number' && Number.isFinite(left) && typeof right === 'number' && Number.isFinite(right)) {
    return left < right ? -1 : left > right ? 1 : 0;
  }
  if (typeof left === 'string' && typeof right === 'string') {
    return left < right ? -1 : left > right ? 1 : 0;
  }
  return null;
}

function compareColumns(left: CellValue, operator: Extract<ValidationRule, { kind: 'columnCompare' }>['operator'], right: CellValue): boolean {
  if (operator === 'eq') return left === right;
  const order = comparableOrder(left, right);
  if (order === null) return false;
  if (operator === 'lt') return order < 0;
  if (operator === 'lte') return order <= 0;
  if (operator === 'gt') return order > 0;
  return order >= 0;
}

function failureEvidence(
  row: DataRow,
  rule: ValidationRule,
  context: ValidationContext,
): EvidenceEntry | null {
  if (rule.kind === 'required') {
    const value = row.values[rule.column] ?? null;
    const missing = value === null || (typeof value === 'string' && value.trim() === '');
    return missing ? {
      rowId: row.rowId, ruleId: rule.id, status: 'REJECTED', column: rule.column,
      before: value, reasonKey: 'validate.required', reasonParams: {},
    } : null;
  }

  if (rule.kind === 'type') {
    const value = row.values[rule.column] ?? null;
    return passesType(value, rule.expected) ? null : {
      rowId: row.rowId, ruleId: rule.id, status: 'REJECTED', column: rule.column,
      before: value, reasonKey: 'validate.type', reasonParams: { expected: rule.expected },
    };
  }

  if (rule.kind === 'unique') {
    const key = uniqueKey(row, rule.columns);
    const duplicate = (context.uniqueCountsByRule.get(rule)?.get(key) ?? 0) > 1;
    return duplicate ? {
      rowId: row.rowId, ruleId: rule.id, status: 'REJECTED',
      reasonKey: 'validate.unique',
      reasonParams: {
        columns: rule.columns.join(','),
        values: JSON.stringify(rule.columns.map((column) => row.values[column] ?? null)),
      },
    } : null;
  }

  if (rule.kind === 'allowed') {
    const value = row.values[rule.column] ?? null;
    const allowed = rule.values.some((candidate) => candidate === value);
    return allowed ? null : {
      rowId: row.rowId, ruleId: rule.id, status: 'REJECTED', column: rule.column,
      before: value, reasonKey: 'validate.allowed', reasonParams: { allowedCount: rule.values.length },
    };
  }

  if (rule.kind === 'numberRange') {
    const value = row.values[rule.column] ?? null;
    const numeric = strictNumericValue(value);
    const inRange = numeric !== null
      && (rule.min === undefined || numeric >= rule.min)
      && (rule.max === undefined || numeric <= rule.max);
    if (inRange) return null;
    const reasonParams: Record<string, string | number> = {};
    if (rule.min !== undefined) reasonParams.min = rule.min;
    if (rule.max !== undefined) reasonParams.max = rule.max;
    return {
      rowId: row.rowId, ruleId: rule.id, status: 'REJECTED', column: rule.column,
      before: value, reasonKey: 'validate.numberRange', reasonParams,
    };
  }

  if (rule.kind === 'length') {
    const value = row.values[rule.column] ?? null;
    const length = typeof value === 'string' ? Array.from(value).length : null;
    const valid = length !== null
      && (rule.min === undefined || length >= rule.min)
      && (rule.max === undefined || length <= rule.max);
    if (valid) return null;
    const reasonParams: Record<string, string | number> = {};
    if (rule.min !== undefined) reasonParams.min = rule.min;
    if (rule.max !== undefined) reasonParams.max = rule.max;
    return {
      rowId: row.rowId, ruleId: rule.id, status: 'REJECTED', column: rule.column,
      before: value, reasonKey: 'validate.length', reasonParams,
    };
  }

  if (rule.kind === 'regex') {
    const value = row.values[rule.column] ?? null;
    const regex = context.regexByRule.get(rule);
    const matches = typeof value === 'string' && regex !== undefined && regex.test(value);
    return matches ? null : {
      rowId: row.rowId, ruleId: rule.id, status: 'REJECTED', column: rule.column,
      before: value, reasonKey: 'validate.regex', reasonParams: { pattern: rule.pattern },
    };
  }

  const left = row.values[rule.left] ?? null;
  const right = row.values[rule.right] ?? null;
  return compareColumns(left, rule.operator, right) ? null : {
    rowId: row.rowId, ruleId: rule.id, status: 'REJECTED', column: rule.left,
    before: left, reasonKey: 'validate.columnCompare',
    reasonParams: { operator: rule.operator, rightColumn: rule.right },
  };
}

export function validateDataset(dataset: Dataset, rules: ValidationRule[]): EngineResult {
  const context = preflight(dataset, rules);
  const passingRows: DataRow[] = [];
  const rejectedRows: DataRow[] = [];
  const evidence: EvidenceEntry[] = [];

  for (const row of dataset.rows) {
    const rowEvidence: EvidenceEntry[] = [];
    for (const rule of rules) {
      const failure = failureEvidence(row, rule, context);
      if (failure) rowEvidence.push(failure);
    }

    const cloned = cloneRow(row);
    if (rowEvidence.length > 0) {
      rejectedRows.push(cloned);
      evidence.push(...rowEvidence);
    } else {
      passingRows.push(cloned);
    }
  }

  return {
    dataset: { columns: [...dataset.columns], rows: passingRows, sourceIds: [...dataset.sourceIds] },
    removedRows: [],
    rejectedRows,
    evidence,
  };
}
