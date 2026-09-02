# DataFixer Harness V1 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make DataFixer self-describing and self-verifying for fresh Codex/ChatGPT sessions without changing product behavior.

**Architecture:** Keep existing product code untouched. Add a thin repository harness around it: scoped instructions and skills for context, generated repo mapping for navigation, structural and golden checks for correctness, a unified verification reporter, and CI integration for official evidence.

**Tech Stack:** Git, Markdown, Python 3 standard library, Bash, TypeScript/global `tsc`, existing Vitest/Playwright/Vite when dependencies are available.

**Spec:** `docs/superpowers/specs/2026-09-01-datafixer-harness-v1-design.md`

## Global Constraints

- No business-logic behavior change in this phase.
- Preserve the existing 53 local regression gates.
- Do not require new npm dependencies.
- Current npm/network production blockers must remain visible.
- All generated reports and maps must be deterministic except timestamps/durations in runtime reports.
- `AGENTS.md` stays concise and points to detailed sources of truth.

---

### Task 1: Harness contract and Codex-native instructions

**Files:**
- Create: `tests/harness/harness-contract-check.py`
- Create: `AGENTS.md`
- Create: `src/rules/AGENTS.md`
- Create: `src/worker/AGENTS.md`
- Create: `tests/AGENTS.md`
- Create: `.agents/skills/datafixer-feature/SKILL.md`
- Create: `.agents/skills/datafixer-release/SKILL.md`

**Interfaces:**
- Produces the required repository instruction surface validated by the harness contract.

- [ ] Write `harness-contract-check.py` first so it fails while the required files are absent.
- [ ] Run it and verify the missing-file failure.
- [ ] Add concise scoped instructions and two repository-local workflow skills.
- [ ] Re-run the contract and verify PASS.
- [ ] Commit the task.

### Task 2: Architecture map and structural dependency gate

**Files:**
- Create: `docs/ARCHITECTURE.md`
- Create: `scripts/generate-repo-map.py`
- Create: `docs/REPO_MAP.md`
- Create: `tests/harness/architecture-check.py`

**Interfaces:**
- `python scripts/generate-repo-map.py --check` exits nonzero when `docs/REPO_MAP.md` is stale.
- `python tests/harness/architecture-check.py` exits nonzero on a forbidden `src` import edge.

- [ ] Write architecture check with a temporary forbidden-import fixture and verify RED.
- [ ] Implement the dependency rules and verify the current source tree passes.
- [ ] Implement deterministic repo-map generation and generate the baseline map.
- [ ] Verify `--check` passes and deliberate stale content fails in an isolated temp copy.
- [ ] Commit the task.

### Task 3: Spec-Kit-light, review gates, quality and debt sources of truth

**Files:**
- Create: `docs/specs/README.md`
- Create: `docs/specs/_template.md`
- Create: `docs/reviews/SPEC_REVIEW.md`
- Create: `docs/reviews/CODE_REVIEW.md`
- Create: `docs/QUALITY_SCORE.md`
- Create: `docs/TECH_DEBT.md`
- Modify: `tests/harness/harness-contract-check.py`

**Interfaces:**
- Harness contract verifies no required template/checklist/score/debt source disappears.

- [ ] Extend the contract first and verify RED.
- [ ] Add the documents with explicit ownership and evidence rules.
- [ ] Re-run contract and verify PASS.
- [ ] Commit the task.

### Task 4: Golden Dataset manifest and executable evaluation

**Files:**
- Create: `tests/golden/manifest.json`
- Create: `tests/local/golden-dataset-check.ts`
- Create: `tests/local/tsconfig.golden-dataset.json`
- Modify: `tests/local/run-regression.sh`

**Interfaces:**
- Golden manifest entries contain `id`, `mode`, `inputs`, `settings`, `expectedSummary`, `requiredReasonKeys`.
- Golden check executes every entry and prints `PASS golden-dataset-check cases=6`.

- [ ] Write the check and tsconfig before creating the manifest; verify RED because the manifest is missing.
- [ ] Add six manifest cases and implement execution through existing parser/process/export paths.
- [ ] Run and verify all six cases PASS.
- [ ] Add it to the local regression suite.
- [ ] Commit the task.

### Task 5: Unified verification and machine-readable report

**Files:**
- Create: `scripts/verify.py`
- Create: `tests/harness/verify-script-check.py`
- Modify: `.gitignore`

**Interfaces:**
- `python scripts/verify.py local --report <path>` writes schema version 1 JSON.
- Report fields: `schemaVersion`, `mode`, `git`, `startedAt`, `finishedAt`, `overallStatus`, `checks`.
- Each check has `name`, `command`, `status`, `exitCode`, `durationMs`, `stdoutTail`, `stderrTail`.

- [ ] Write verify-script contract tests and verify RED.
- [ ] Implement local/official/all modes using only stdlib subprocess/json.
- [ ] Verify a mocked PASS and FAIL command are represented accurately.
- [ ] Run the real local mode and require PASS.
- [ ] Commit the task.

### Task 6: CI integration and final harness audit

**Files:**
- Modify: `.github/workflows/production-gates.yml`
- Modify: `README.md`
- Create: `docs/harness/README.md`
- Modify: `tests/harness/harness-contract-check.py`

**Interfaces:**
- CI runs harness checks before networked production checks.
- README exposes one local command: `python scripts/verify.py local`.

- [ ] Extend the harness contract for CI/docs and verify RED.
- [ ] Add CI local-harness job/steps before official gates and keep official failures visible.
- [ ] Add operator documentation explaining normal feature, bugfix and release flows.
- [ ] Regenerate repo map.
- [ ] Run all harness checks, the complete existing local regression, and unified verify local.
- [ ] Run official preflight to confirm current BLOCKED state is reported honestly.
- [ ] Review the final diff against `SPEC_REVIEW.md` and `CODE_REVIEW.md`.
- [ ] Commit the task.
