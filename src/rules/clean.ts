import type { CellValue, CleanRule, DataRow, EvidenceEntry, RuleOutcome } from '../domain/types';

function cloneRow(row: DataRow): DataRow {
  return { ...row, values: { ...row.values } };
}

function unchangedOutcome(row: DataRow): RuleOutcome {
  return { row: cloneRow(row), evidence: [], remove: false, reject: false };
}

function changedOutcome(
  row: DataRow,
  rule: Extract<CleanRule, { column: string }>,
  before: CellValue,
  after: CellValue,
  reasonKey: string,
): RuleOutcome {
  const next = cloneRow(row);
  next.values[rule.column] = after;
  const evidence: EvidenceEntry = {
    rowId: row.rowId,
    ruleId: rule.id,
    status: 'CHANGED',
    column: rule.column,
    before,
    after,
    reasonKey,
    reasonParams: {},
  };
  return { row: next, evidence: [evidence], remove: false, reject: false };
}


function rejectedOutcome(
  row: DataRow,
  rule: Extract<CleanRule, { column: string }>,
  reasonKey: string,
): RuleOutcome {
  const value = row.values[rule.column];
  return {
    row: cloneRow(row),
    evidence: [{
      rowId: row.rowId,
      ruleId: rule.id,
      status: 'REJECTED',
      column: rule.column,
      before: value,
      after: value,
      reasonKey,
      reasonParams: {},
    }],
    remove: false,
    reject: true,
  };
}

export function applyCleanRule(row: DataRow, rule: CleanRule): RuleOutcome {
  if (rule.kind === 'keepColumns') {
    const next = cloneRow(row);
    const kept: Record<string, CellValue> = {};
    for (const column of rule.columns) {
      if (column in next.values) kept[column] = next.values[column];
    }
    if (Object.keys(kept).length === Object.keys(next.values).length && Object.keys(kept).every((key, index) => key === Object.keys(next.values)[index])) {
      return unchangedOutcome(row);
    }
    next.values = kept;
    return {
      row: next,
      evidence: [{
        rowId: row.rowId,
        ruleId: rule.id,
        status: 'CHANGED',
        reasonKey: 'clean.columnsFiltered',
        reasonParams: { kept: rule.columns.length },
      }],
      remove: false,
      reject: false,
    };
  }

  if (rule.kind === 'renameColumn') {
    if (!(rule.from in row.values) || rule.from === rule.to) return unchangedOutcome(row);
    const next = cloneRow(row);
    const renamed: Record<string, CellValue> = {};
    for (const [key, value] of Object.entries(next.values)) {
      renamed[key === rule.from ? rule.to : key] = value;
    }
    next.values = renamed;
    return {
      row: next,
      evidence: [{
        rowId: row.rowId,
        ruleId: rule.id,
        status: 'CHANGED',
        column: rule.from,
        before: row.values[rule.from],
        after: row.values[rule.from],
        reasonKey: 'clean.columnRenamed',
        reasonParams: { from: rule.from, to: rule.to },
      }],
      remove: false,
      reject: false,
    };
  }

  if (rule.kind === 'replace') {
    const value = row.values[rule.column];
    if (typeof value !== 'string' || rule.search === '') return unchangedOutcome(row);
    const next = value.split(rule.search).join(rule.replacement);
    return next === value ? unchangedOutcome(row) : changedOutcome(row, rule, value, next, 'clean.replaced');
  }

  if (rule.kind === 'regexReplace') {
    const value = row.values[rule.column];
    if (typeof value !== 'string') return unchangedOutcome(row);
    const flags = `${rule.replaceAll ? 'g' : ''}${rule.caseInsensitive ? 'i' : ''}`;
    const next = value.replace(new RegExp(rule.pattern, flags), rule.replacement);
    return next === value ? unchangedOutcome(row) : changedOutcome(row, rule, value, next, 'clean.regexReplaced');
  }

  if (rule.kind === 'fillDefault') {
    const value = row.values[rule.column];
    if (value !== null) return unchangedOutcome(row);
    return changedOutcome(row, rule, value, rule.value, 'clean.defaultFilled');
  }

  if (rule.kind === 'coalesce') {
    const value = row.values[rule.column];
    if (value !== null) return unchangedOutcome(row);
    for (const sourceColumn of rule.sourceColumns) {
      const candidate = row.values[sourceColumn];
      if (candidate === null) continue;
      const outcome = changedOutcome(row, rule, value, candidate, 'clean.coalesced');
      outcome.evidence[0].reasonParams = { sourceColumn };
      return outcome;
    }
    return unchangedOutcome(row);
  }

  if (rule.kind === 'parseDate') {
    const value = row.values[rule.column];
    if (value === null) return unchangedOutcome(row);
    if (typeof value === 'number') {
      if (!Number.isFinite(value) || value <= 0 || value > 2_958_465) return rejectedOutcome(row, rule, 'clean.invalidDate');
      const serial = Math.floor(value);
      if (serial === 60) return rejectedOutcome(row, rule, 'clean.invalidDate');
      const dayMs = 24 * 60 * 60 * 1000;
      let timestamp = Date.UTC(1899, 11, 30) + serial * dayMs;
      if (serial < 60) timestamp += dayMs;
      const date = new Date(timestamp);
      const next = `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, '0')}-${String(date.getUTCDate()).padStart(2, '0')}`;
      return changedOutcome(row, rule, value, next, 'clean.dateParsed');
    }
    if (typeof value !== 'string') return rejectedOutcome(row, rule, 'clean.invalidDate');
    const match = /^(\d{4})[-/](\d{1,2})[-/](\d{1,2})$/.exec(value);
    if (!match) return rejectedOutcome(row, rule, 'clean.invalidDate');
    const year = Number(match[1]);
    const month = Number(match[2]);
    const day = Number(match[3]);
    const date = new Date(Date.UTC(year, month - 1, day));
    if (date.getUTCFullYear() !== year || date.getUTCMonth() !== month - 1 || date.getUTCDate() !== day) {
      return rejectedOutcome(row, rule, 'clean.invalidDate');
    }
    const next = `${String(year).padStart(4, '0')}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    return next === value ? unchangedOutcome(row) : changedOutcome(row, rule, value, next, 'clean.dateParsed');
  }

  if (rule.kind === 'parseNumber') {
    const value = row.values[rule.column];
    if (value === null || typeof value === 'number') return unchangedOutcome(row);
    if (typeof value !== 'string') return rejectedOutcome(row, rule, 'clean.invalidNumber');
    if (rule.removeThousandsSeparator && value.includes(',') && !/^[+-]?\d{1,3}(?:,\d{3})+(?:\.\d+)?$/.test(value)) {
      return rejectedOutcome(row, rule, 'clean.invalidNumber');
    }
    const candidate = rule.removeThousandsSeparator ? value.replace(/,/g, '') : value;
    if (!/^[+-]?(?:\d+(?:\.\d+)?|\.\d+)$/.test(candidate)) {
      return rejectedOutcome(row, rule, 'clean.invalidNumber');
    }
    const parsed = Number(candidate);
    if (!Number.isFinite(parsed)) return rejectedOutcome(row, rule, 'clean.invalidNumber');
    return changedOutcome(row, rule, value, parsed, 'clean.numberParsed');
  }

  if (rule.kind === 'changeCase') {
    const value = row.values[rule.column];
    if (typeof value !== 'string') return unchangedOutcome(row);
    const next = rule.mode === 'upper'
      ? value.toUpperCase()
      : rule.mode === 'lower'
        ? value.toLowerCase()
        : value.toLowerCase().replace(/(^|\s)(\S)/g, (_match, prefix: string, char: string) => `${prefix}${char.toUpperCase()}`);
    return next === value ? unchangedOutcome(row) : changedOutcome(row, rule, value, next, 'clean.caseChanged');
  }

  if (rule.kind === 'normalizeEmpty') {
    const value = row.values[rule.column];
    if (typeof value !== 'string' || !rule.emptyValues.includes(value)) return unchangedOutcome(row);
    return changedOutcome(row, rule, value, null, 'clean.emptyNormalized');
  }

  if (rule.kind === 'trim' || rule.kind === 'collapseSpaces') {
    const value = row.values[rule.column];
    if (typeof value !== 'string') return unchangedOutcome(row);
    const next = rule.kind === 'trim' ? value.trim() : value.replace(/\s+/g, ' ');
    const reasonKey = rule.kind === 'trim' ? 'clean.trimmed' : 'clean.spacesCollapsed';
    return next === value ? unchangedOutcome(row) : changedOutcome(row, rule, value, next, reasonKey);
  }
  return unchangedOutcome(row);
}
