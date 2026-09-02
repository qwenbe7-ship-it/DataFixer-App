#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/../.."
grep -F "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; connect-src 'self'; worker-src 'self' blob:; object-src 'none'; base-uri 'none'; form-action 'none'" index.html >/dev/null
if grep -RInE "\b(fetch|XMLHttpRequest|WebSocket|EventSource)\b|https?://|//fonts\.|analytics|sentry|telemetry" src index.html --exclude='*.md'; then
  echo 'Unexpected runtime network-capable or remote reference found' >&2
  exit 1
fi
grep -F "worker: { format: 'es' }" vite.config.ts >/dev/null || { echo 'Vite worker format is not pinned to ES modules' >&2; exit 1; }
grep -F "workerRef.current = worker" src/app/App.tsx >/dev/null || { echo 'Worker is not eagerly retained for offline continuity' >&2; exit 1; }
grep -F "worker.terminate();" src/app/App.tsx >/dev/null || { echo 'Retained worker is not terminated on app unmount' >&2; exit 1; }
echo 'PASS privacy-static-check'
