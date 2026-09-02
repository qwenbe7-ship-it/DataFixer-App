# DataFixer Spec Policy

Use the lightest artifact that still makes behavior unambiguous.

## When a spec is required

- **Bug / tiny bounded change:** no new feature spec. The failing regression test is the behavior contract; update an existing spec only if product semantics changed.
- **Medium feature:** create one file from `docs/specs/_template.md` before implementation.
- **Architecture / cross-cutting change:** create a design under `docs/superpowers/specs/` and an implementation plan under `docs/superpowers/plans/`.

## One source of truth per question

- Product invariant: `AGENTS.md` / `docs/ARCHITECTURE.md`.
- Feature behavior: one feature spec.
- Implementation steps: one Superpowers plan when required.
- Verification truth: tests + `verify-report.json` + CI.
- Release state: `docs/release-checklist.md`.

Do not create parallel PRD/story/plan documents that restate the same requirements.
