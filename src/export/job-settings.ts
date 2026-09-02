import { DataFixerError } from '../domain/errors';
import type { LookupSettings, MergeSettings, MergeValueType, RuleSpec } from '../domain/types';
import { isCleanRuleKind, isValidationRuleKind } from '../domain/rule-kinds';
import { parseSettings } from './settings-export';

export type JobSettingsMode = 'clean' | 'merge' | 'lookup' | 'validate';

export interface JobSettingsFile {
  version: 1;
  mode: JobSettingsMode;
  rules: RuleSpec[];
  mergeSettings: MergeSettings | null;
  lookupSettings?: LookupSettings | null;
}

function invalid(field: string): never {
  throw new DataFixerError('INVALID_RULE', { field });
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function exactKeys(value: Record<string, unknown>, allowed: string[]): void {
  const allowedSet = new Set(allowed);
  for (const key of Object.keys(value)) if (!allowedSet.has(key)) invalid(key);
}

function stringArray(value: unknown, field: string, allowEmpty: boolean): string[] {
  if (!Array.isArray(value) || (!allowEmpty && value.length === 0)) invalid(field);
  if (!value.every((entry) => typeof entry === 'string' && entry.trim() !== '')) invalid(field);
  const result = value as string[];
  if (new Set(result).size !== result.length) invalid(field);
  return [...result];
}

function parseMergeSettings(value: unknown): MergeSettings {
  if (!isRecord(value)) invalid('mergeSettings');
  exactKeys(value, ['columnMapBySource', 'outputColumns', 'outputTypes', 'sourceColumn', 'dedupeColumns']);

  const outputColumns = stringArray(value.outputColumns, 'outputColumns', false);
  const dedupeColumns = stringArray(value.dedupeColumns, 'dedupeColumns', true);
  const outputTypes: Partial<Record<string, MergeValueType>> = {};
  if (value.outputTypes !== undefined) {
    if (!isRecord(value.outputTypes)) invalid('outputTypes');
    for (const [column, expected] of Object.entries(value.outputTypes)) {
      if (!outputColumns.includes(column) || (expected !== 'string' && expected !== 'number' && expected !== 'boolean')) invalid('outputTypes');
      outputTypes[column] = expected;
    }
  }
  const sourceColumn = value.sourceColumn;
  if (sourceColumn !== undefined && (typeof sourceColumn !== 'string' || sourceColumn.trim() === '')) invalid('sourceColumn');
  if (typeof sourceColumn === 'string' && !outputColumns.includes(sourceColumn)) invalid('sourceColumn');
  for (const column of dedupeColumns) if (!outputColumns.includes(column)) invalid('dedupeColumns');

  if (!isRecord(value.columnMapBySource)) invalid('columnMapBySource');
  const columnMapBySource: Record<string, Record<string, string>> = {};
  for (const [sourceId, rawMap] of Object.entries(value.columnMapBySource)) {
    if (!sourceId.trim() || !isRecord(rawMap)) invalid('columnMapBySource');
    const mapping: Record<string, string> = {};
    const targets = new Set<string>();
    for (const [sourceColumn, target] of Object.entries(rawMap)) {
      if (!sourceColumn.trim() || typeof target !== 'string' || !target.trim()) invalid('columnMapBySource');
      if (!outputColumns.includes(target)) invalid('columnMapBySource');
      if (targets.has(target)) invalid('columnMapBySource');
      targets.add(target);
      mapping[sourceColumn] = target;
    }
    columnMapBySource[sourceId] = mapping;
  }

  if (typeof sourceColumn === 'string') {
    for (const mapping of Object.values(columnMapBySource)) {
      if (Object.values(mapping).includes(sourceColumn)) invalid('sourceColumn');
    }
  }

  return {
    columnMapBySource,
    outputColumns,
    ...(Object.keys(outputTypes).length > 0 ? { outputTypes } : {}),
    ...(typeof sourceColumn === 'string' ? { sourceColumn } : {}),
    dedupeColumns,
  };
}



function parseLookupSettings(value: unknown): LookupSettings {
  if (!isRecord(value)) invalid('lookupSettings');
  exactKeys(value, ['leftKeyColumns', 'rightKeyColumns', 'rightValueMap']);
  const leftKeyColumns = stringArray(value.leftKeyColumns, 'leftKeyColumns', false);
  const rightKeyColumns = stringArray(value.rightKeyColumns, 'rightKeyColumns', false);
  if (leftKeyColumns.length !== rightKeyColumns.length) invalid('rightKeyColumns');
  if (!isRecord(value.rightValueMap) || Object.keys(value.rightValueMap).length === 0) invalid('rightValueMap');
  const rightValueMap: Record<string, string> = {};
  const targets = new Set<string>();
  for (const [sourceColumn, target] of Object.entries(value.rightValueMap)) {
    if (!sourceColumn.trim() || typeof target !== 'string' || !target.trim() || targets.has(target)) invalid('rightValueMap');
    targets.add(target);
    rightValueMap[sourceColumn] = target;
  }
  return { leftKeyColumns, rightKeyColumns, rightValueMap };
}

function canonicalize(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(canonicalize);
  if (!isRecord(value)) return value;
  return Object.fromEntries(Object.keys(value).sort().map((key) => [key, canonicalize(value[key])]));
}

export function serializeJobSettings(settings: JobSettingsFile): string {
  return `${JSON.stringify(canonicalize(settings), null, 2)}\n`;
}

export function parseJobSettings(json: string): JobSettingsFile {
  let raw: unknown;
  try { raw = JSON.parse(json); } catch { invalid('json'); }
  if (!isRecord(raw)) invalid('root');
  exactKeys(raw, ['version', 'mode', 'rules', 'mergeSettings', 'lookupSettings']);
  if (raw.version !== 1) invalid('version');
  if (raw.mode !== 'clean' && raw.mode !== 'merge' && raw.mode !== 'lookup' && raw.mode !== 'validate') invalid('mode');
  const rules = parseSettings(JSON.stringify(raw.rules));

  if (raw.mode === 'merge') {
    if (rules.length !== 0 || (raw.lookupSettings !== undefined && raw.lookupSettings !== null)) invalid('rules');
    return { version: 1, mode: 'merge', rules: [], mergeSettings: parseMergeSettings(raw.mergeSettings), lookupSettings: null };
  }
  if (raw.mode === 'lookup') {
    if (rules.length !== 0 || raw.mergeSettings !== null) invalid('rules');
    return { version: 1, mode: 'lookup', rules: [], mergeSettings: null, lookupSettings: parseLookupSettings(raw.lookupSettings) };
  }
  if (raw.mergeSettings !== null) invalid('mergeSettings');
  if (raw.lookupSettings !== undefined && raw.lookupSettings !== null) invalid('lookupSettings');
  const wrongKind = raw.mode === 'clean'
    ? rules.some((rule) => !isCleanRuleKind(rule.kind))
    : rules.some((rule) => !isValidationRuleKind(rule.kind));
  if (wrongKind) invalid('rules');
  return { version: 1, mode: raw.mode, rules, mergeSettings: null, lookupSettings: null };
}
