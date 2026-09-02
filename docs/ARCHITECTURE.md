# DataFixer Architecture

## Purpose

This document describes stable boundaries for agents and reviewers. It is intentionally shorter than implementation history. `docs/REPO_MAP.md` is generated navigation detail; this file defines the rules.

## Runtime shape

```text
main.tsx
  -> app/App.tsx (composition root)
       -> UI components
       -> file IO / limits
       -> worker client
       -> downloads / settings

worker/data.worker.ts
  -> file IO
  -> app/process-job.ts
       -> Clean / Merge / Lookup / Validate engines
       -> evidence ledger + hashes
  -> XLSX / HTML / settings exports
```

## Stable areas

- **domain** — value types, settings contracts, errors, factories. Lowest-level code.
- **rules** — deterministic transformation/validation engines and regex safety.
- **evidence** — reconciliation, final status ledger and deterministic hashes.
- **file-io** — file/job limits, SheetJS reading and row/header normalization.
- **export** — workbook models, XLSX adapter, HTML report, settings serialization and download helpers.
- **app** — reducer/orchestration plus `App.tsx` composition root.
- **ui** — React UI components and typed input helpers.
- **worker** — browser worker protocol/client/runtime and source identity.
- **i18n** — Korean/English product strings and reason text.

## Dependency rules

The machine-enforced baseline lives in `tests/harness/architecture-check.py`.

- `domain` imports no other `src` area.
- `rules` may depend on `domain` and other rule utilities, not app/UI/worker/export/file IO/evidence.
- `evidence` may depend on `domain` and evidence siblings, not rules/app/UI/worker/export/file IO.
- `file-io` may depend on `domain` and file-io siblings.
- `ui` must not bypass orchestration by importing worker/evidence/export/rule engines directly.
- `worker` must not import UI/i18n.
- `app/process-job.ts` is application-core orchestration and must not depend on UI, worker, export, file-io or i18n.
- `app/App.tsx` is the explicit composition-root exception: it may wire UI, worker, file IO and export/download adapters.

## Product invariants

1. Same input identity + settings => deterministic processing outcome.
2. Source files are immutable.
3. Every input row belongs to exactly one final status partition.
4. Removed/rejected rows require evidence reasons.
5. Ambiguous lookup never picks a winner silently.
6. Runtime customer data has no external network path.
7. Official browser/XLSX/privacy evidence is required before release GO.

## Change guidance

Prefer adding capability to the narrowest owning area. If a feature requires multiple areas, define the domain contract first, then engine/application integration, then UI/worker/export adapters. Update Golden Dataset cases when customer-observable behavior changes.
