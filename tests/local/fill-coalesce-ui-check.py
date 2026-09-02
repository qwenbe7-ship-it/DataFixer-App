from pathlib import Path

src = Path('src/ui/RuleEditor.tsx').read_text()
ko = Path('src/i18n/ko.ts').read_text()
en = Path('src/i18n/en.ts').read_text()

assert "case 'fillDefault'" in src, 'RuleEditor must render fillDefault fields'
assert "case 'coalesce'" in src, 'RuleEditor must render coalesce fields'
assert "rules.defaultValue" in src, 'fillDefault must label typed default input'
assert "rules.sourceColumns" in src, 'coalesce must expose ordered source columns'
assert "parseAllowedValues" in src and "formatAllowedValues" in src, 'fillDefault must reuse typed literal parser/formatter'
assert "rule.fillDefault" in ko and "rule.fillDefault" in en, 'fillDefault bilingual label'
assert "rule.coalesce" in ko and "rule.coalesce" in en, 'coalesce bilingual label'
print('PASS fill-coalesce-ui-check')
