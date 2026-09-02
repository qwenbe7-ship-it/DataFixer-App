# Worker Instructions

Applies to `src/worker/`.

- The worker owns heavy full-processing work; do not move full processing back onto the UI thread.
- Customer-derived data must not be sent to remote endpoints, telemetry, error reporting, WebSocket, or fetch/XHR calls.
- Keep the worker protocol explicit and serializable.
- Preserve deterministic file order and selected-sheet identity in hashing.
- Progress stages must remain understandable (`parse`, `process`, `export`).
- A worker error must surface as structured DataFixer error information rather than silently dropping a job.
- Changes to protocol/request/client must include contract checks and browser/E2E coverage when official dependencies are available.
