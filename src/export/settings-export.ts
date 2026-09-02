import { DataFixerError } from '../domain/errors';
import type { CellValue, RuleSpec } from '../domain/types';
import { isCleanRuleKind, isValidationRuleKind } from '../domain/rule-kinds';
import { isSafeRegexPattern } from '../rules/regex-safety';

function invalid(details: Record<string, string | number> = {}): never {
  throw new DataFixerError('INVALID_RULE', details);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function canonicalize(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(canonicalize);
  if (!isRecord(value)) return value;
  return Object.fromEntries(Object.keys(value).sort().map((key) => [key, canonicalize(value[key])]));
}

function text(object: Record<string, unknown>, key: string): string {
  const value = object[key];
  if (typeof value !== 'string' || value.trim() === '') invalid({ field: key });
  return value;
}

function optionalNumber(object: Record<string, unknown>, key: string): number | undefined {
  const value = object[key];
  if (value === undefined) return undefined;
  if (typeof value !== 'number' || !Number.isFinite(value)) invalid({ field: key });
  return value;
}

function stringArray(object: Record<string, unknown>, key: string, allowEmpty: boolean): string[] {
  const value = object[key];
  if (!Array.isArray(value) || (!allowEmpty && value.length === 0)) invalid({ field: key });
  if (!value.every((entry) => typeof entry === 'string' && entry.trim() !== '')) invalid({ field: key });
  return value as string[];
}

function cellValueArray(object: Record<string, unknown>, key: string): CellValue[] {
  const value = object[key];
  if (!Array.isArray(value)) invalid({ field: key });
  for (const entry of value) {
    if (entry !== null && typeof entry !== 'string' && typeof entry !== 'number' && typeof entry !== 'boolean') invalid({ field: key });
    if (typeof entry === 'number' && !Number.isFinite(entry)) invalid({ field: key });
  }
  return value as CellValue[];
}

function exactKeys(object: Record<string, unknown>, allowed: string[]): void {
  const allowedSet = new Set(allowed);
  for (const key of Object.keys(object)) if (!allowedSet.has(key)) invalid({ field: key });
}

function base(object: Record<string, unknown>): { id: string; kind: string } {
  return { id: text(object, 'id'), kind: text(object, 'kind') };
}

function validateRule(value: unknown): RuleSpec {
  if (!isRecord(value)) invalid();
  const { id, kind } = base(value);

  if (isCleanRuleKind(kind)) {
    switch (kind) {
      case 'trim':
      case 'collapseSpaces':
        exactKeys(value, ['id','kind','column']);
        return { id, kind, column: text(value, 'column') } as RuleSpec;
      case 'normalizeEmpty':
        exactKeys(value, ['id','kind','column','emptyValues']);
        return { id, kind, column: text(value, 'column'), emptyValues: stringArray(value, 'emptyValues', true) } as RuleSpec;
      case 'changeCase': {
        exactKeys(value, ['id','kind','column','mode']);
        const mode = text(value, 'mode');
        if (!['upper','lower','title'].includes(mode)) invalid({ field: 'mode' });
        return { id, kind, column: text(value, 'column'), mode } as RuleSpec;
      }
      case 'parseDate': {
        exactKeys(value, ['id','kind','column','output']);
        const output = text(value, 'output');
        if (output !== 'YYYY-MM-DD') invalid({ field: 'output' });
        return { id, kind, column: text(value, 'column'), output } as RuleSpec;
      }
      case 'parseNumber': {
        exactKeys(value, ['id','kind','column','removeThousandsSeparator']);
        const removeThousandsSeparator = value.removeThousandsSeparator;
        if (typeof removeThousandsSeparator !== 'boolean') invalid({ field: 'removeThousandsSeparator' });
        return { id, kind, column: text(value, 'column'), removeThousandsSeparator } as RuleSpec;
      }
      case 'replace':
        exactKeys(value, ['id','kind','column','search','replacement']);
        if (typeof value.search !== 'string' || typeof value.replacement !== 'string') invalid({ field: 'search' });
        return { id, kind, column: text(value, 'column'), search: value.search, replacement: value.replacement } as RuleSpec;
      case 'regexReplace': {
        exactKeys(value, ['id','kind','column','pattern','replacement','replaceAll','caseInsensitive']);
        if (typeof value.pattern !== 'string' || !isSafeRegexPattern(value.pattern)) invalid({ field: 'pattern' });
        if (typeof value.replacement !== 'string') invalid({ field: 'replacement' });
        if (typeof value.replaceAll !== 'boolean') invalid({ field: 'replaceAll' });
        if (typeof value.caseInsensitive !== 'boolean') invalid({ field: 'caseInsensitive' });
        try { new RegExp(value.pattern, `${value.replaceAll ? 'g' : ''}${value.caseInsensitive ? 'i' : ''}`); } catch { invalid({ field: 'pattern' }); }
        return { id, kind, column: text(value, 'column'), pattern: value.pattern, replacement: value.replacement, replaceAll: value.replaceAll, caseInsensitive: value.caseInsensitive } as RuleSpec;
      }
      case 'fillDefault': {
        exactKeys(value, ['id','kind','column','value']);
        const defaultValue = value.value;
        if (defaultValue === null || defaultValue === '' || (typeof defaultValue !== 'string' && typeof defaultValue !== 'number' && typeof defaultValue !== 'boolean')) invalid({ field: 'value' });
        if (typeof defaultValue === 'number' && !Number.isFinite(defaultValue)) invalid({ field: 'value' });
        return { id, kind, column: text(value, 'column'), value: defaultValue } as RuleSpec;
      }
      case 'coalesce': {
        exactKeys(value, ['id','kind','column','sourceColumns']);
        const sourceColumns = stringArray(value, 'sourceColumns', false);
        if (new Set(sourceColumns).size !== sourceColumns.length) invalid({ field: 'sourceColumns' });
        return { id, kind, column: text(value, 'column'), sourceColumns } as RuleSpec;
      }
      case 'renameColumn':
        exactKeys(value, ['id','kind','from','to']);
        return { id, kind, from: text(value, 'from'), to: text(value, 'to') } as RuleSpec;
      case 'keepColumns':
      case 'dedupe':
        exactKeys(value, ['id','kind','columns']);
        return { id, kind, columns: stringArray(value, 'columns', kind === 'dedupe') } as RuleSpec;
    }
  }

  if (isValidationRuleKind(kind)) {
    switch (kind) {
      case 'required':
        exactKeys(value, ['id','kind','column']);
        return { id, kind, column: text(value, 'column') } as RuleSpec;
      case 'type': {
        exactKeys(value, ['id','kind','column','expected']);
        const expected = text(value, 'expected');
        if (!['string','integer','number','date'].includes(expected)) invalid({ field: 'expected' });
        return { id, kind, column: text(value, 'column'), expected } as RuleSpec;
      }
      case 'unique':
        exactKeys(value, ['id','kind','columns']);
        return { id, kind, columns: stringArray(value, 'columns', false) } as RuleSpec;
      case 'allowed': {
        exactKeys(value, ['id','kind','column','values']);
        const values = cellValueArray(value, 'values');
        if (values.length === 0) invalid({ field: 'values' });
        return { id, kind, column: text(value, 'column'), values } as RuleSpec;
      }
      case 'numberRange': {
        exactKeys(value, ['id','kind','column','min','max']);
        const min = optionalNumber(value, 'min');
        const max = optionalNumber(value, 'max');
        if (min === undefined && max === undefined) invalid({ field: 'range' });
        if (min !== undefined && max !== undefined && min > max) invalid({ field: 'range' });
        return { id, kind, column: text(value, 'column'), ...(min === undefined ? {} : { min }), ...(max === undefined ? {} : { max }) } as RuleSpec;
      }
      case 'length': {
        exactKeys(value, ['id','kind','column','min','max']);
        const min = optionalNumber(value, 'min');
        const max = optionalNumber(value, 'max');
        if ((min !== undefined && (!Number.isInteger(min) || min < 0)) || (max !== undefined && (!Number.isInteger(max) || max < 0))) invalid({ field: 'length' });
        if (min === undefined && max === undefined) invalid({ field: 'length' });
        if (min !== undefined && max !== undefined && min > max) invalid({ field: 'length' });
        return { id, kind, column: text(value, 'column'), ...(min === undefined ? {} : { min }), ...(max === undefined ? {} : { max }) } as RuleSpec;
      }
      case 'regex': {
        exactKeys(value, ['id','kind','column','pattern']);
        const pattern = text(value, 'pattern');
        if (!isSafeRegexPattern(pattern)) invalid({ field: 'pattern' });
        try { new RegExp(pattern); } catch { invalid({ field: 'pattern' }); }
        return { id, kind, column: text(value, 'column'), pattern } as RuleSpec;
      }
      case 'columnCompare': {
        exactKeys(value, ['id','kind','left','operator','right']);
        const operator = text(value, 'operator');
        if (!['eq','lt','lte','gt','gte'].includes(operator)) invalid({ field: 'operator' });
        return { id, kind, left: text(value, 'left'), operator, right: text(value, 'right') } as RuleSpec;
      }
    }
  }

  invalid({ kind });
}

export function serializeSettings(settings: RuleSpec[]): string {
  return `${JSON.stringify(canonicalize(settings), null, 2)}\n`;
}

export function parseSettings(json: string): RuleSpec[] {
  let parsed: unknown;
  try { parsed = JSON.parse(json); } catch { invalid({ field: 'json' }); }
  if (!Array.isArray(parsed)) invalid({ field: 'root' });
  const rules = parsed.map(validateRule);
  const seen = new Set<string>();
  for (const rule of rules) {
    if (seen.has(rule.id)) invalid({ field: 'id' });
    seen.add(rule.id);
  }
  return rules;
}
