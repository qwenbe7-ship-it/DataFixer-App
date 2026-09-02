import { DataFixerError } from '../domain/errors';
import type { CleanRule, DataRow, Dataset, EngineResult, EvidenceEntry } from '../domain/types';
import { applyCleanRule } from './clean';
import { isSafeRegexPattern } from './regex-safety';

function cloneRow(row: DataRow): DataRow {
  return { ...row, values: { ...row.values } };
}

function requireColumn(columns: string[], column: string, ruleId: string): void {
  if (!columns.includes(column)) {
    throw new DataFixerError('MISSING_COLUMN', { column, ruleId });
  }
}

function preflightColumns(inputColumns: string[], rules: CleanRule[]): string[] {
  let columns = [...inputColumns];
  const seenRuleIds = new Set<string>();

  for (const rule of rules) {
    if (!rule.id.trim() || seenRuleIds.has(rule.id)) {
      throw new DataFixerError('INVALID_RULE', { ruleId: rule.id });
    }
    seenRuleIds.add(rule.id);

    switch (rule.kind) {
      case 'renameColumn':
        requireColumn(columns, rule.from, rule.id);
        if (!rule.to.trim()) {
          throw new DataFixerError('INVALID_RULE', { ruleId: rule.id, column: rule.to });
        }
        if (rule.to !== rule.from && columns.includes(rule.to)) {
          throw new DataFixerError('INVALID_RULE', { ruleId: rule.id, column: rule.to });
        }
        columns = columns.map((column) => column === rule.from ? rule.to : column);
        break;
      case 'keepColumns':
        if (rule.columns.length === 0 || new Set(rule.columns).size !== rule.columns.length) {
          throw new DataFixerError('INVALID_RULE', { ruleId: rule.id });
        }
        for (const column of rule.columns) requireColumn(columns, column, rule.id);
        columns = [...rule.columns];
        break;
      case 'dedupe':
        if (new Set(rule.columns).size !== rule.columns.length) {
          throw new DataFixerError('INVALID_RULE', { ruleId: rule.id });
        }
        for (const column of rule.columns) requireColumn(columns, column, rule.id);
        break;
      case 'fillDefault':
        requireColumn(columns, rule.column, rule.id);
        if (rule.value === null || rule.value === '') {
          throw new DataFixerError('INVALID_RULE', { ruleId: rule.id, field: 'value' });
        }
        break;
      case 'coalesce':
        requireColumn(columns, rule.column, rule.id);
        if (rule.sourceColumns.length === 0 || new Set(rule.sourceColumns).size !== rule.sourceColumns.length) {
          throw new DataFixerError('INVALID_RULE', { ruleId: rule.id, field: 'sourceColumns' });
        }
        for (const column of rule.sourceColumns) requireColumn(columns, column, rule.id);
        break;
      case 'regexReplace':
        requireColumn(columns, rule.column, rule.id);
        if (rule.pattern === '' || !isSafeRegexPattern(rule.pattern)) {
          throw new DataFixerError('INVALID_RULE', { ruleId: rule.id, field: 'pattern' });
        }
        try {
          new RegExp(rule.pattern, `${rule.replaceAll ? 'g' : ''}${rule.caseInsensitive ? 'i' : ''}`);
        } catch {
          throw new DataFixerError('INVALID_RULE', { ruleId: rule.id, field: 'pattern' });
        }
        break;
      default:
        requireColumn(columns, rule.column, rule.id);
        break;
    }
  }

  return columns;
}

function duplicateKey(row: DataRow, columns: string[]): string {
  return JSON.stringify(columns.map((column) => row.values[column]));
}

function removedEvidence(row: DataRow, rule: Extract<CleanRule, { kind: 'dedupe' }>, columns: string[]): EvidenceEntry {
  return {
    rowId: row.rowId,
    ruleId: rule.id,
    status: 'REMOVED',
    reasonKey: 'clean.duplicateRemoved',
    reasonParams: { columns: columns.join(',') },
  };
}

export function applyRules(dataset: Dataset, rules: CleanRule[]): EngineResult {
  const finalColumns = preflightColumns(dataset.columns, rules);
  const dedupeSets = new Map<number, Set<string>>();
  const outputRows: DataRow[] = [];
  const removedRows: DataRow[] = [];
  const rejectedRows: DataRow[] = [];
  const evidence: EvidenceEntry[] = [];

  for (const inputRow of dataset.rows) {
    let current = cloneRow(inputRow);
    let removed = false;
    let rejected = false;

    for (let ruleIndex = 0; ruleIndex < rules.length; ruleIndex += 1) {
      const rule = rules[ruleIndex];

      if (rule.kind === 'dedupe') {
        const seen = dedupeSets.get(ruleIndex) ?? new Set<string>();
        dedupeSets.set(ruleIndex, seen);
        const dedupeColumns = rule.columns.length > 0 ? rule.columns : Object.keys(current.values);
        const key = duplicateKey(current, dedupeColumns);
        if (seen.has(key)) {
          evidence.push(removedEvidence(current, rule, dedupeColumns));
          removedRows.push(current);
          removed = true;
          break;
        }
        seen.add(key);
        continue;
      }

      const outcome = applyCleanRule(current, rule);
      current = outcome.row;
      evidence.push(...outcome.evidence);

      if (outcome.reject) {
        rejectedRows.push(current);
        rejected = true;
        break;
      }
      if (outcome.remove) {
        removedRows.push(current);
        removed = true;
        break;
      }
    }

    if (!removed && !rejected) outputRows.push(current);
  }

  return {
    dataset: {
      columns: finalColumns,
      rows: outputRows,
      sourceIds: [...dataset.sourceIds],
    },
    removedRows,
    rejectedRows,
    evidence,
  };
}
