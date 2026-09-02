from pathlib import Path
root = Path(__file__).resolve().parents[2]
kind = (root / 'src/domain/rule-kinds.ts').read_text()
process = (root / 'src/app/process-job.ts').read_text()
job = (root / 'src/export/job-settings.ts').read_text()
settings = (root / 'src/export/settings-export.ts').read_text()
ui = (root / 'src/ui/RuleEditor.tsx').read_text()
checks = {
    'shared clean kinds include regexReplace': "'regexReplace'" in kind,
    'process job uses shared kind predicate': 'isCleanRuleKind' in process and 'const CLEAN_RULE_KINDS' not in process,
    'job settings uses shared kind predicate': 'isCleanRuleKind' in job and 'const CLEAN_RULE_KINDS' not in job,
    'settings parser uses shared kind predicate': 'isCleanRuleKind' in settings and 'const CLEAN_KINDS' not in settings,
    'rule editor uses shared ordered kind list': 'CLEAN_RULE_KINDS' in ui and 'const CLEAN_KINDS' not in ui,
}
missing = [name for name, ok in checks.items() if not ok]
if missing:
    raise SystemExit('FAIL rule-kind-contract-check: ' + '; '.join(missing))
print('PASS rule-kind-contract-check')
