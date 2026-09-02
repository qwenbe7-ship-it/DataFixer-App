# DataFixer

DataFixer is a local-first browser application for repeatable CSV and Excel cleanup, merge, lookup, validation, and evidence workflows.

## Privacy model

Customer workbook bytes, cell data, job settings, and generated evidence are processed in the browser. The application is designed without an application backend for customer spreadsheet content.

## Supported inputs and limits

- UTF-8 CSV, including BOM
- Selected worksheets from XLSX files
- Up to 10 input files per job
- Up to 20 MiB per file
- Up to 50 MiB total per job

## Outputs

Depending on the workflow, DataFixer can produce cleaned or merged XLSX output, rejected-row output, HTML evidence reports, and reusable JSON settings.

## Development

Requirements: Node.js `>=22.13.0`.

```bash
npm ci --ignore-scripts
npm run test:unit
npm run test:browser
npm run lint
npm run build
npm run test:e2e
```

Run the public repository boundary check with:

```bash
npm run verify:public-boundary
```

## Production verification

GitHub Actions runs the repository harness and official production gates on pull requests and `main`. The production matrix includes deterministic lockfile validation, unit tests, browser tests, lint, TypeScript/build verification, Playwright coverage, and XLSX workflow checks.

Vercel hosting headers are defined in `vercel.json`. The production Content Security Policy forbids framing and restricts scripts, connections, workers, objects, base URIs, and form actions.

## Repository scope

This public repository contains application source, tests, build/verification tooling, technical documentation, and public example data. Internal commercial strategy, pricing strategy, sales-channel plans, operating SOPs, prospecting material, credentials, and customer-specific material are intentionally kept outside this repository.
