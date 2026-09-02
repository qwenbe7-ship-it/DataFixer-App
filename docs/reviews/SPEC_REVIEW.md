# Spec Compliance Review

Use this before code-quality review. Review the change against the approved spec, not against what the implementation happens to do.

- [ ] Every success criterion has observable verification evidence.
- [ ] No requested requirement is silently missing.
- [ ] No unapproved scope/feature was added.
- [ ] Product invariants in `AGENTS.md` and `docs/ARCHITECTURE.md` remain true.
- [ ] Error, ambiguity and rejection behavior matches the spec.
- [ ] Settings/hash/output compatibility is intentional and documented.
- [ ] Customer-visible behavior has a Golden Dataset or browser/E2E case when appropriate.
- [ ] `BLOCKED` official evidence has not been relabeled as PASS.

**Verdict:** PASS only when every applicable item is supported by code/test/diff evidence.
