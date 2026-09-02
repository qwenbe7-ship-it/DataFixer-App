import type { AppMode } from '../app/app-reducer';
import type { Translator } from '../i18n';

interface Props {
  t: Translator;
  onSelect: (mode: AppMode) => void;
}

export function ModePicker({ t, onSelect }: Props) {
  const modes: AppMode[] = ['clean', 'merge', 'lookup', 'validate'];
  return (
    <div className="mode-grid">
      {modes.map((mode) => (
        <button className="mode-card" key={mode} type="button" onClick={() => onSelect(mode)}>
          <strong>{t(`mode.${mode}.title`)}</strong>
          <span>{t(`mode.${mode}.description`)}</span>
        </button>
      ))}
    </div>
  );
}
