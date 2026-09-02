---
name: datafixer-feature
description: Implement a DataFixer feature or rule safely from approved requirements.
---

# DataFixer Feature Workflow

1. Read root and nearest scoped `AGENTS.md`.
2. Read `docs/ARCHITECTURE.md` and the applicable feature spec.
3. Check `docs/REPO_MAP.md` for known producers/consumers before searching broadly.
4. Write the smallest failing test that expresses the new behavior.
5. Confirm the test fails for the expected reason.
6. Implement the minimum production change.
7. Run the focused test until GREEN.
8. If the change affects a customer workflow, add/update the Golden Dataset case.
9. Regenerate `docs/REPO_MAP.md` if imports/exports/files changed.
10. Run `python scripts/verify.py local`.
11. Review the diff with both review checklists before claiming completion.
