import type { AppMode } from '../app/app-reducer';
import type { Dataset } from '../domain/types';
import type { WorkbookInspection } from '../file-io/workbook-reader';
import type { Translator } from '../i18n';

interface Props {
  t: Translator;
  mode: AppMode;
  files: File[];
  inspections: Record<string, WorkbookInspection>;
  datasets: Record<string, Dataset>;
  selectedSheets: Record<string, string>;
  busy: boolean;
  onChoose: (files: File[]) => void;
  onSheetChange: (fileName: string, sheetName: string) => void;
  onBack: () => void;
  onContinue: () => void;
}

export function FilePicker(props: Props) {
  const { t, mode, files, inspections, datasets, selectedSheets, busy, onChoose, onSheetChange, onBack, onContinue } = props;
  return (
    <div className="stack-lg">
      <p>{t('files.help')}</p>
      {mode === 'lookup' && <p className="notice">{t('lookup.fileOrderHelp')}</p>}
      <div className="limit-row" aria-label="File limits">
        <span>{t('limit.file', { mb: 20 })}</span>
        <span>{t('limit.job', { mb: 50 })}</span>
        <span>{t('limit.count', { count: 10 })}</span>
      </div>
      <label className="file-button">
        <span>{busy ? t('common.loading') : t('action.chooseFiles')}</span>
        <input
          type="file"
          accept=".csv,.xlsx,text/csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
          multiple={mode === 'merge' || mode === 'lookup'}
          disabled={busy}
          onChange={(event) => onChoose(Array.from(event.currentTarget.files ?? []))}
        />
      </label>

      {files.length === 0 ? <p className="muted">{t('files.none')}</p> : (
        <div className="file-list">
          {files.map((file, index) => {
            const inspection = inspections[file.name];
            const dataset = datasets[file.name];
            const selected = selectedSheets[file.name] ?? '';
            const selectedInfo = inspection?.sheets.find((sheet) => sheet.name === selected);
            return (
              <article className="file-card" key={file.name}>
                <div className="file-card-heading">
                  <strong>{file.name}</strong>{mode === 'lookup' && <small className="muted">{index === 0 ? t('lookup.baseFile') : t('lookup.referenceFile')}</small>}
                  <span>{(file.size / (1024 * 1024)).toFixed(2)} MB</span>
                </div>
                {inspection && (
                  <>
                    <label>
                      {t('files.sheet')}
                      <select value={selected} onChange={(event) => onSheetChange(file.name, event.currentTarget.value)}>
                        {inspection.sheets.map((sheet) => <option key={sheet.name} value={sheet.name}>{sheet.name}</option>)}
                      </select>
                    </label>
                    {selectedInfo && <p className="muted">{t('files.rows', { count: selectedInfo.rows })} · {t('files.columns', { count: selectedInfo.columns.length })}</p>}
                  </>
                )}
                {dataset && dataset.rows.length > 0 && (
                  <div className="table-scroll">
                    <table>
                      <caption>{t('files.preview', { count: Math.min(20, dataset.rows.length) })}</caption>
                      <thead><tr>{dataset.columns.map((column) => <th key={column}>{column}</th>)}</tr></thead>
                      <tbody>{dataset.rows.slice(0, 20).map((row) => (
                        <tr key={row.rowId}>{dataset.columns.map((column) => <td key={column}>{String(row.values[column] ?? '')}</td>)}</tr>
                      ))}</tbody>
                    </table>
                  </div>
                )}
              </article>
            );
          })}
        </div>
      )}
      <div className="actions"><button type="button" className="secondary" onClick={onBack}>{t('action.back')}</button><button type="button" onClick={onContinue} disabled={busy || files.length === 0}>{t('action.continue')}</button></div>
    </div>
  );
}
