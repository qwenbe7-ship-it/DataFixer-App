import type { ProcessingResult } from '../domain/types';
import type { Translator } from '../i18n';

interface Props {
  t: Translator;
  result: ProcessingResult;
  onDownloadResult: () => void;
  onDownloadRejected: () => void;
  onDownloadReport: () => void;
  onDownloadSettings: () => void;
  onReset: () => void;
}

export function ResultSummary(props: Props) {
  const { t, result, onDownloadResult, onDownloadRejected, onDownloadReport, onDownloadSettings, onReset } = props;
  return <div className="stack-lg">
    <div className="success-banner" role="status">✓ {t('result.reconciled')}</div>
    <div className="summary-grid">
      <div><span>{t('result.input')}</span><strong>{result.summary.inputRows}</strong></div>
      <div><span>{t('result.unchanged')}</span><strong>{result.summary.unchangedRows}</strong></div>
      <div><span>{t('result.changed')}</span><strong>{result.summary.changedRows}</strong></div>
      <div><span>{t('result.removed')}</span><strong>{result.summary.removedRows}</strong></div>
      <div><span>{t('result.rejected')}</span><strong>{result.summary.rejectedRows}</strong></div>
    </div>
    <section className="hash-panel"><h3>{t('result.hashes')}</h3><dl><dt>{t('result.sourceHash')}</dt><dd>{result.sourceHash}</dd><dt>{t('result.settingsHash')}</dt><dd>{result.settingsHash}</dd></dl></section>
    <div className="download-grid"><button type="button" onClick={onDownloadResult}>{t('action.downloadResult')}</button><button type="button" onClick={onDownloadRejected}>{t('action.downloadRejected')}</button><button type="button" onClick={onDownloadReport}>{t('action.downloadReport')}</button><button type="button" onClick={onDownloadSettings}>{t('action.downloadSettings')}</button></div>
    <div className="actions"><button className="secondary" type="button" onClick={onReset}>{t('action.reset')}</button></div>
  </div>;
}
