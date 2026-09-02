import type { AppMode } from '../app/app-reducer';
import type { Dataset, LookupSettings, MergeSettings, MergeValueType, RuleSpec } from '../domain/types';
import { CLEAN_RULE_KINDS, VALIDATION_RULE_KINDS, type CleanRuleKind, type ValidationRuleKind } from '../domain/rule-kinds';
import type { Translator } from '../i18n';
import { formatAllowedValues, formatCellLiteral, parseAllowedValues, parseCellLiteral } from './rule-input';

interface Props {
  t: Translator;
  mode: AppMode;
  datasets: Record<string, Dataset>;
  rules: RuleSpec[];
  mergeSettings: MergeSettings | null;
  lookupSettings: LookupSettings | null;
  onRulesChange: (rules: RuleSpec[]) => void;
  onMergeSettingsChange: (settings: MergeSettings) => void;
  onLookupSettingsChange: (settings: LookupSettings) => void;
  onLoadSettings: (file: File) => void;
  onBack: () => void;
  onPreview: () => void;
}


function splitColumns(value: string): string[] { return value.split(',').map((item) => item.trim()).filter(Boolean); }

function makeRule(kind: CleanRuleKind | ValidationRuleKind, columns: string[], index: number): RuleSpec {
  const column = columns[0] ?? '';
  const id = `${kind}-${index + 1}`;
  switch (kind) {
    case 'trim': return { id, kind, column };
    case 'collapseSpaces': return { id, kind, column };
    case 'normalizeEmpty': return { id, kind, column, emptyValues: ['', 'N/A', '-'] };
    case 'changeCase': return { id, kind, column, mode: 'lower' };
    case 'parseDate': return { id, kind, column, output: 'YYYY-MM-DD' };
    case 'parseNumber': return { id, kind, column, removeThousandsSeparator: true };
    case 'replace': return { id, kind, column, search: '', replacement: '' };
    case 'regexReplace': return { id, kind, column, pattern: '', replacement: '', replaceAll: true, caseInsensitive: false };
    case 'fillDefault': return { id, kind, column, value: '' };
    case 'coalesce': return { id, kind, column, sourceColumns: [] };
    case 'renameColumn': return { id, kind, from: column, to: `${column}_renamed` };
    case 'keepColumns': return { id, kind, columns: column ? [column] : [] };
    case 'dedupe': return { id, kind, columns: [] };
    case 'required': return { id, kind, column };
    case 'type': return { id, kind, column, expected: 'string' };
    case 'unique': return { id, kind, columns: column ? [column] : [] };
    case 'allowed': return { id, kind, column, values: [] };
    case 'numberRange': return { id, kind, column, min: 0 };
    case 'length': return { id, kind, column, min: 0 };
    case 'regex': return { id, kind, column, pattern: '.*' };
    case 'columnCompare': return { id, kind, left: column, operator: 'eq', right: columns[1] ?? column };
  }
}

function RuleFields({ rule, columns, t, onChange }: { rule: RuleSpec; columns: string[]; t: Translator; onChange: (rule: RuleSpec) => void }) {
  const columnSelect = (value: string, update: (column: string) => RuleSpec) => (
    <label>{t('rules.column')}<select value={value} onChange={(e) => onChange(update(e.currentTarget.value))}>{columns.map((column) => <option key={column} value={column}>{column}</option>)}</select></label>
  );
  switch (rule.kind) {
    case 'trim': case 'collapseSpaces':
      return columnSelect(rule.column, (column) => ({ ...rule, column }));
    case 'normalizeEmpty':
      return <>{columnSelect(rule.column, (column) => ({ ...rule, column }))}<label>{t('rules.value')}<input value={rule.emptyValues.join(',')} onChange={(e) => onChange({ ...rule, emptyValues: e.currentTarget.value.split(',').map((v) => v.trim()) })}/></label></>;
    case 'changeCase':
      return <>{columnSelect(rule.column, (column) => ({ ...rule, column }))}<label>{t('rules.case')}<select value={rule.mode} onChange={(e) => onChange({ ...rule, mode: e.currentTarget.value as 'upper'|'lower'|'title' })}><option value="upper">UPPER</option><option value="lower">lower</option><option value="title">Title</option></select></label></>;
    case 'parseDate': case 'parseNumber':
      return columnSelect(rule.column, (column) => ({ ...rule, column }));
    case 'replace':
      return <>{columnSelect(rule.column, (column) => ({ ...rule, column }))}<label>{t('rules.search')}<input value={rule.search} onChange={(e) => onChange({ ...rule, search: e.currentTarget.value })}/></label><label>{t('rules.replacement')}<input value={rule.replacement} onChange={(e) => onChange({ ...rule, replacement: e.currentTarget.value })}/></label></>;
    case 'regexReplace':
      return <>{columnSelect(rule.column, (column) => ({ ...rule, column }))}<label>{t('rules.pattern')}<input value={rule.pattern} onChange={(e) => onChange({ ...rule, pattern: e.currentTarget.value })}/></label><label>{t('rules.replacement')}<input value={rule.replacement} onChange={(e) => onChange({ ...rule, replacement: e.currentTarget.value })}/></label><label><input type="checkbox" checked={rule.replaceAll} onChange={(e) => onChange({ ...rule, replaceAll: e.currentTarget.checked })}/>{t('rules.replaceAll')}</label><label><input type="checkbox" checked={rule.caseInsensitive} onChange={(e) => onChange({ ...rule, caseInsensitive: e.currentTarget.checked })}/>{t('rules.caseInsensitive')}</label></>;
    case 'fillDefault':
      return <>{columnSelect(rule.column, (column) => ({ ...rule, column }))}<label>{t('rules.defaultValue')}<input value={formatCellLiteral(rule.value)} onChange={(e) => { const value = parseCellLiteral(e.currentTarget.value); onChange({ ...rule, value: value === null ? '' : value }); }}/></label></>;
    case 'coalesce':
      return <>{columnSelect(rule.column, (column) => ({ ...rule, column }))}<label>{t('rules.sourceColumns')}<input value={rule.sourceColumns.join(',')} onChange={(e) => onChange({ ...rule, sourceColumns: splitColumns(e.currentTarget.value) })}/></label></>;
    case 'renameColumn':
      return <><label>{t('rules.column')}<select value={rule.from} onChange={(e) => onChange({ ...rule, from: e.currentTarget.value })}>{columns.map((column) => <option key={column} value={column}>{column}</option>)}</select></label><label>{t('rules.value')}<input value={rule.to} onChange={(e) => onChange({ ...rule, to: e.currentTarget.value })}/></label></>;
    case 'keepColumns': case 'dedupe':
      return <label>{t('rules.columns')}<input value={rule.columns.join(',')} placeholder={rule.kind === 'dedupe' ? t('rules.allColumnsHint') : ''} onChange={(e) => onChange({ ...rule, columns: splitColumns(e.currentTarget.value) })}/></label>;
    case 'required':
      return columnSelect(rule.column, (column) => ({ ...rule, column }));
    case 'type':
      return <>{columnSelect(rule.column, (column) => ({ ...rule, column }))}<label>{t('rules.expected')}<select value={rule.expected} onChange={(e) => onChange({ ...rule, expected: e.currentTarget.value as 'string'|'integer'|'number'|'date' })}><option value="string">string</option><option value="integer">integer</option><option value="number">number</option><option value="date">date</option></select></label></>;
    case 'unique':
      return <label>{t('rules.columns')}<input value={rule.columns.join(',')} onChange={(e) => onChange({ ...rule, columns: splitColumns(e.currentTarget.value) })}/></label>;
    case 'allowed':
      return <>{columnSelect(rule.column, (column) => ({ ...rule, column }))}<label>{t('rules.allowed')}<input value={formatAllowedValues(rule.values)} onChange={(e) => onChange({ ...rule, values: parseAllowedValues(e.currentTarget.value) })}/></label></>;
    case 'numberRange': case 'length':
      return <>{columnSelect(rule.column, (column) => ({ ...rule, column }))}<label>{t('rules.min')}<input type="number" value={rule.min ?? ''} onChange={(e) => onChange({ ...rule, min: e.currentTarget.value === '' ? undefined : Number(e.currentTarget.value) })}/></label><label>{t('rules.max')}<input type="number" value={rule.max ?? ''} onChange={(e) => onChange({ ...rule, max: e.currentTarget.value === '' ? undefined : Number(e.currentTarget.value) })}/></label></>;
    case 'regex':
      return <>{columnSelect(rule.column, (column) => ({ ...rule, column }))}<label>{t('rules.pattern')}<input value={rule.pattern} onChange={(e) => onChange({ ...rule, pattern: e.currentTarget.value })}/></label></>;
    case 'columnCompare':
      return <><label>{t('rules.column')}<select value={rule.left} onChange={(e) => onChange({ ...rule, left: e.currentTarget.value })}>{columns.map((column) => <option key={column} value={column}>{column}</option>)}</select></label><label>{t('rules.operator')}<select value={rule.operator} onChange={(e) => onChange({ ...rule, operator: e.currentTarget.value as 'eq'|'lt'|'lte'|'gt'|'gte' })}><option value="eq">=</option><option value="lt">&lt;</option><option value="lte">≤</option><option value="gt">&gt;</option><option value="gte">≥</option></select></label><label>{t('rules.rightColumn')}<select value={rule.right} onChange={(e) => onChange({ ...rule, right: e.currentTarget.value })}>{columns.map((column) => <option key={column} value={column}>{column}</option>)}</select></label></>;
  }
}

function MergeEditor({ settings, datasets, t, onChange }: { settings: MergeSettings; datasets: Record<string, Dataset>; t: Translator; onChange: (settings: MergeSettings) => void }) {
  const updateColumns = (outputColumns: string[]) => {
    const outputTypes = Object.fromEntries(Object.entries(settings.outputTypes ?? {}).filter(([column]) => outputColumns.includes(column)));
    onChange({ ...settings, outputColumns, ...(Object.keys(outputTypes).length > 0 ? { outputTypes } : { outputTypes: undefined }) });
  };
  const updateOutputType = (column: string, expected: MergeValueType | '') => {
    const next = { ...(settings.outputTypes ?? {}) };
    if (expected) next[column] = expected; else delete next[column];
    onChange({ ...settings, outputTypes: Object.keys(next).length > 0 ? next : undefined });
  };
  return <div className="stack-md">
    <label>{t('merge.outputColumns')}<input value={settings.outputColumns.join(',')} onChange={(e) => updateColumns(splitColumns(e.currentTarget.value))}/></label>
    <fieldset className="mapping-card"><legend>{t('merge.outputTypes')}</legend><p className="muted">{t('merge.outputTypeHelp')}</p>{settings.outputColumns.map((column) => <label key={column}>{column}<select value={settings.outputTypes?.[column] ?? ''} onChange={(e) => updateOutputType(column, e.currentTarget.value as MergeValueType | '')}><option value="">—</option><option value="string">string</option><option value="number">number</option><option value="boolean">boolean</option></select></label>)}</fieldset>
    <label>{t('merge.sourceColumn')}<input value={settings.sourceColumn ?? ''} onChange={(e) => onChange({ ...settings, sourceColumn: e.currentTarget.value.trim() || undefined })}/></label>
    <label>{t('merge.dedupeColumns')}<input value={settings.dedupeColumns.join(',')} onChange={(e) => onChange({ ...settings, dedupeColumns: splitColumns(e.currentTarget.value) })}/></label>
    {Object.entries(datasets).map(([fileName, dataset]) => <fieldset key={fileName} className="mapping-card"><legend>{t('merge.mapping', { file: fileName })}</legend><p className="muted">{t('merge.mappingHelp')}</p>{dataset.columns.map((sourceColumn) => <label key={sourceColumn}>{sourceColumn}<select value={settings.columnMapBySource[fileName]?.[sourceColumn] ?? ''} onChange={(e) => { const next = { ...(settings.columnMapBySource[fileName] ?? {}) }; if (e.currentTarget.value) next[sourceColumn] = e.currentTarget.value; else delete next[sourceColumn]; onChange({ ...settings, columnMapBySource: { ...settings.columnMapBySource, [fileName]: next } }); }}><option value="">—</option>{settings.outputColumns.filter((column) => column !== settings.sourceColumn).map((column) => <option key={column} value={column}>{column}</option>)}</select></label>)}</fieldset>)}
  </div>;
}



function LookupEditor({ settings, datasets, t, onChange }: { settings: LookupSettings; datasets: Record<string, Dataset>; t: Translator; onChange: (settings: LookupSettings) => void }) {
  const entries = Object.entries(datasets);
  const [leftName, left] = entries[0] ?? ['', undefined];
  const [rightName, right] = entries[1] ?? ['', undefined];
  return <div className="stack-md">
    <div className="lookup-role-grid">
      <div><strong>{t('lookup.baseFile')}</strong><p className="muted">{leftName}</p></div>
      <div><strong>{t('lookup.referenceFile')}</strong><p className="muted">{rightName}</p></div>
    </div>
    <label>{t('lookup.leftKeyColumns')}<input value={settings.leftKeyColumns.join(',')} onChange={(e) => onChange({ ...settings, leftKeyColumns: splitColumns(e.currentTarget.value) })}/></label>
    <label>{t('lookup.rightKeyColumns')}<input value={settings.rightKeyColumns.join(',')} onChange={(e) => onChange({ ...settings, rightKeyColumns: splitColumns(e.currentTarget.value) })}/></label>
    <fieldset className="mapping-card"><legend>{t('lookup.valueMap')}</legend><p className="muted">{t('lookup.valueMapHelp')}</p>
      {(right?.columns ?? []).map((sourceColumn) => <label key={sourceColumn}>{sourceColumn}<input value={settings.rightValueMap[sourceColumn] ?? ''} placeholder={left?.columns.includes(sourceColumn) ? `${sourceColumn}_lookup` : sourceColumn} onChange={(e) => { const next = { ...settings.rightValueMap }; const target = e.currentTarget.value.trim(); if (target) next[sourceColumn] = target; else delete next[sourceColumn]; onChange({ ...settings, rightValueMap: next }); }}/></label>)}
    </fieldset>
  </div>;
}

export function RuleEditor(props: Props) {
  const { t, mode, datasets, rules, mergeSettings, lookupSettings, onRulesChange, onMergeSettingsChange, onLookupSettingsChange, onLoadSettings, onBack, onPreview } = props;
  const columns = Object.values(datasets)[0]?.columns ?? [];
  const kinds = mode === 'clean' ? CLEAN_RULE_KINDS : VALIDATION_RULE_KINDS;
  const addRule = (kind: CleanRuleKind | ValidationRuleKind) => onRulesChange([...rules, makeRule(kind, columns, rules.length)]);
  const updateRule = (index: number, rule: RuleSpec) => onRulesChange(rules.map((item, i) => i === index ? rule : item));
  const move = (index: number, delta: number) => { const target = index + delta; if (target < 0 || target >= rules.length) return; const next = [...rules]; [next[index], next[target]] = [next[target], next[index]]; onRulesChange(next); };

  return <div className="stack-lg">
    <label className="settings-load">{t('action.loadSettings')}<input type="file" accept="application/json,.json" onChange={(e) => { const file = e.currentTarget.files?.[0]; if (file) onLoadSettings(file); }}/></label>
    {mode === 'merge' && mergeSettings ? <MergeEditor settings={mergeSettings} datasets={datasets} t={t} onChange={onMergeSettingsChange}/> : mode === 'lookup' && lookupSettings ? <LookupEditor settings={lookupSettings} datasets={datasets} t={t} onChange={onLookupSettingsChange}/> : (mode === 'clean' || mode === 'validate') && <>
      <div className="rule-add-row"><label>{t('action.addRule')}<select defaultValue="" onChange={(e) => { if (e.currentTarget.value) { addRule(e.currentTarget.value as CleanRuleKind | ValidationRuleKind); e.currentTarget.value = ''; } }}><option value="">—</option>{kinds.map((kind) => <option key={kind} value={kind}>{t(`rule.${kind}` as never)}</option>)}</select></label></div>
      <p className="muted">{t('rules.order')}</p>
      {rules.length === 0 ? <p>{t('rules.none')}</p> : <ol className="rule-list">{rules.map((rule, index) => <li key={`${rule.id}-${index}`} className="rule-card"><div className="rule-card-heading"><strong>{t(`rule.${rule.kind}`)}</strong><input aria-label={t('rules.ruleId')} value={rule.id} onChange={(e) => updateRule(index, { ...rule, id: e.currentTarget.value } as RuleSpec)}/></div><div className="rule-fields"><RuleFields rule={rule} columns={columns} t={t} onChange={(next) => updateRule(index, next)}/></div><div className="mini-actions"><button type="button" className="ghost" onClick={() => move(index, -1)} disabled={index === 0}>{t('action.moveUp')}</button><button type="button" className="ghost" onClick={() => move(index, 1)} disabled={index === rules.length - 1}>{t('action.moveDown')}</button><button type="button" className="danger ghost" onClick={() => onRulesChange(rules.filter((_, i) => i !== index))}>{t('action.removeRule')}</button></div></li>)}</ol>}
    </>}
    <div className="actions"><button className="secondary" type="button" onClick={onBack}>{t('action.back')}</button><button type="button" onClick={onPreview} disabled={mode === 'merge' ? !mergeSettings : mode === 'lookup' ? !lookupSettings || lookupSettings.leftKeyColumns.length === 0 || lookupSettings.leftKeyColumns.length !== lookupSettings.rightKeyColumns.length || Object.keys(lookupSettings.rightValueMap).length === 0 : rules.length === 0}>{t('action.runPreview')}</button></div>
  </div>;
}
