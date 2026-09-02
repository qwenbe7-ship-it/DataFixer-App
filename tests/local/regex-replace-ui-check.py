from pathlib import Path
root = Path(__file__).resolve().parents[2]
rules = (root / 'src/ui/RuleEditor.tsx').read_text()
checks = {
    'clean kind list contains regexReplace': "'regexReplace'" in rules.split('const VALIDATION_KINDS')[0],
    'new rule factory creates safe regexReplace': "case 'regexReplace'" in rules and "pattern: ''" in rules and "replaceAll: true" in rules and "caseInsensitive: false" in rules,
    'pattern input rendered': "t('rules.pattern')" in rules and 'rule.pattern' in rules,
    'replacement input rendered': "t('rules.replacement')" in rules and 'rule.replacement' in rules,
    'replace all control rendered': "t('rules.replaceAll')" in rules and 'rule.replaceAll' in rules,
    'case insensitive control rendered': "t('rules.caseInsensitive')" in rules and 'rule.caseInsensitive' in rules,
}
missing = [name for name, ok in checks.items() if not ok]
if missing:
    raise SystemExit('FAIL regex-replace-ui-check: ' + '; '.join(missing))
print('PASS regex-replace-ui-check')
