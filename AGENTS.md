# DataFixer Agent Guide

DataFixer is a local-first CSV/XLSX cleaning, merge, exact lookup, and validation product. This file is the repository map for coding agents. Keep detailed procedures in skills/docs rather than expanding this file indefinitely.

## Product invariants

- Customer file bytes stay in the browser process; runtime code must not upload customer-derived data.
- Never overwrite the customer's source file.
- Every input row ends in exactly one final status: `UNCHANGED`, `CHANGED`, `REMOVED`, or `REJECTED`.
- `inputRows = unchangedRows + changedRows + removedRows + rejectedRows` must always hold.
- Every `REMOVED` or `REJECTED` row needs a machine-readable reason and a human-readable explanation.
- Processing must be deterministic for the same input bytes, selected sheet(s), file order, and settings.
- Never guess ambiguous customer values. Reject or preserve them with evidence.
- Original Clean/Merge/Validate behavior and approved Lookup/Pattern Normalize/Fill-Coalesce extensions must remain backward compatible unless a spec explicitly approves a breaking change.

## Required workflow

1. Read this file and the nearest nested `AGENTS.md` for files you will touch.
2. For a bug, reproduce it before changing production code.
3. For a feature, use a spec when required by `docs/specs/README.md`.
4. Work on an isolated Git branch/worktree for non-trivial changes.
5. Use RED → GREEN → regression. Do not weaken assertions to hide a failure.
6. Run the smallest relevant check first, then `python scripts/verify.py local` before completion.
7. Review against `docs/reviews/SPEC_REVIEW.md` and `docs/reviews/CODE_REVIEW.md`.
8. Do not call a release complete until official production gates are executable and PASS.

## Verification commands

- Fast repository harness: `python tests/harness/harness-contract-check.py`
- Architecture: `python tests/harness/architecture-check.py`
- Repo map freshness: `python scripts/generate-repo-map.py --check`
- Full offline verification: `python scripts/verify.py local`
- Lockfile trust check: `node scripts/validate-lockfile.mjs` (after first bootstrap artifact exists)
- Production preflight: `./scripts/production-preflight.sh`
- Official gates when dependencies/network exist: `python scripts/verify.py official`
- First networked lockfile bootstrap: `.github/workflows/bootstrap-lockfile.yml`

## Source-of-truth documents

- Architecture: `docs/ARCHITECTURE.md`
- Generated navigation map: `docs/REPO_MAP.md`
- Spec policy/template: `docs/specs/README.md`, `docs/specs/_template.md`
- Release state: `docs/release-checklist.md`
- Quality score: `docs/QUALITY_SCORE.md`
- Active debt/blockers: `docs/TECH_DEBT.md`
- Harness operation: `docs/harness/README.md`
- Product history/status: `docs/step-*.md`

## Code ownership map

- `src/domain/`: stable contracts and structured errors.
- `src/rules/`: deterministic Clean/Merge/Lookup/Validate engines. Read `src/rules/AGENTS.md`.
- `src/evidence/`: reconciliation, ledger, hashes.
- `src/file-io/`: limits and CSV/XLSX normalization.
- `src/export/`: settings, workbook/HTML/download outputs.
- `src/app/`: workflow state, orchestration, React composition root.
- `src/ui/`: presentational/editing UI.
- `src/worker/`: background processing protocol/runtime. Read `src/worker/AGENTS.md`.
- `tests/`: official, local, golden and harness checks. Read `tests/AGENTS.md`.

## Scope discipline

Do not add cloud storage, analytics, authentication, payment, AI APIs, OCR, scraping, fuzzy matching, or external enrichment without an explicitly approved spec. Prefer a reusable rule or contract over one customer-specific code path.
