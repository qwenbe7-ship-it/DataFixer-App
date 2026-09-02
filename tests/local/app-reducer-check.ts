import { initialAppState, appReducer } from '../../src/app/app-reducer';
import type { ProcessingResult } from '../../src/domain/types';

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message);
}

const file = new File(['a,b\n1,2\n'], 'sample.csv');

let state = initialAppState;
state = appReducer(state, { type: 'GO_TO_RULES' });
assert(state.step === 'MODE', 'cannot skip mode/files');
assert(state.error?.code === 'INVALID_RULE', 'illegal transition records error');

state = appReducer(initialAppState, { type: 'SELECT_MODE', mode: 'clean' });
assert(state.step === 'FILES', 'mode selection advances to files');
state = appReducer(state, { type: 'SET_FILES', files: [file] });
state = appReducer(state, { type: 'GO_TO_RULES' });
assert(state.step === 'FILES', 'sheet required before rules');

state = appReducer(state, { type: 'SELECT_SHEET', fileName: 'sample.csv', sheetName: 'Sheet1' });
state = appReducer(state, { type: 'GO_TO_RULES' });
assert(state.step === 'RULES', 'valid files advance to rules');
state = appReducer(state, { type: 'GO_TO_DRY_RUN' });
assert(state.step === 'RULES', 'rules required before dry run');

state = appReducer(state, { type: 'SET_RULES', rules: [{ id: 'trim-a', kind: 'trim', column: 'a' }] });
state = appReducer(state, { type: 'GO_TO_DRY_RUN' });
assert(state.step === 'DRY_RUN', 'valid clean rules advance to dry run');

const unreconciled = {
  output: { columns: ['a'], rows: [], sourceIds: ['sample.csv'] },
  rejected: { columns: ['a'], rows: [], sourceIds: ['sample.csv'] },
  evidence: [],
  summary: { inputRows: 1, unchangedRows: 0, changedRows: 0, removedRows: 0, rejectedRows: 0, reconciled: false },
  sourceHash: 's', settingsHash: 't',
} satisfies ProcessingResult;
state = appReducer(state, { type: 'SET_RESULT', result: unreconciled });
assert(state.step === 'DRY_RUN', 'unreconciled result cannot display');
assert(state.error?.code === 'RECONCILIATION_FAILED', 'unreconciled result reports reconciliation error');

const reconciled = {
  ...unreconciled,
  summary: { inputRows: 1, unchangedRows: 1, changedRows: 0, removedRows: 0, rejectedRows: 0, reconciled: true },
} satisfies ProcessingResult;
state = appReducer(state, { type: 'SET_RESULT', result: reconciled });
assert(state.step === 'RESULT', 'reconciled result displays');

state = appReducer(state, { type: 'SET_LOCALE', locale: 'en' });
state = appReducer(state, { type: 'RESET' });
assert(state.step === 'MODE' && state.mode === null && state.files.length === 0, 'reset returns initial workflow');
assert(state.locale === 'en', 'reset preserves explicit language choice');



const lookupFileA = new File(['sku,name\nA,Alpha\n'], 'lookup-left.csv');
const lookupFileB = new File(['sku,stock\nA,10\n'], 'lookup-right.csv');
let lookupState = appReducer(initialAppState, { type: 'SELECT_MODE', mode: 'lookup' });
lookupState = appReducer(lookupState, { type: 'SET_FILES', files: [lookupFileA, lookupFileB] });
lookupState = appReducer(lookupState, { type: 'SELECT_SHEET', fileName: 'lookup-left.csv', sheetName: 'Sheet1' });
lookupState = appReducer(lookupState, { type: 'SELECT_SHEET', fileName: 'lookup-right.csv', sheetName: 'Sheet1' });
lookupState = appReducer(lookupState, { type: 'GO_TO_RULES' });
assert(lookupState.step === 'RULES', 'lookup with two files reaches settings');
lookupState = appReducer(lookupState, { type: 'GO_TO_DRY_RUN' });
assert(lookupState.step === 'RULES', 'lookup settings required before dry run');
lookupState = appReducer(lookupState, {
  type: 'SET_LOOKUP_SETTINGS',
  settings: { leftKeyColumns: ['sku'], rightKeyColumns: ['sku'], rightValueMap: { stock: 'inventory_stock' } },
});
lookupState = appReducer(lookupState, { type: 'GO_TO_DRY_RUN' });
assert(lookupState.step === 'DRY_RUN', 'valid lookup settings advance to dry run');

console.log('PASS app-reducer-check');
