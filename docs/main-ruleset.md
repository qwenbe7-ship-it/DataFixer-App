# Main branch release governance

This document records the repository-level release control that complements the automated runtime and live-host release gates.

## Current status

- Tracking issue: #11 — `P1: Enforce main ruleset before further production changes`
- Target branch: `main`
- Required GitHub Actions jobs: `harness`, `production`
- Ruleset enforcement: **PENDING** until the repository ruleset is created and verified

## Required active ruleset

Target the default branch (`main`) and enable:

1. **Require a pull request before merging**
   - Required approvals: `0` for the current solo-maintainer workflow.
   - A pull request is still mandatory.
2. **Require status checks to pass before merging**
   - `harness`
   - `production`
   - Require the branch to be up to date before merging.
3. **Block force pushes**.
4. **Restrict deletions**.
5. Do not configure a routine bypass actor.

The workflow names above are job names from `.github/workflows/production-gates.yml`. The `production` job depends on `harness`, but both are required explicitly so the repository policy is easy to audit.

## Acceptance verification

The control is considered enforced only after all of the following are verified:

- direct push to `main` is rejected;
- a PR cannot merge while `harness` or `production` is pending or failing;
- a PR can merge only after both required jobs pass and the branch is current;
- force-push to `main` is rejected;
- deletion of `main` is rejected;
- the GitHub ruleset API reports the ruleset as active.

After verification, update `docs/release-checklist.md` to replace the remaining P1 governance gap with the active ruleset evidence and close issue #11.
