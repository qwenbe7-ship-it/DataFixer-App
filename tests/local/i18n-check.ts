import { en } from '../../src/i18n/en';
import { ko } from '../../src/i18n/ko';
import { createTranslator } from '../../src/i18n';

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message);
}

function params(template: string): string[] {
  return [...template.matchAll(/\{([A-Za-z0-9_]+)\}/g)].map((match) => match[1]).sort();
}

const koKeys = Object.keys(ko).sort();
const enKeys = Object.keys(en).sort();
assert(JSON.stringify(koKeys) === JSON.stringify(enKeys), 'Korean and English dictionary keys must match');
for (const key of koKeys) {
  assert(JSON.stringify(params(ko[key as keyof typeof ko])) === JSON.stringify(params(en[key as keyof typeof en])), `interpolation mismatch: ${key}`);
}

const required = [
  'error.EMPTY_FILE','error.UNSUPPORTED_FILE','error.FILE_TOO_LARGE','error.JOB_TOO_LARGE','error.TOO_MANY_FILES',
  'error.DUPLICATE_SOURCE_NAME','error.MISSING_COLUMN','error.INVALID_RULE','error.PARSE_FAILED','error.EXPORT_FAILED','error.RECONCILIATION_FAILED',
  'reason.clean.trimmed','reason.clean.spacesCollapsed','reason.clean.emptyNormalized','reason.clean.caseChanged','reason.clean.dateParsed',
  'reason.clean.invalidDate','reason.clean.numberParsed','reason.clean.invalidNumber','reason.clean.replaced','reason.clean.regexReplaced','reason.clean.defaultFilled','reason.clean.coalesced','reason.clean.columnRenamed','reason.clean.columnsFiltered','reason.clean.duplicateRemoved',
  'reason.merge.mapped','reason.merge.duplicateRemoved','reason.merge.typeConflict',
  'mode.lookup.title','mode.lookup.description','lookup.heading','lookup.leftKeyColumns','lookup.rightKeyColumns','lookup.valueMap','lookup.baseFile','lookup.referenceFile','lookup.fileOrderHelp',
  'reason.lookup.valueAdded','reason.lookup.notFound','reason.lookup.multipleMatches',
  'reason.validate.required','reason.validate.type','reason.validate.unique','reason.validate.allowed',
  'reason.validate.numberRange','reason.validate.length','reason.validate.regex','reason.validate.columnCompare',
  'rule.regexReplace','rule.fillDefault','rule.coalesce','rules.defaultValue','rules.sourceColumns','rules.replaceAll','rules.caseInsensitive','privacy.localOnly','action.chooseFiles','action.runPreview','action.processAll','result.reconciled',
] as const;
for (const key of required) assert(key in ko, `missing required translation key: ${key}`);

const t = createTranslator('ko');
assert(t('limit.file', { mb: 20 }).includes('20'), 'translator interpolates params');
assert(!t('limit.file', { mb: 20 }).includes('{mb}'), 'translator replaces placeholders');
console.log('PASS i18n-check');
