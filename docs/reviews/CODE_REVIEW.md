# Code Quality Review

Run after spec compliance is PASS.

## Correctness

- [ ] Focused RED reproduced the intended failure before the fix/feature.
- [ ] Edge cases include null/empty, type boundaries, duplicate/ambiguous data and deterministic ordering where relevant.
- [ ] Row reconciliation and evidence completeness remain intact.

## Architecture

- [ ] New code belongs to the narrowest owning area.
- [ ] `python tests/harness/architecture-check.py` passes.
- [ ] Shared contracts are not duplicated across UI/parser/engine layers.
- [ ] `docs/REPO_MAP.md` is regenerated when structure changes.

## Safety and privacy

- [ ] No new customer-data network path, telemetry, remote logging or hidden upload exists.
- [ ] No broad coercion can corrupt identifiers such as `001`.
- [ ] Ambiguous values/matches are rejected or preserved, never guessed.

## Maintainability

- [ ] Names communicate domain meaning.
- [ ] No customer-specific one-off branch when a reusable rule/contract is appropriate.
- [ ] New tests protect the discovered failure mode rather than only the happy path.
- [ ] Documentation changed only where it owns the relevant truth.

## Evidence

- [ ] `python scripts/verify.py local` passes.
- [ ] Official production status is reported exactly as PASS/FAIL/BLOCKED.
