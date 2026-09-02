#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/../.."
exec ./tests/local/run-fast-regression.sh
