export const CLEAN_RULE_KINDS = [
  'trim',
  'collapseSpaces',
  'normalizeEmpty',
  'changeCase',
  'parseDate',
  'parseNumber',
  'replace',
  'regexReplace',
  'fillDefault',
  'coalesce',
  'renameColumn',
  'keepColumns',
  'dedupe',
] as const;

export const VALIDATION_RULE_KINDS = [
  'required',
  'type',
  'unique',
  'allowed',
  'numberRange',
  'length',
  'regex',
  'columnCompare',
] as const;

export type CleanRuleKind = (typeof CLEAN_RULE_KINDS)[number];
export type ValidationRuleKind = (typeof VALIDATION_RULE_KINDS)[number];

export function isCleanRuleKind(kind: string): kind is CleanRuleKind {
  return (CLEAN_RULE_KINDS as readonly string[]).includes(kind);
}

export function isValidationRuleKind(kind: string): kind is ValidationRuleKind {
  return (VALIDATION_RULE_KINDS as readonly string[]).includes(kind);
}
