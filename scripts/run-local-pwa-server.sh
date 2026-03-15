#!/usr/bin/env bash
set -euo pipefail

readonly SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
readonly PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
readonly PASTORE_LOCAL_BIND_HOST="${PASTORE_LOCAL_BIND_HOST:-127.0.0.1}"
readonly PASTORE_LOCAL_PORT="${PASTORE_LOCAL_PORT:-43031}"

cd "$PROJECT_ROOT"

if [ ! -f ".next/BUILD_ID" ]; then
  echo "No production build found. Running npm run build:local-pwa..."
  npm run build:local-pwa
fi

exec ./node_modules/.bin/next start \
  --hostname "$PASTORE_LOCAL_BIND_HOST" \
  --port "$PASTORE_LOCAL_PORT"
