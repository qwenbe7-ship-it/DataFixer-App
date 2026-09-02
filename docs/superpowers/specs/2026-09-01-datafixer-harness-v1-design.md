# DataFixer Harness V1 Design

## Purpose

Turn DataFixer from a project that is operated correctly because the current chat remembers the rules into a repository that makes the correct workflow discoverable, repeatable, and mechanically enforced for a fresh Codex/ChatGPT agent.

## Approved composition

DataFixer Harness V1 combines the highest-value parts of the previously approved research:

- **Codex-native instructions:** concise root `AGENTS.md`, scoped nested `AGENTS.md`, repository-local skills.
- **Spec-Kit-light:** one feature spec source of truth, without duplicating full PRD/architecture/story artifacts for small changes.
- **Superpowers execution discipline:** isolated worktree, TDD, verification before completion, spec review then code-quality review.
- **Repo-map context efficiency:** generated symbol/import map rather than repeatedly reading the whole repository.
- **Golden evaluations:** versioned representative CSV/settings cases with explicit expected summaries.
- **CI as source of truth:** local harness for fast feedback and GitHub Actions for official production gates.
- **Capability-based safety:** static architecture/privacy checks and no release claim without executable evidence.

## Non-goals

- Do not add a second agent platform such as OpenHands.
- Do not install BMAD or full Spec Kit.
- Do not change DataFixer business logic in this harness phase.
- Do not duplicate the existing 53 local checks.
- Do not claim official production PASS while npm/network remains unavailable.

## Repository instruction hierarchy

`AGENTS.md` is a concise map, not a knowledge dump. It defines product invariants, required workflow, commands, and document pointers.

Nested files add only area-specific rules:

- `src/rules/AGENTS.md`: deterministic rule engine and evidence requirements.
- `src/worker/AGENTS.md`: worker isolation, no-network and transfer/progress constraints.
- `tests/AGENTS.md`: RED→GREEN, golden/e2e expectations, no weakening assertions to make failures disappear.

Detailed process belongs in repository-local skills under `.agents/skills/`.

## Spec-Kit-light

Create `docs/specs/README.md` and `docs/specs/_template.md`.

- Bug/small bounded change: issue/test is sufficient; no new spec required.
- Medium feature: one concise feature spec using the template.
- Architectural change: full design in `docs/superpowers/specs/` plus implementation plan.

Each spec must name success criteria, non-goals, invariants, inputs/outputs, error behavior, and verification evidence.

## Architecture map and enforcement

`docs/ARCHITECTURE.md` records stable boundaries. `scripts/generate-repo-map.py` generates `docs/REPO_MAP.md` from TypeScript imports and exported declarations.

A structural check fails on forbidden dependencies:

- `domain` cannot import another `src` area.
- `rules` cannot import app/ui/worker/export/file-io/i18n/evidence.
- `evidence` cannot import app/ui/worker/export/file-io/i18n/rules.
- `file-io` cannot import app/ui/worker/export/i18n/rules/evidence.
- `ui` cannot import worker/evidence/export/rules directly.
- `worker` cannot import ui/i18n.
- `app/process-job.ts` cannot import ui/worker/export/file-io/i18n.
- `src/main.tsx` is only a composition entry and may import `app/App` plus framework packages.

`src/app/App.tsx` is an explicit composition-root exception because it wires UI, worker, file IO and downloads.

## Golden dataset

`tests/golden/manifest.json` is the versioned index for six representative workflows:

1. Clean orders.
2. Merge two schemas.
3. Exact Lookup.
4. Validate contacts.
5. Pattern Normalize.
6. Fill / Default / Coalesce.

Each entry records mode, input files, settings file, expected summary and required evidence reason keys. The manifest references existing customer-facing examples rather than duplicating source files.

`tests/local/golden-dataset-check.ts` executes the manifest through the real local parser/process/report model path using the existing XLSX adapter stub only where the environment requires it.

## Unified verification

`scripts/verify.py` is the single front door.

Modes:

- `python scripts/verify.py local`: runs the offline-capable harness and writes `verify-report.json`.
- `python scripts/verify.py official`: runs `scripts/production-gates.sh` and records the result; it may report `BLOCKED` in the current sandbox.
- `python scripts/verify.py all`: local first, official only if local passes.

The JSON report contains start/end timestamps, git commit/dirty state, each command, duration, exit code and status (`PASS`, `FAIL`, `BLOCKED`). A nonzero local failure exits nonzero.

## Review gates

Two review checklists are repository artifacts:

1. `docs/reviews/SPEC_REVIEW.md`: requirements and scope compliance.
2. `docs/reviews/CODE_REVIEW.md`: correctness, regression risk, architecture, security, maintainability and evidence.

`tests/harness/harness-contract-check.py` verifies that the repository cannot silently lose required harness components.

## Quality and debt

- `docs/QUALITY_SCORE.md`: objective current scorecard with evidence links, not a vanity score.
- `docs/TECH_DEBT.md`: active debt only, with severity, trigger and exit criteria.
- Production dependency/network blockers stay visible until cleared.

## CI

Update `.github/workflows/production-gates.yml` so pull requests run:

1. harness contract and architecture checks,
2. local offline verification,
3. dependency install,
4. lint/unit/browser/build/e2e official gates.

A generated lockfile artifact is not considered release evidence; `package-lock.json` must eventually be committed after the first trusted networked bootstrap.

## Completion criteria

Harness V1 is complete only when:

- all required harness artifacts exist;
- repo map generation is deterministic;
- architecture violations are machine-detected;
- golden manifest executes all six cases;
- unified local verification reports PASS and writes valid JSON;
- the pre-harness DataFixer regression remains green;
- Git history contains baseline plus harness changes;
- official production checks remain accurately reported as PASS/FAIL/BLOCKED rather than being masked.
