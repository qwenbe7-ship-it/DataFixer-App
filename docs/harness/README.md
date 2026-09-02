# DataFixer Harness Operations

This is the operating guide for a fresh coding agent. The repository, not chat memory, owns the workflow.

## First five minutes in a new session

1. Read root `AGENTS.md` and the nearest nested `AGENTS.md` for the area you will touch.
2. Read `docs/ARCHITECTURE.md`.
3. Read `docs/REPO_MAP.md` before broad code search.
4. Run `git status --short --branch` and work in a branch/worktree for non-trivial changes.
5. Run the smallest relevant baseline check before editing.

## Feature flow

```text
approved requirement
→ spec if required by docs/specs/README.md
→ isolated worktree
→ focused RED
→ minimal GREEN
→ Golden Dataset update when customer-visible
→ repo map regeneration
→ python scripts/verify.py local
→ spec review
→ code-quality review
→ commit/PR
```

Use `.agents/skills/datafixer-feature/SKILL.md` as the reusable procedure.

## Bugfix flow

```text
reproduce real symptom
→ regression test RED
→ root-cause fix
→ focused GREEN
→ full local verify
→ preserve the regression permanently
```

Never change the expected result merely to match a broken implementation.

## Release flow

### Before the first committed lockfile

1. `python scripts/verify.py local`
2. Push the verified commit to a dedicated DataFixer GitHub repository.
3. Manually run `.github/workflows/bootstrap-lockfile.yml`.
4. The workflow publishes the `datafixer-package-lock` artifact only after the bootstrap official gates PASS.
5. Review/download that verified artifact, then commit `package-lock.json`; never use a lockfile from a failed bootstrap run.

### Normal releases after lockfile bootstrap

1. `python scripts/verify.py local`
2. `node scripts/validate-lockfile.mjs`
3. `./scripts/production-preflight.sh`
4. `python scripts/verify.py official`
5. Require the GitHub `production-gates.yml` workflow to be green.
6. Verify `docs/release-checklist.md`, real XLSX round-trip, browser privacy and promised browser matrix.

Use `.agents/skills/datafixer-release/SKILL.md`. Any `BLOCKED` official check means paid/public release remains NO-GO.

## Verification evidence

`verify-report.json` is runtime evidence and is intentionally gitignored. It records commit/branch/dirty state, commands, duration, exit codes and PASS/FAIL/BLOCKED.

`docs/QUALITY_SCORE.md` summarizes durable evidence. `docs/TECH_DEBT.md` owns unresolved blockers. Do not copy transient logs into those files.

## Golden Dataset

`tests/golden/manifest.json` is the representative customer-workflow index. Every case points to actual repository example files/settings and declares the reconciled expected summary plus required evidence reasons.

Add a Golden case when a change affects a meaningful customer workflow. Focused unit/local tests still own narrow edge cases.

## Repo map

Run `python scripts/generate-repo-map.py` after changing source files/imports/exports. CI/local harness checks freshness with `--check`.

## CI contract

GitHub Actions first validates repository harness structure and the production-unblock contracts. The one-time bootstrap workflow may generate a lockfile artifact but does not mutate the repository. The normal production job requires a reviewed, committed lockfile, validates it, installs from it, runs the local harness with real dependencies, then runs official production gates. CI must not manufacture a release PASS from an absent, repaired or unreviewed lockfile.
