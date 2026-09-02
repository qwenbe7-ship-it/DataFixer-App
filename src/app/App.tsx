import { useEffect, useMemo, useReducer, useRef, useState } from 'react';
import { DataFixerError } from '../domain/errors';
import type { Dataset, LookupSettings, MergeSettings, ProcessingResult } from '../domain/types';
import { parseJobSettings } from '../export/job-settings';
import { buildDownloadFileName, downloadBytes, downloadText } from '../export/download';
import { assertJobLimits } from '../file-io/limits';
import { inspectWorkbook, readWorksheet, type WorkbookInspection } from '../file-io/workbook-reader';
import { createTranslator, detectLocale } from '../i18n';
import { DryRunPreview } from '../ui/DryRunPreview';
import { ErrorPanel } from '../ui/ErrorPanel';
import { FilePicker } from '../ui/FilePicker';
import { ModePicker } from '../ui/ModePicker';
import { ResultSummary } from '../ui/ResultSummary';
import { RuleEditor } from '../ui/RuleEditor';
import { createDataWorker } from '../worker/browser-worker';
import { runWorkerRequest } from '../worker/client';
import type { WorkerProgress, WorkerSuccess } from '../worker/protocol';
import { buildWorkerRequest } from '../worker/request';
import { appReducer, initialAppState, type AppMode } from './app-reducer';
import { processDatasets, sampleDatasetsForMode } from './process-job';
import './app.css';

function asDataFixerError(error: unknown): DataFixerError {
  if (error instanceof DataFixerError) return error;
  return new DataFixerError('PARSE_FAILED', { message: error instanceof Error ? error.message : String(error) });
}

function datasetsInFileOrder(files: File[], datasets: Record<string, Dataset>): Dataset[] {
  return files.map((file) => datasets[file.name]).filter((dataset): dataset is Dataset => Boolean(dataset));
}

function defaultMergeSettings(datasets: Record<string, Dataset>): MergeSettings {
  const outputColumns: string[] = [];
  const seen = new Set<string>();
  const columnMapBySource: Record<string, Record<string, string>> = {};
  for (const [fileName, dataset] of Object.entries(datasets)) {
    const mapping: Record<string, string> = {};
    for (const column of dataset.columns) {
      if (!seen.has(column)) { seen.add(column); outputColumns.push(column); }
      mapping[column] = column;
    }
    columnMapBySource[fileName] = mapping;
  }
  let sourceColumn = '__source';
  while (seen.has(sourceColumn)) sourceColumn = `_${sourceColumn}`;
  outputColumns.push(sourceColumn);
  return { columnMapBySource, outputColumns, sourceColumn, dedupeColumns: [] };
}



function defaultLookupSettings(files: File[], datasets: Record<string, Dataset>): LookupSettings | null {
  if (files.length !== 2) return null;
  const left = datasets[files[0].name];
  const right = datasets[files[1].name];
  if (!left || !right || left.columns.length === 0 || right.columns.length === 0) return null;
  const common = left.columns.find((column) => right.columns.includes(column));
  const leftKey = common ?? left.columns[0];
  const rightKey = common ?? right.columns[0];
  const used = new Set(left.columns);
  const rightValueMap: Record<string, string> = {};
  for (const sourceColumn of right.columns) {
    if (sourceColumn === rightKey) continue;
    let target = sourceColumn;
    while (used.has(target)) target = `${target}_lookup`;
    used.add(target);
    rightValueMap[sourceColumn] = target;
  }
  return { leftKeyColumns: [leftKey], rightKeyColumns: [rightKey], rightValueMap };
}

const STEP_KEY = {
  MODE: 'step.mode', FILES: 'step.files', RULES: 'step.rules', DRY_RUN: 'step.preview', RESULT: 'step.result',
} as const;

export function App() {
  const [state, dispatch] = useReducer(appReducer, initialAppState);
  const [inspections, setInspections] = useState<Record<string, WorkbookInspection>>({});
  const [datasets, setDatasets] = useState<Record<string, Dataset>>({});
  const [workerResult, setWorkerResult] = useState<WorkerSuccess | null>(null);
  const [progress, setProgress] = useState<WorkerProgress | null>(null);
  const [previewResult, setPreviewResult] = useState<ProcessingResult | null>(null);
  const [busy, setBusy] = useState(false);
  const headingRef = useRef<HTMLHeadingElement>(null);
  const workerRef = useRef<Worker | null>(null);
  const t = useMemo(() => createTranslator(state.locale), [state.locale]);

  useEffect(() => { dispatch({ type: 'SET_LOCALE', locale: detectLocale() }); }, []);
  useEffect(() => {
    const worker = createDataWorker();
    workerRef.current = worker;
    return () => { worker.terminate(); workerRef.current = null; };
  }, []);
  useEffect(() => { headingRef.current?.focus(); }, [state.step]);

  const setError = (error: unknown) => dispatch({ type: 'SET_ERROR', error: asDataFixerError(error) });

  const reset = () => {
    setInspections({}); setDatasets({}); setWorkerResult(null); setProgress(null); setPreviewResult(null); setBusy(false);
    dispatch({ type: 'RESET' });
  };

  const chooseMode = (mode: AppMode) => {
    setInspections({}); setDatasets({}); setWorkerResult(null); setProgress(null); setPreviewResult(null);
    dispatch({ type: 'SELECT_MODE', mode });
  };

  const chooseFiles = async (files: File[]) => {
    try {
      setBusy(true); dispatch({ type: 'SET_ERROR', error: null });
      assertJobLimits(files);
      if ((state.mode === 'clean' || state.mode === 'validate') && files.length !== 1) throw new DataFixerError('INVALID_RULE', { issue: 'single-file-mode' });
      if (state.mode === 'lookup' && files.length !== 2) throw new DataFixerError('INVALID_RULE', { issue: 'lookup-two-files-required' });
      const nextInspections: Record<string, WorkbookInspection> = {};
      const nextDatasets: Record<string, Dataset> = {};
      const sheetByFile: Record<string, string> = {};
      for (const file of files) {
        const inspection = await inspectWorkbook(file);
        const firstSheet = inspection.sheets[0]?.name;
        if (!firstSheet) throw new DataFixerError('PARSE_FAILED', { file: file.name, issue: 'no-sheet' });
        nextInspections[file.name] = inspection;
        sheetByFile[file.name] = firstSheet;
        nextDatasets[file.name] = await readWorksheet(file, firstSheet);
      }
      dispatch({ type: 'SET_FILES', files });
      for (const [fileName, sheetName] of Object.entries(sheetByFile)) dispatch({ type: 'SELECT_SHEET', fileName, sheetName });
      setInspections(nextInspections); setDatasets(nextDatasets); setWorkerResult(null); setProgress(null); setPreviewResult(null);
    } catch (error) { setError(error); }
    finally { setBusy(false); }
  };

  const changeSheet = async (fileName: string, sheetName: string) => {
    const file = state.files.find((candidate) => candidate.name === fileName);
    if (!file) return setError(new DataFixerError('PARSE_FAILED', { file: fileName }));
    try {
      setBusy(true); dispatch({ type: 'SET_ERROR', error: null });
      const dataset = await readWorksheet(file, sheetName);
      setDatasets((current) => ({ ...current, [fileName]: dataset }));
      dispatch({ type: 'SELECT_SHEET', fileName, sheetName });
      setWorkerResult(null); setProgress(null); setPreviewResult(null);
    } catch (error) { setError(error); }
    finally { setBusy(false); }
  };

  const continueToRules = () => {
    const next = appReducer(state, { type: 'GO_TO_RULES' });
    dispatch({ type: 'GO_TO_RULES' });
    if (next.step !== 'RULES') return;
    if (state.mode === 'merge' && !state.mergeSettings) dispatch({ type: 'SET_MERGE_SETTINGS', settings: defaultMergeSettings(datasets) });
    if (state.mode === 'lookup' && !state.lookupSettings) dispatch({ type: 'SET_LOOKUP_SETTINGS', settings: defaultLookupSettings(state.files, datasets) });
  };

  const loadSettings = async (file: File) => {
    try {
      const loaded = parseJobSettings(await file.text());
      if (loaded.mode !== state.mode) throw new DataFixerError('INVALID_RULE', { issue: 'settings-mode-mismatch' });
      dispatch({ type: 'SET_RULES', rules: loaded.rules });
      dispatch({ type: 'SET_MERGE_SETTINGS', settings: loaded.mergeSettings });
      dispatch({ type: 'SET_LOOKUP_SETTINGS', settings: loaded.lookupSettings ?? null });
    } catch (error) { setError(error); }
  };

  const runPreview = async () => {
    const next = appReducer(state, { type: 'GO_TO_DRY_RUN' });
    dispatch({ type: 'GO_TO_DRY_RUN' });
    if (next.step !== 'DRY_RUN' || !state.mode) return;
    try {
      setBusy(true); dispatch({ type: 'SET_ERROR', error: null }); setPreviewResult(null);
      const ordered = datasetsInFileOrder(state.files, datasets);
      const result = await processDatasets({ mode: state.mode, datasets: sampleDatasetsForMode(state.mode, ordered, 200), rules: state.rules, mergeSettings: state.mergeSettings, lookupSettings: state.lookupSettings, sourceHash: 'preview' });
      setPreviewResult(result);
    } catch (error) { setError(error); }
    finally { setBusy(false); }
  };

  const processAll = async () => {
    if (!state.mode) return;
    const worker = workerRef.current;
    if (!worker) return setError(new DataFixerError('PARSE_FAILED', { issue: 'worker-unavailable' }));
    try {
      setBusy(true); setProgress(null); setWorkerResult(null); dispatch({ type: 'SET_ERROR', error: null });
      const request = await buildWorkerRequest({
        jobId: crypto.randomUUID(),
        mode: state.mode,
        files: state.files,
        selectedSheets: state.selectedSheets,
        rules: state.rules,
        mergeSettings: state.mergeSettings,
        lookupSettings: state.lookupSettings,
        locale: state.locale,
      });
      const completed = await runWorkerRequest(worker, request, setProgress);
      setWorkerResult(completed);
      dispatch({ type: 'SET_RESULT', result: completed.result });
    } catch (error) { setError(error); }
    finally { setBusy(false); }
  };

  const download = (kind: 'result'|'rejected'|'report'|'settings') => {
    if (!state.result || !workerResult) return;
    try {
      if (kind === 'result') downloadBytes(workerResult.resultXlsx, buildDownloadFileName('result', 'xlsx'), 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      if (kind === 'rejected') downloadBytes(workerResult.rejectedXlsx, buildDownloadFileName('rejected', 'xlsx'), 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      if (kind === 'report') downloadText(workerResult.reportHtml, buildDownloadFileName('report', 'html'), 'text/html;charset=utf-8');
      if (kind === 'settings') downloadText(workerResult.settingsJson, buildDownloadFileName('settings', 'json'), 'application/json;charset=utf-8');
    } catch (error) { setError(error); }
  };

  return <main className="app-shell">
    <header className="app-header">
      <div><p className="eyebrow">{t('app.eyebrow')}</p><h1>{t('app.name')}</h1><p>{t('app.tagline')}</p></div>
      <label className="language-picker">{t('language.label')}<select value={state.locale} onChange={(e) => dispatch({ type: 'SET_LOCALE', locale: e.currentTarget.value as 'ko'|'en' })}><option value="ko">{t('language.ko')}</option><option value="en">{t('language.en')}</option></select></label>
    </header>
    <div className="privacy-banner"><strong>🔒 {t('privacy.localOnly')}</strong><span>{t('privacy.detail')}</span></div>
    <nav className="stepper" aria-label={t('workflow.progress')}>{(['MODE','FILES','RULES','DRY_RUN','RESULT'] as const).map((step, index) => <span key={step} className={state.step === step ? 'active' : ''}>{index + 1}</span>)}</nav>
    <section className="workspace-card">
      <h2 ref={headingRef} tabIndex={-1}>{t(STEP_KEY[state.step])}</h2>
      <ErrorPanel error={state.error} t={t}/>
      {progress && <p className="progress-line" aria-live="polite">{t(`progress.${progress.phase}`)} {progress.completed}/{progress.total}</p>}
      {state.step === 'MODE' && <ModePicker t={t} onSelect={chooseMode}/>} 
      {state.step === 'FILES' && state.mode && <FilePicker t={t} mode={state.mode} files={state.files} inspections={inspections} datasets={datasets} selectedSheets={state.selectedSheets} busy={busy} onChoose={chooseFiles} onSheetChange={changeSheet} onBack={() => dispatch({ type: 'GO_TO_MODE' })} onContinue={continueToRules}/>} 
      {state.step === 'RULES' && state.mode && <RuleEditor t={t} mode={state.mode} datasets={datasets} rules={state.rules} mergeSettings={state.mergeSettings} lookupSettings={state.lookupSettings} onRulesChange={(rules) => dispatch({ type: 'SET_RULES', rules })} onMergeSettingsChange={(settings) => dispatch({ type: 'SET_MERGE_SETTINGS', settings })} onLookupSettingsChange={(settings) => dispatch({ type: 'SET_LOOKUP_SETTINGS', settings })} onLoadSettings={loadSettings} onBack={() => dispatch({ type: 'GO_TO_FILES' })} onPreview={runPreview}/>} 
      {state.step === 'DRY_RUN' && <DryRunPreview t={t} result={previewResult} busy={busy} onBack={() => dispatch({ type: 'GO_TO_RULES' })} onProcessAll={processAll}/>} 
      {state.step === 'RESULT' && state.result && <ResultSummary t={t} result={state.result} onDownloadResult={() => download('result')} onDownloadRejected={() => download('rejected')} onDownloadReport={() => download('report')} onDownloadSettings={() => download('settings')} onReset={reset}/>} 
    </section>
  </main>;
}

export default App;
