# Step 1 — Project Foundation and Domain Contracts

## Implemented

- React/TypeScript/Vite project structure
- Pinned runtime and development dependency manifest
- Vitest unit/browser project configuration
- Playwright Chromium/Firefox configuration
- ESLint flat configuration
- Stable DataFixer domain contracts
- Stable DataFixer error codes
- Deterministic `makeRow()` and `makeDataset()` factories
- Vitest factory contract test

## Verification performed in this sandbox

- RED: TypeScript contract probe failed because `src/domain/factories.ts` did not exist.
- GREEN: The same probe passed after implementing the factory module.
- Runtime: compiled domain code passed deterministic row/dataset assertions and defensive column-copy assertion.

## Environment blocker

This sandbox cannot resolve `registry.npmjs.org`, so `npm install`/`npm create vite` cannot complete. Therefore these required gates are not claimed as passed yet:

- `package-lock.json` generation
- `npm run test:unit -- tests/domain/factories.test.ts`
- `npm run lint`
- `npm run build`
- Playwright Chromium/Firefox installation

Step 1 remains **BLOCKED ON DEPENDENCY INSTALLATION**, not falsely marked complete.
