from pathlib import Path

rule_editor = Path('src/ui/RuleEditor.tsx').read_text()
ko = Path('src/i18n/ko.ts').read_text()
en = Path('src/i18n/en.ts').read_text()

assert "settings.outputTypes" in rule_editor, 'merge editor must expose outputTypes'
assert "merge.outputTypes" in rule_editor, 'merge editor must label output type controls'
for text in (ko, en):
    assert "'merge.outputTypes'" in text, 'both locales need output type label'
    assert "'merge.outputTypeHelp'" in text, 'both locales need output type help'
print('PASS merge-output-types-ui-check')
