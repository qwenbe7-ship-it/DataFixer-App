# Test Instructions

Applies to `tests/`.

- For bugs, write the regression first and observe RED before fixing production code.
- For features, define observable behavior before implementation.
- Do not delete or weaken a failing assertion just to make a gate green.
- Prefer full-object/summary equality when it makes differences clearer.
- Representative customer workflows belong in the Golden Dataset manifest.
- Local stubs are compatibility harnesses only; never describe a stubbed XLSX check as a real SheetJS binary round-trip.
- Browser/E2E tests remain required release evidence even when the current sandbox cannot run them.
- Tests must preserve row reconciliation and reason completeness invariants.
