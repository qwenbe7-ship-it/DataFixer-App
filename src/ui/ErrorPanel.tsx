import type { DataFixerError } from '../domain/errors';
import type { Translator } from '../i18n';

interface Props { error: DataFixerError | null; t: Translator; }

export function ErrorPanel({ error, t }: Props) {
  if (!error) return null;
  return (
    <aside className="error-panel" role="alert" aria-live="assertive">
      <strong>{t('error.heading')}</strong>
      <p>{t(`error.${error.code}`)}</p>
      {Object.keys(error.details).length > 0 && (
        <details>
          <summary>{t('common.details')}</summary>
          <pre>{JSON.stringify(error.details, null, 2)}</pre>
        </details>
      )}
    </aside>
  );
}
