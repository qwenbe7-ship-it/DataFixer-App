# Step 19 — Regex Replace / Pattern Normalize

## Why this extension exists
Public paid spreadsheet/CSV work repeatedly asks for deterministic normalization such as removing punctuation from phone numbers, stripping separators from SKUs, or reformatting codes. Step 19 adds one reusable Clean rule instead of creating one-off scripts for each job.

## Rule contract

```ts
{
  id: string;
  kind: 'regexReplace';
  column: string;
  pattern: string;
  replacement: string;
  replaceAll: boolean;
  caseInsensitive: boolean;
}
```

## Behavior
- Operates only on string cells. `null`, numbers, and booleans remain unchanged.
- An empty pattern is rejected before processing with `INVALID_RULE`.
- An invalid regular expression is rejected before processing with `INVALID_RULE`.
- `replaceAll=true` applies a global replacement; otherwise only the first match is replaced.
- `caseInsensitive=true` adds case-insensitive matching.
- JavaScript replacement groups such as `$1`, `$2`, and `$&` are supported.
- A match that produces no value change emits no `CHANGED` evidence.
- Changed values emit `clean.regexReplaced` evidence with before/after values.
- Rule order remains deterministic; a later `changeCase` can safely run after separator removal.

## Safe UI default
The UI creates a new Pattern Replace rule with an empty pattern. It does not prefill a destructive phone/SKU pattern. The user must enter a pattern before the job can pass engine preflight.

## Real example
Files:
- `public/examples/pattern-normalize.csv`
- `public/examples/pattern-normalize-settings.json`

The example applies:
1. `[^0-9]+` → empty string on `phone`.
2. `[-\s]+` → empty string on `sku`.
3. uppercase conversion on `sku`.

Expected examples:
- `(010) 1234-5678` → `01012345678`
- `010.9876.5432` → `01098765432`
- `ab- 001` → `AB001`
- `ZZ-003` → `ZZ003`

All three example rows reconcile as `CHANGED`; no row is rejected.

## Integration hardening
During file-level verification, `regexReplace` was accepted by the rule parser but initially omitted from the `processDatasets` Clean-mode allowlist. The real CSV example caught this integration defect. The root cause was duplicated rule-kind lists across UI, settings parsing, job settings, and processing. Step 19 centralizes ordered rule-kind definitions and predicates in `src/domain/rule-kinds.ts`.

## Verification
Final local regression after integration: **50 local gates PASS**.

Local checks cover:
- direct regex replacement behavior;
- global and capture-group replacements;
- case-insensitive replacement;
- unchanged/non-string behavior;
- invalid/empty pattern preflight;
- Settings JSON round trip and rejection of malformed settings;
- bilingual dictionary parity and human-readable report reason;
- UI controls and safe empty default;
- real CSV file → workbook reader → job settings → Clean engine → evidence/report flow;
- shared rule-kind contract to prevent future allowlist drift;
- Playwright E2E asset for the pattern-normalize example.

Official Vitest, Playwright, real SheetJS, lint, and production-build gates remain blocked in the current environment because project dependencies are unavailable from npm. This step is not a production-release claim.
