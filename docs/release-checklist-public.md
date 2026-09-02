# Public deployment checklist

1. Merge only after `DataFixer production gates` passes on the pull request.
2. Confirm `main` protection/ruleset requires the production gate before merge.
3. Connect the public repository to the canonical Vercel workspace.
4. Verify the preview response headers from `vercel.json`.
5. Run CSV and XLSX browser smoke tests against the preview.
6. Confirm browser network activity does not upload customer spreadsheet bytes or derived cell data.
7. Promote only the verified commit SHA to production.
8. Re-check production headers and privacy behavior after promotion.
