export type CellValue = string | number | boolean | null;
export type RowStatus = 'UNCHANGED' | 'CHANGED' | 'REMOVED' | 'REJECTED';

export interface DataRow {
  rowId: string;
  sourceId: string;
  sourceRowNumber: number;
  values: Record<string, CellValue>;
}

export interface Dataset {
  columns: string[];
  rows: DataRow[];
  sourceIds: string[];
}

export interface EvidenceEntry {
  rowId: string;
  ruleId: string;
  status: RowStatus;
  column?: string;
  before?: CellValue;
  after?: CellValue;
  reasonKey: string;
  reasonParams: Record<string, string | number>;
}

export interface ProcessingSummary {
  inputRows: number;
  unchangedRows: number;
  changedRows: number;
  removedRows: number;
  rejectedRows: number;
  reconciled: boolean;
}

export interface ProcessingResult {
  output: Dataset;
  rejected: Dataset;
  evidence: EvidenceEntry[];
  summary: ProcessingSummary;
  sourceHash: string;
  settingsHash: string;
}

export type CleanRule =
  | { id: string; kind: 'trim'; column: string }
  | { id: string; kind: 'collapseSpaces'; column: string }
  | { id: string; kind: 'normalizeEmpty'; column: string; emptyValues: string[] }
  | { id: string; kind: 'changeCase'; column: string; mode: 'upper' | 'lower' | 'title' }
  | { id: string; kind: 'parseDate'; column: string; output: 'YYYY-MM-DD' }
  | { id: string; kind: 'parseNumber'; column: string; removeThousandsSeparator: boolean }
  | { id: string; kind: 'replace'; column: string; search: string; replacement: string }
  | { id: string; kind: 'regexReplace'; column: string; pattern: string; replacement: string; replaceAll: boolean; caseInsensitive: boolean }
  | { id: string; kind: 'fillDefault'; column: string; value: Exclude<CellValue, null> }
  | { id: string; kind: 'coalesce'; column: string; sourceColumns: string[] }
  | { id: string; kind: 'renameColumn'; from: string; to: string }
  | { id: string; kind: 'keepColumns'; columns: string[] }
  | { id: string; kind: 'dedupe'; columns: string[] };


export type MergeValueType = 'string' | 'number' | 'boolean';

export interface MergeSettings {
  columnMapBySource: Record<string, Record<string, string>>;
  outputColumns: string[];
  outputTypes?: Partial<Record<string, MergeValueType>>;
  sourceColumn?: string;
  dedupeColumns: string[];
}

export interface LookupSettings {
  leftKeyColumns: string[];
  rightKeyColumns: string[];
  rightValueMap: Record<string, string>;
}

export type ValidationRule =
  | { id: string; kind: 'required'; column: string }
  | { id: string; kind: 'type'; column: string; expected: 'string' | 'integer' | 'number' | 'date' }
  | { id: string; kind: 'unique'; columns: string[] }
  | { id: string; kind: 'allowed'; column: string; values: CellValue[] }
  | { id: string; kind: 'numberRange'; column: string; min?: number; max?: number }
  | { id: string; kind: 'length'; column: string; min?: number; max?: number }
  | { id: string; kind: 'regex'; column: string; pattern: string }
  | { id: string; kind: 'columnCompare'; left: string; operator: 'eq' | 'lt' | 'lte' | 'gt' | 'gte'; right: string };

export type RuleSpec = CleanRule | ValidationRule;

export interface RuleOutcome {
  row: DataRow;
  evidence: EvidenceEntry[];
  remove: boolean;
  reject: boolean;
}

export interface EngineResult {
  dataset: Dataset;
  removedRows: DataRow[];
  rejectedRows: DataRow[];
  evidence: EvidenceEntry[];
}
