import { DataFixerError } from '../domain/errors';
import type { LookupSettings, MergeSettings, ProcessingResult, RuleSpec } from '../domain/types';

export type AppStep = 'MODE' | 'FILES' | 'RULES' | 'DRY_RUN' | 'RESULT';
export type AppLocale = 'ko' | 'en';
export type AppMode = 'clean' | 'merge' | 'lookup' | 'validate';

export interface AppState {
  step: AppStep;
  locale: AppLocale;
  mode: AppMode | null;
  files: File[];
  selectedSheets: Record<string, string>;
  rules: RuleSpec[];
  mergeSettings: MergeSettings | null;
  lookupSettings: LookupSettings | null;
  result: ProcessingResult | null;
  error: DataFixerError | null;
}

export type AppAction =
  | { type: 'SET_LOCALE'; locale: AppLocale }
  | { type: 'SELECT_MODE'; mode: AppMode }
  | { type: 'SET_FILES'; files: File[] }
  | { type: 'SELECT_SHEET'; fileName: string; sheetName: string }
  | { type: 'SET_RULES'; rules: RuleSpec[] }
  | { type: 'SET_MERGE_SETTINGS'; settings: MergeSettings | null }
  | { type: 'SET_LOOKUP_SETTINGS'; settings: LookupSettings | null }
  | { type: 'GO_TO_MODE' }
  | { type: 'GO_TO_FILES' }
  | { type: 'GO_TO_RULES' }
  | { type: 'GO_TO_DRY_RUN' }
  | { type: 'SET_RESULT'; result: ProcessingResult }
  | { type: 'SET_ERROR'; error: DataFixerError | null }
  | { type: 'RESET' };

export const initialAppState: AppState = {
  step: 'MODE',
  locale: 'ko',
  mode: null,
  files: [],
  selectedSheets: {},
  rules: [],
  mergeSettings: null,
  lookupSettings: null,
  result: null,
  error: null,
};

function illegal(state: AppState, issue: string): AppState {
  return { ...state, error: new DataFixerError('INVALID_RULE', { issue }) };
}

function allFilesHaveSheets(state: AppState): boolean {
  const validCount = state.mode === 'lookup' ? state.files.length === 2 : state.files.length > 0;
  return validCount
    && state.files.every((file) => Boolean(state.selectedSheets[file.name]?.trim()));
}

function hasValidProcessingSettings(state: AppState): boolean {
  if (state.mode === 'merge') return state.mergeSettings !== null;
  if (state.mode === 'lookup') return state.lookupSettings !== null;
  if (state.mode === 'clean' || state.mode === 'validate') return state.rules.length > 0;
  return false;
}

export function appReducer(state: AppState, action: AppAction): AppState {
  switch (action.type) {
    case 'SET_LOCALE':
      return { ...state, locale: action.locale };
    case 'SELECT_MODE':
      return {
        ...initialAppState,
        locale: state.locale,
        mode: action.mode,
        step: 'FILES',
      };
    case 'SET_FILES': {
      const selectedNames = new Set(action.files.map((file) => file.name));
      return {
        ...state,
        files: [...action.files],
        selectedSheets: Object.fromEntries(
          Object.entries(state.selectedSheets).filter(([fileName]) => selectedNames.has(fileName)),
        ),
        rules: [],
        mergeSettings: null,
        lookupSettings: null,
        result: null,
        error: null,
      };
    }
    case 'SELECT_SHEET':
      if (!state.files.some((file) => file.name === action.fileName)) {
        return illegal(state, 'sheet-selected-for-unknown-file');
      }
      return {
        ...state,
        selectedSheets: { ...state.selectedSheets, [action.fileName]: action.sheetName },
        result: null,
        error: null,
      };
    case 'SET_RULES':
      return { ...state, rules: [...action.rules], result: null, error: null };
    case 'SET_MERGE_SETTINGS':
      return { ...state, mergeSettings: action.settings, result: null, error: null };
    case 'SET_LOOKUP_SETTINGS':
      return { ...state, lookupSettings: action.settings, result: null, error: null };
    case 'GO_TO_MODE':
      return { ...state, step: 'MODE', error: null };
    case 'GO_TO_FILES':
      if (!state.mode) return illegal(state, 'mode-required');
      return { ...state, step: 'FILES', error: null };
    case 'GO_TO_RULES':
      if (!state.mode || !allFilesHaveSheets(state)) {
        return illegal(state, 'files-and-sheets-required');
      }
      return { ...state, step: 'RULES', result: null, error: null };
    case 'GO_TO_DRY_RUN':
      if (!state.mode || !allFilesHaveSheets(state) || !hasValidProcessingSettings(state)) {
        return illegal(state, 'valid-processing-settings-required');
      }
      return { ...state, step: 'DRY_RUN', result: null, error: null };
    case 'SET_RESULT':
      if (!action.result.summary.reconciled) {
        return { ...state, error: new DataFixerError('RECONCILIATION_FAILED', { issue: 'unreconciled-result' }) };
      }
      return { ...state, step: 'RESULT', result: action.result, error: null };
    case 'SET_ERROR':
      return { ...state, error: action.error };
    case 'RESET':
      return { ...initialAppState, locale: state.locale };
  }
}
