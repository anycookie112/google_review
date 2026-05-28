#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
PORT="${PORT:-3010}"

cd "$ROOT_DIR"

# Keep the production build in sync with the checked-out code.
npm run build

exec ./node_modules/.bin/next start --port "$PORT"
