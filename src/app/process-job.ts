import { DataFixerError } from '../domain/errors';
import type {
  CleanRule,
  Dataset,
  EngineResult,
  MergeSettings,
  LookupSettings,
  ProcessingResult,
  RuleSpec,
  ValidationRule,
} from '../domain/types';
import { finalizeEvidence } from '../evidence/ledger';
import { sha256Canonical } from '../evidence/hash';
import { applyRules } from '../rules/engine';
import { mergeDatasets } from '../rules/merge';
import { lookupDatasets } from '../rules/lookup';
import { validateDataset } from '../rules/validate';
import type { AppMode } from './app-reducer';
import { isCleanRuleKind, isValidationRuleKind } from '../domain/rule-kinds';

export interface ProcessDatasetsRequest {
  mode: AppMode;
  datasets: Dataset[];
  rules: RuleSpec[];
  mergeSettings: MergeSettings | null;
  lookupSettings?: LookupSettings | null;
  sourceHash: string;
}

function combinedInput(datasets: Dataset[]): Dataset {
  const columns: string[] = [];
  const seen = new Set<string>();
  for (const dataset of datasets) {
    for (const column of dataset.columns) {
      if (!seen.has(column)) {
        seen.add(column);
        columns.push(column);
      }
    }
  }
  return {
    columns,
    rows: datasets.flatMap((dataset) => dataset.rows),
    sourceIds: datasets.flatMap((dataset) => dataset.sourceIds),
  };
}

function rejectedDataset(input: Dataset, engine: EngineResult): Dataset {
  const columns: string[] = [];
  const seen = new Set<string>();
  for (const column of input.columns) {
    seen.add(column);
    columns.push(column);
  }
  for (const row of engine.rejectedRows) {
    for (const column of Object.keys(row.values)) {
      if (!seen.has(column)) {
        seen.add(column);
        columns.push(column);
      }
    }
  }
  return { columns, rows: engine.rejectedRows, sourceIds: [...input.sourceIds] };
}

export function sampleDatasets(datasets: Dataset[], limit = 200): Dataset[] {
  let remaining = Math.max(0, limit);
  return datasets.map((dataset) => {
    const rows = dataset.rows.slice(0, remaining);
    remaining -= rows.length;
    return { columns: [...dataset.columns], rows, sourceIds: [...dataset.sourceIds] };
  });
}



export function sampleDatasetsForMode(mode: AppMode, datasets: Dataset[], limit = 200): Dataset[] {
  if (mode !== 'lookup') return sampleDatasets(datasets, limit);
  if (datasets.length !== 2) return sampleDatasets(datasets, limit);
  const [left, right] = datasets;
  return [
    { columns: [...left.columns], rows: left.rows.slice(0, Math.max(0, limit)), sourceIds: [...left.sourceIds] },
    { columns: [...right.columns], rows: [...right.rows], sourceIds: [...right.sourceIds] },
  ];
}

export async function processDatasets(request: ProcessDatasetsRequest): Promise<ProcessingResult> {
  const { mode, datasets, rules, mergeSettings, lookupSettings = null, sourceHash } = request;
  if (datasets.length === 0) throw new DataFixerError('EMPTY_FILE');
  if ((mode === 'clean' || mode === 'validate') && datasets.length !== 1) {
    throw new DataFixerError('INVALID_RULE', { issue: 'single-file-mode' });
  }
  if (mode === 'clean' && rules.some((rule) => !isCleanRuleKind(rule.kind))) {
    throw new DataFixerError('INVALID_RULE', { issue: 'clean-rule-kind' });
  }
  if (mode === 'validate' && rules.some((rule) => !isValidationRuleKind(rule.kind))) {
    throw new DataFixerError('INVALID_RULE', { issue: 'validate-rule-kind' });
  }
  if ((mode === 'merge' || mode === 'lookup') && rules.length !== 0) {
    throw new DataFixerError('INVALID_RULE', { issue: `${mode}-rules-not-supported` });
  }
  if (mode !== 'merge' && mergeSettings !== null) {
    throw new DataFixerError('INVALID_RULE', { issue: 'merge-settings-wrong-mode' });
  }
  if (mode !== 'lookup' && lookupSettings !== null) {
    throw new DataFixerError('INVALID_RULE', { issue: 'lookup-settings-wrong-mode' });
  }
  if (mode === 'lookup' && datasets.length !== 2) {
    throw new DataFixerError('INVALID_RULE', { issue: 'lookup-two-files-required' });
  }

  const input = mode === 'lookup' ? datasets[0] : combinedInput(datasets);
  let engine: EngineResult;
  if (mode === 'clean') {
    engine = applyRules(datasets[0], rules as CleanRule[]);
  } else if (mode === 'validate') {
    engine = validateDataset(datasets[0], rules as ValidationRule[]);
  } else if (mode === 'merge') {
    if (!mergeSettings) throw new DataFixerError('INVALID_RULE', { issue: 'merge-settings-required' });
    engine = mergeDatasets(datasets, mergeSettings);
  } else {
    if (!lookupSettings) throw new DataFixerError('INVALID_RULE', { issue: 'lookup-settings-required' });
    engine = lookupDatasets(datasets, lookupSettings);
  }

  const finalized = finalizeEvidence(input, engine);
  const settingsHash = await sha256Canonical(mode === 'lookup'
    ? { mode, rules, mergeSettings, lookupSettings }
    : { mode, rules, mergeSettings });
  return {
    output: engine.dataset,
    rejected: rejectedDataset(input, engine),
    evidence: finalized.evidence,
    summary: finalized.summary,
    sourceHash,
    settingsHash,
  };
}
