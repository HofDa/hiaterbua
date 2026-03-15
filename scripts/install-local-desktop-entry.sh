#!/usr/bin/env bash
set -euo pipefail

readonly SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
readonly PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
readonly DESKTOP_DIR="${XDG_DATA_HOME:-$HOME/.local/share}/applications"
readonly DESKTOP_FILE="${DESKTOP_DIR}/pastore-local.desktop"
readonly LAUNCHER_PATH="${PROJECT_ROOT}/scripts/launch-local-pwa.sh"
readonly ICON_PATH="${PROJECT_ROOT}/public/icon-512.png"

mkdir -p "$DESKTOP_DIR"

cat > "$DESKTOP_FILE" <<EOF
[Desktop Entry]
Version=1.0
Type=Application
Name=Pastore Local
Comment=Start the local Pastore PWA on its fixed localhost port.
Exec=${LAUNCHER_PATH}
TryExec=${LAUNCHER_PATH}
Path=${PROJECT_ROOT}
Icon=${ICON_PATH}
Terminal=false
StartupNotify=true
Categories=Office;Utility;
EOF

chmod 644 "$DESKTOP_FILE"

if command -v update-desktop-database >/dev/null 2>&1; then
  update-desktop-database "$DESKTOP_DIR" >/dev/null 2>&1 || true
fi

echo "Desktop launcher installed at ${DESKTOP_FILE}"
