import type { ProcessingResult } from '../domain/types';
import type { Translator } from '../i18n';

interface Props { t: Translator; result: ProcessingResult | null; busy: boolean; onBack: () => void; onProcessAll: () => void; }

export function DryRunPreview({ t, result, busy, onBack, onProcessAll }: Props) {
  return <div className="stack-lg">
    <p className="notice">{t('preview.sampleNotice', { count: 200 })}</p>
    {busy && <p aria-live="polite">{t('common.processing')}</p>}
    {result && <>
      <div className="summary-grid">
        <div><span>{t('result.input')}</span><strong>{result.summary.inputRows}</strong></div>
        <div><span>{t('result.unchanged')}</span><strong>{result.summary.unchangedRows}</strong></div>
        <div><span>{t('result.changed')}</span><strong>{result.summary.changedRows}</strong></div>
        <div><span>{t('result.removed')}</span><strong>{result.summary.removedRows}</strong></div>
        <div><span>{t('result.rejected')}</span><strong>{result.summary.rejectedRows}</strong></div>
      </div>
      {result.evidence.length === 0 ? <p>{t('preview.noChanges')}</p> : <div className="table-scroll"><table><thead><tr><th>{t('preview.status')}</th><th>{t('common.row')}</th><th>{t('common.rule')}</th><th>{t('rules.column')}</th><th>{t('preview.before')}</th><th>{t('preview.after')}</th><th>{t('preview.reason')}</th></tr></thead><tbody>{result.evidence.slice(0, 200).map((entry, index) => <tr key={`${entry.rowId}-${entry.ruleId}-${index}`}><td><span className={`status-badge status-${entry.status.toLowerCase()}`}>{entry.status === 'REJECTED' ? '⚠ ' : entry.status === 'REMOVED' ? '− ' : '✓ '}{t(`status.${entry.status}`)}</span></td><td>{entry.rowId}</td><td>{entry.ruleId}</td><td>{entry.column ?? ''}</td><td>{String(entry.before ?? '')}</td><td>{String(entry.after ?? '')}</td><td>{t(`reason.${entry.reasonKey}` as never)}</td></tr>)}</tbody></table></div>}
    </>}
    <div className="actions"><button className="secondary" type="button" onClick={onBack} disabled={busy}>{t('action.back')}</button><button type="button" onClick={onProcessAll} disabled={busy || !result}>{t('action.processAll')}</button></div>
  </div>;
}
