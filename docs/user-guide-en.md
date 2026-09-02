# DataFixer User Guide — V1 + approved market extensions

## What DataFixer does
DataFixer is a local-first browser tool for cleaning, merging, exact-key lookup, and validating CSV and Excel (XLSX) files. Customer file contents are not uploaded to an application server during processing, and source files are never overwritten.

## Supported files and limits
- Input: CSV (UTF-8 / UTF-8 BOM) and XLSX
- Maximum 20MiB per file
- Maximum 50MiB total per job
- Maximum 10 files per job
- Current Chrome, Edge, and Firefox are the V1 release targets.
- Safari is not officially supported in V1.

## Basic workflow
1. Choose Clean, Merge, Lookup, or Validate.
2. Choose files. Merge accepts multiple files; Lookup requires exactly two files (first = base, second = reference).
3. For XLSX files, choose the worksheet to process.
4. Configure rules, Merge mappings, or Lookup keys/value mappings, or load a saved settings JSON file.
5. Run the preview to inspect an estimate based on up to the first 200 data rows.
6. Click Process all rows to run the complete job.
7. Confirm row reconciliation and download the results.

## Clean
Clean can trim whitespace, collapse spaces, normalize empty values, change letter case, normalize dates and numbers, find and replace literal text, replace text by regular-expression pattern, fill empty values with defaults, fill an empty target from the first available fallback column, rename columns, keep selected columns, and remove duplicates. Invalid dates and numbers are rejected instead of being partially coerced. Pattern Replace example: replacing `[^0-9]+` with an empty string converts `(010) 1234-5678` to `01012345678`. New Pattern Replace rules start with an empty pattern for safety and fail preflight until a valid pattern is entered.

## Merge
Merge maps different source column names into one output schema. Missing target columns are filled with null values. An optional source-file column can be added. Duplicates can be removed using selected key columns. Type conflicts are not silently converted; the original conflicting row is rejected with a reason.

## Lookup
Lookup joins two files using **exact keys** such as SKU, customer ID, or email. The first file is the base file and the second is the reference file. Base and reference key counts must match, and composite keys are supported. Exactly one reference match adds the selected reference values as new result columns. Zero matches are rejected, and multiple exact reference matches are rejected rather than guessed. Number `1` and string `"1"` are different keys. Evidence for added values records the exact reference source row that supplied the value.

## Validate
Validate supports required values, data types, uniqueness, allowed values, numeric ranges, text length, regular expressions, and comparisons between two columns. If one row fails multiple rules, every applicable reason is retained while the row is counted once as rejected.

## Row statuses
- `UNCHANGED`: the rule set did not change the row or its output structure.
- `CHANGED`: a value, Merge output structure, or Lookup-added value changed.
- `REMOVED`: an explicit rule such as deduplication removed the row.
- `REJECTED`: the row could not safely enter the normal result.

DataFixer requires `input rows = unchanged + changed + removed + rejected`. If the equation fails, the job is not presented as a valid completed result.

## Downloads
- Result XLSX: normal output, evidence, and summary
- Rejected XLSX: rejected rows plus their complete evidence history
- HTML report: summary, rule evidence, source hash, and settings hash
- Settings JSON: reusable Clean/Validate rules, Merge mappings, or Lookup settings

DataFixer never overwrites the source file with the same filename.

## Common errors
`EMPTY_FILE`, `UNSUPPORTED_FILE`, `FILE_TOO_LARGE`, `JOB_TOO_LARGE`, `TOO_MANY_FILES`, `DUPLICATE_SOURCE_NAME`, `MISSING_COLUMN`, `INVALID_RULE`, `PARSE_FAILED`, `EXPORT_FAILED`, and `RECONCILIATION_FAILED` are presented with user-facing explanations in the UI.

## Privacy and security
V1 is designed not to transmit customer file bytes, column names, cell values, settings, or evidence to analytics or application APIs. Once the page and worker are loaded, the current job is designed to continue if the browser is taken offline. Before release, this promise must be verified with a real browser network inspection showing zero customer-data transmission.
