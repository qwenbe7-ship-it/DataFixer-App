import type { EvidenceEntry, ProcessingResult } from '../domain/types';

export type ReportLocale = 'ko' | 'en';

const TEXT = {
  ko: {
    title: 'DataFixer 처리 보고서',
    summary: '처리 요약',
    inputRows: '전체 행',
    unchangedRows: '변경 없음',
    changedRows: '변경',
    removedRows: '제거',
    rejectedRows: '오류/보류',
    reconciled: '행 수 검증',
    sourceHash: '입력 식별 해시',
    settingsHash: '설정 식별 해시',
    rules: '적용 규칙',
    evidence: '처리 근거',
    ruleId: '규칙 ID',
    count: '처리 건수',
    rowId: '행 ID',
    status: '상태',
    column: '열',
    before: '변경 전',
    after: '변경 후',
    reason: '이유',
    params: '세부 정보',
    yes: '정상',
    no: '불일치',
    none: '없음',
  },
  en: {
    title: 'DataFixer Processing Report',
    summary: 'Processing summary',
    inputRows: 'Input rows',
    unchangedRows: 'Unchanged',
    changedRows: 'Changed',
    removedRows: 'Removed',
    rejectedRows: 'Rejected',
    reconciled: 'Reconciled',
    sourceHash: 'Source hash',
    settingsHash: 'Settings hash',
    rules: 'Applied rules',
    evidence: 'Processing evidence',
    ruleId: 'Rule ID',
    count: 'Entries',
    rowId: 'Row ID',
    status: 'Status',
    column: 'Column',
    before: 'Before',
    after: 'After',
    reason: 'Reason',
    params: 'Details',
    yes: 'PASS',
    no: 'MISMATCH',
    none: 'None',
  },
} as const;


const REASONS: Record<ReportLocale, Record<string, string>> = {
  ko: {
    'clean.trimmed': '앞뒤 공백을 제거했습니다.',
    'clean.spacesCollapsed': '연속된 공백을 하나로 줄였습니다.',
    'clean.emptyNormalized': '지정된 빈 값 표현을 공통 빈 값으로 바꿨습니다.',
    'clean.caseChanged': '문자 대소문자 형식을 바꿨습니다.',
    'clean.dateParsed': '날짜 값을 표준 형식으로 바꿨습니다.',
    'clean.invalidDate': '유효한 날짜로 해석할 수 없어 보류했습니다.',
    'clean.numberParsed': '숫자 값을 표준 숫자 형식으로 바꿨습니다.',
    'clean.invalidNumber': '유효한 숫자로 해석할 수 없어 보류했습니다.',
    'clean.replaced': '지정한 문자열을 찾아 바꿨습니다.',
    'clean.regexReplaced': '정규식 패턴과 일치한 문자열을 바꿨습니다.',
    'clean.defaultFilled': '빈 값에 기본값을 채웠습니다.',
    'clean.coalesced': '비어 있는 대상에 첫 번째 사용 가능한 값을 채웠습니다.',
    'clean.columnRenamed': '열 이름을 변경했습니다.',
    'clean.columnsFiltered': '선택하지 않은 열을 제외했습니다.',
    'clean.duplicateRemoved': '중복된 행이라 제거했습니다.',
    'merge.mapped': '원본 행을 통합 결과 구조에 맞게 변환했습니다.',
    'merge.duplicateRemoved': '통합 결과에서 중복된 행이라 제거했습니다.',
    'merge.typeConflict': '통합 대상 열의 자료형이 서로 달라 해당 행을 보류했습니다.',
    'lookup.valueAdded': '정확히 일치한 참고 행에서 값을 가져왔습니다.',
    'lookup.notFound': '정확히 일치하는 참고 행을 찾지 못했습니다.',
    'lookup.multipleMatches': '같은 키의 참고 행이 여러 개라 한 행을 안전하게 선택할 수 없습니다.',
    'validate.required': '필수값이 비어 있습니다.',
    'validate.type': '값의 자료형이 요구 조건과 다릅니다.',
    'validate.unique': '중복이 허용되지 않는 값이 반복되었습니다.',
    'validate.allowed': '허용된 값 목록에 없는 값입니다.',
    'validate.numberRange': '숫자가 허용 범위를 벗어났습니다.',
    'validate.length': '문자열 길이가 허용 범위를 벗어났습니다.',
    'validate.regex': '값이 요구된 형식과 일치하지 않습니다.',
    'validate.columnCompare': '두 열 사이의 비교 조건을 만족하지 않습니다.',
  },
  en: {
    'clean.trimmed': 'Removed leading and trailing whitespace.',
    'clean.spacesCollapsed': 'Collapsed repeated whitespace.',
    'clean.emptyNormalized': 'Normalized a configured empty-value marker.',
    'clean.caseChanged': 'Changed letter casing.',
    'clean.dateParsed': 'Converted the date to the standard format.',
    'clean.invalidDate': 'Rejected because the value is not a valid date.',
    'clean.numberParsed': 'Converted the value to a standard number.',
    'clean.invalidNumber': 'Rejected because the value is not a valid number.',
    'clean.replaced': 'Replaced the configured text.',
    'clean.regexReplaced': 'Replaced text matching the regular expression pattern.',
    'clean.defaultFilled': 'Filled an empty value with the configured default.',
    'clean.coalesced': 'Filled the empty target with the first available source value.',
    'clean.columnRenamed': 'Renamed the column.',
    'clean.columnsFiltered': 'Removed columns that were not selected.',
    'clean.duplicateRemoved': 'Removed a duplicate row.',
    'merge.mapped': 'Mapped the source row into the merged output structure.',
    'merge.duplicateRemoved': 'Removed a duplicate row from the merged result.',
    'merge.typeConflict': 'Rejected the row because merged column types conflict.',
    'lookup.valueAdded': 'Added a value from the single exact reference match.',
    'lookup.notFound': 'No exact reference row matched this key.',
    'lookup.multipleMatches': 'Multiple reference rows share this key, so no row was selected automatically.',
    'validate.required': 'A required value is missing.',
    'validate.type': 'The value has the wrong data type.',
    'validate.unique': 'A value that must be unique is duplicated.',
    'validate.allowed': 'The value is not in the allowed-value list.',
    'validate.numberRange': 'The number is outside the allowed range.',
    'validate.length': 'The text length is outside the allowed range.',
    'validate.regex': 'The value does not match the required pattern.',
    'validate.columnCompare': 'The comparison between the two columns failed.',
  },
};

function escapeHtml(value: unknown): string {
  const text = value === null || value === undefined ? '' : String(value);
  return text
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

function canonicalJson(value: unknown): string {
  if (value === null || typeof value !== 'object') return JSON.stringify(value);
  if (Array.isArray(value)) return `[${value.map(canonicalJson).join(',')}]`;
  const object = value as Record<string, unknown>;
  return `{${Object.keys(object).sort().map((key) => `${JSON.stringify(key)}:${canonicalJson(object[key])}`).join(',')}}`;
}

function ruleCounts(evidence: EvidenceEntry[]): Array<[string, number]> {
  const counts = new Map<string, number>();
  for (const entry of evidence) counts.set(entry.ruleId, (counts.get(entry.ruleId) ?? 0) + 1);
  return [...counts.entries()];
}

function cell(value: unknown): string {
  return `<td>${escapeHtml(value)}</td>`;
}

export function buildHtmlReport(result: ProcessingResult, locale: ReportLocale): string {
  if (locale !== 'ko' && locale !== 'en') throw new Error('UNSUPPORTED_LOCALE');
  const t = TEXT[locale];
  const { summary } = result;
  const rules = ruleCounts(result.evidence);

  const summaryRows: Array<[string, unknown]> = [
    [t.inputRows, summary.inputRows],
    [t.unchangedRows, summary.unchangedRows],
    [t.changedRows, summary.changedRows],
    [t.removedRows, summary.removedRows],
    [t.rejectedRows, summary.rejectedRows],
    [t.reconciled, summary.reconciled ? t.yes : t.no],
    [t.sourceHash, result.sourceHash],
    [t.settingsHash, result.settingsHash],
  ];

  const rulesHtml = rules.length === 0
    ? `<p>${escapeHtml(t.none)}</p>`
    : `<table><thead><tr><th>${escapeHtml(t.ruleId)}</th><th>${escapeHtml(t.count)}</th></tr></thead><tbody>${rules.map(([id, count]) => `<tr>${cell(id)}${cell(count)}</tr>`).join('')}</tbody></table>`;

  const evidenceHtml = result.evidence.length === 0
    ? `<p>${escapeHtml(t.none)}</p>`
    : `<table><thead><tr><th>${escapeHtml(t.rowId)}</th><th>${escapeHtml(t.ruleId)}</th><th>${escapeHtml(t.status)}</th><th>${escapeHtml(t.column)}</th><th>${escapeHtml(t.before)}</th><th>${escapeHtml(t.after)}</th><th>${escapeHtml(t.reason)}</th><th>${escapeHtml(t.params)}</th></tr></thead><tbody>${result.evidence.map((entry) => `<tr>${cell(entry.rowId)}${cell(entry.ruleId)}${cell(entry.status)}${cell(entry.column ?? '')}${cell(entry.before ?? '')}${cell(entry.after ?? '')}${cell(`${REASONS[locale][entry.reasonKey] ?? entry.reasonKey} (${entry.reasonKey})`)}${cell(canonicalJson(entry.reasonParams))}</tr>`).join('')}</tbody></table>`;

  return `<!doctype html>
<html lang="${locale}">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>${escapeHtml(t.title)}</title>
<style>
body{font-family:system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;margin:32px;color:#111;line-height:1.45}main{max-width:1200px;margin:0 auto}h1,h2{line-height:1.2}table{border-collapse:collapse;width:100%;margin:12px 0 28px}th,td{border:1px solid #d0d0d0;padding:8px;text-align:left;vertical-align:top;word-break:break-word}th{background:#f3f4f6}.hash{font-family:ui-monospace,monospace;word-break:break-all}
</style>
</head>
<body><main>
<h1>${escapeHtml(t.title)}</h1>
<h2>${escapeHtml(t.summary)}</h2>
<table><tbody>${summaryRows.map(([label, value]) => `<tr><th>${escapeHtml(label)}</th>${cell(value)}</tr>`).join('')}</tbody></table>
<h2>${escapeHtml(t.rules)}</h2>
${rulesHtml}
<h2>${escapeHtml(t.evidence)}</h2>
${evidenceHtml}
</main></body></html>`;
}
