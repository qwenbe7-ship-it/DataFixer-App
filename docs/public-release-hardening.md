# Public release hardening

This repository was split from a private internal repository using a fresh public Git history. The public release path intentionally keeps commercial strategy, pricing strategy, sales-channel planning, operating SOPs, credentials, and customer-specific material outside this repository.

## Release invariants

- `main` changes through pull requests after the initial repository bootstrap.
- The public boundary gate checks both forbidden paths and high-confidence sensitive text patterns.
- GitHub Actions run on Node.js `22.16.0` for deterministic project verification.
- First-party GitHub Actions use the current v7 major in the release workflows.
- The production gate must pass in this public repository before deployment promotion.
- Vercel deployment must be verified separately for response headers, browser behavior, and the no-upload privacy contract.

## Public/private boundary

The public repository may contain application source, tests, CI, technical documentation, and synthetic/example fixtures. Internal commercial material remains in the private repository.

The automated boundary gate is a defense in depth measure, not a substitute for review. Pull requests that add new documentation, fixtures, credentials-related configuration, or external integrations require explicit boundary review.
