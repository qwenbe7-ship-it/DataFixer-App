# Rules Engine Instructions

Applies to `src/rules/`.

- Rule execution must be deterministic and ordered.
- A new rule kind must be registered through the shared rule-kind contract, settings parser, UI, evidence/report translations, and tests; do not duplicate rule-kind lists ad hoc.
- Validate columns/settings before mutating any row.
- Preserve the original rejected row values.
- Never coerce identifiers merely because they look numeric.
- Every change/remove/reject operation must emit sufficient evidence to explain the outcome.
- Exact Lookup must never silently choose among multiple matches.
- Regex changes must pass the regex safety preflight.
- Start with a failing focused rule/engine check, then run the full local harness before completion.
