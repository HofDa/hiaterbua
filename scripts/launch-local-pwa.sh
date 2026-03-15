#!/usr/bin/env bash
set -euo pipefail

readonly SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
readonly PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
readonly PASTORE_LOCAL_HOST="${PASTORE_LOCAL_HOST:-127.0.0.1}"
readonly PASTORE_LOCAL_PORT="${PASTORE_LOCAL_PORT:-43031}"
readonly APP_URL="http://${PASTORE_LOCAL_HOST}:${PASTORE_LOCAL_PORT}"
readonly MANIFEST_URL="${APP_URL}/manifest.webmanifest"
readonly LOG_FILE="${PASTORE_LOCAL_LOG_FILE:-/tmp/pastore-local-pwa.log}"

open_browser=1

if [ "${1:-}" = "--no-open" ]; then
  open_browser=0
  shift
fi

if [ "$#" -gt 0 ]; then
  echo "Usage: $0 [--no-open]" >&2
  exit 1
fi

fetch_url() {
  if command -v curl >/dev/null 2>&1; then
    curl --silent --show-error --fail --max-time 2 "$1"
    return
  fi

  if command -v wget >/dev/null 2>&1; then
    wget -qO- --timeout=2 "$1"
    return
  fi

  echo "curl or wget is required to check the local Pastore server." >&2
  return 127
}

check_pastore_manifest() {
  local manifest

  if ! manifest="$(fetch_url "$MANIFEST_URL" 2>/dev/null)"; then
    return 1
  fi

  if printf '%s' "$manifest" | grep -q '"short_name"[[:space:]]*:[[:space:]]*"Pastore"'; then
    return 0
  fi

  return 2
}

wait_for_server() {
  local attempt
  local status

  for attempt in $(seq 1 30); do
    if check_pastore_manifest; then
      return 0
    else
      status=$?
    fi

    case "$status" in
      2)
        echo "Port ${PASTORE_LOCAL_PORT} is serving another app. Stop it or change PASTORE_LOCAL_PORT." >&2
        return 1
        ;;
    esac

    sleep 1
  done

  return 1
}

start_server() {
  if command -v setsid >/dev/null 2>&1; then
    setsid "$PROJECT_ROOT/scripts/run-local-pwa-server.sh" >"$LOG_FILE" 2>&1 < /dev/null &
    echo "$!"
    return
  fi

  nohup "$PROJECT_ROOT/scripts/run-local-pwa-server.sh" >"$LOG_FILE" 2>&1 < /dev/null &
  echo "$!"
}

open_app_window() {
  local browser

  for browser in google-chrome google-chrome-stable chromium chromium-browser brave-browser microsoft-edge; do
    if command -v "$browser" >/dev/null 2>&1; then
      "$browser" --app="$APP_URL" >/dev/null 2>&1 &
      return 0
    fi
  done

  if command -v xdg-open >/dev/null 2>&1; then
    xdg-open "$APP_URL" >/dev/null 2>&1 &
    return 0
  fi

  echo "Open ${APP_URL} manually." >&2
  return 1
}

if check_pastore_manifest; then
  :
else
  status=$?

  case "$status" in
    2)
      echo "Port ${PASTORE_LOCAL_PORT} is serving another app. Stop it or change PASTORE_LOCAL_PORT." >&2
      exit 1
      ;;
    *)
      server_pid="$(start_server)"

      if ! wait_for_server; then
        if ! kill -0 "$server_pid" >/dev/null 2>&1; then
          echo "Pastore did not start successfully. Check ${LOG_FILE}." >&2
        else
          echo "Timed out waiting for Pastore on ${APP_URL}. Check ${LOG_FILE}." >&2
        fi
        exit 1
      fi
      ;;
  esac
fi

if [ "$open_browser" -eq 1 ]; then
  open_app_window
fi

echo "$APP_URL"
