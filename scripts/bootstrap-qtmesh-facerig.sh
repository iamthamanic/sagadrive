#!/usr/bin/env bash
# bootstrap-qtmesh-facerig.sh — install pinned QtMeshEditor FaceRig CLI into local tool cache (#384).
# Location: scripts/bootstrap-qtmesh-facerig.sh
#
# - Pins upstream commit 8720dc91bd7426908b9218673fbd74d544dd908c (native mesh.extras.targetNames).
# - Does NOT install globally into /usr/local.
# - Reuses existing cache when present.
# - No secrets required.
# - Must NOT be invoked by npm run test-gate.

set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
CACHE="${SAGADRIVE_QTMESH_CACHE:-$ROOT/.cache/sagadrive-tools/qtmesh}"
PINNED_COMMIT="8720dc91bd7426908b9218673fbd74d544dd908c"
# First published macOS release after the pinned commit (includes targetNames fix #1045).
RELEASE_TAG="${SAGADRIVE_QTMESH_RELEASE:-3.40.0}"
REPO="fernandotonon/QtMeshEditor"

mkdir -p "$CACHE/downloads" "$CACHE/bin"

if [[ -x "$CACHE/bin/qtmesh" ]]; then
  echo "bootstrap-qtmesh-facerig: reusing $CACHE/bin/qtmesh"
  if [[ ! -f "$CACHE/INSTALL.json" ]]; then
    cat > "$CACHE/INSTALL.json" <<EOF
{
  "tool": "qtmesh",
  "repository": "$REPO",
  "pinnedCommit": "$PINNED_COMMIT",
  "binaryRelease": "$RELEASE_TAG",
  "license": "MIT",
  "faceTemplate": { "provider": "ICT-FaceKit", "license": "MIT" },
  "reusedExisting": true
}
EOF
  fi
  exit 0
fi

uname_s="$(uname -s)"
uname_m="$(uname -m)"

download() {
  local url="$1" dest="$2"
  echo "bootstrap-qtmesh-facerig: downloading $url"
  curl -fsSL --retry 3 -o "$dest" "$url"
}

case "$uname_s" in
  Darwin)
    DMG_NAME="QtMeshEditor-${RELEASE_TAG}-MacOS.dmg"
    DMG_PATH="$CACHE/downloads/$DMG_NAME"
    if [[ ! -f "$DMG_PATH" ]]; then
      download "https://github.com/${REPO}/releases/download/${RELEASE_TAG}/${DMG_NAME}" "$DMG_PATH"
    fi
    MNT="$CACHE/downloads/mnt-$$"
    mkdir -p "$MNT"
    hdiutil attach "$DMG_PATH" -mountpoint "$MNT" -nobrowse -readonly >/dev/null
    cleanup() { hdiutil detach "$MNT" -quiet >/dev/null 2>&1 || true; rm -rf "$MNT"; }
    trap cleanup EXIT
    if [[ ! -d "$MNT/QtMeshEditor.app" ]]; then
      echo "bootstrap-qtmesh-facerig FAIL: QtMeshEditor.app missing in DMG" >&2
      exit 1
    fi
    rm -rf "$CACHE/QtMeshEditor.app"
    # ditto preserves macOS app bundle metadata
    ditto "$MNT/QtMeshEditor.app" "$CACHE/QtMeshEditor.app"
    ln -sfn ../QtMeshEditor.app/Contents/MacOS/QtMeshEditor "$CACHE/bin/qtmesh"
    trap - EXIT
    cleanup
    ;;
  Linux)
    # Prefer amd64 .deb contents extraction when available; otherwise fail with guidance.
    DEB_NAME="qtmesheditor_amd64.deb"
    if [[ "$uname_m" == "aarch64" || "$uname_m" == "arm64" ]]; then
      DEB_NAME="qtmesheditor_arm64.deb"
    fi
    DEB_PATH="$CACHE/downloads/QtMeshEditor-${RELEASE_TAG}-${DEB_NAME}"
    # Release asset names vary; try canonical then tagged fallbacks.
    if [[ ! -f "$DEB_PATH" ]]; then
      if ! download "https://github.com/${REPO}/releases/download/${RELEASE_TAG}/${DEB_NAME}" "$DEB_PATH"; then
        echo "bootstrap-qtmesh-facerig FAIL: could not download Linux package for ${RELEASE_TAG}" >&2
        echo "Set SAGADRIVE_QTMESH_BIN to a local qtmesh built from commit ${PINNED_COMMIT}." >&2
        exit 1
      fi
    fi
    EXTRACT="$CACHE/downloads/deb-extract-$$"
    mkdir -p "$EXTRACT"
    (cd "$EXTRACT" && ar x "$DEB_PATH" && tar xf data.tar.* )
    BIN_CANDIDATE="$(find "$EXTRACT" -type f -name 'qtmesh' -o -name 'QtMeshEditor' | head -1 || true)"
    if [[ -z "${BIN_CANDIDATE}" ]]; then
      echo "bootstrap-qtmesh-facerig FAIL: qtmesh binary not found in deb" >&2
      exit 1
    fi
    mkdir -p "$CACHE/linux-root"
    rm -rf "$CACHE/linux-root"
    mv "$EXTRACT" "$CACHE/linux-root"
    ln -sfn "$(realpath --relative-to="$CACHE/bin" "$CACHE/linux-root/${BIN_CANDIDATE#"$EXTRACT/"}" 2>/dev/null || echo "$BIN_CANDIDATE")" "$CACHE/bin/qtmesh" || {
      cp "$BIN_CANDIDATE" "$CACHE/bin/qtmesh"
      chmod +x "$CACHE/bin/qtmesh"
    }
    ;;
  *)
    echo "bootstrap-qtmesh-facerig FAIL: unsupported platform $uname_s" >&2
    echo "Build QtMeshEditor from commit ${PINNED_COMMIT} and set SAGADRIVE_QTMESH_BIN." >&2
    exit 1
    ;;
esac

if [[ ! -x "$CACHE/bin/qtmesh" ]]; then
  echo "bootstrap-qtmesh-facerig FAIL: bin not executable at $CACHE/bin/qtmesh" >&2
  exit 1
fi

# Smoke: facerig usage string must exist (no network beyond prior download).
if ! "$CACHE/bin/qtmesh" facerig 2>&1 | grep -q 'facerig'; then
  echo "bootstrap-qtmesh-facerig FAIL: facerig command missing in binary" >&2
  exit 1
fi

cat > "$CACHE/INSTALL.json" <<EOF
{
  "tool": "qtmesh",
  "repository": "$REPO",
  "pinnedCommit": "$PINNED_COMMIT",
  "pinnedCommitNote": "native mesh.extras.targetNames (fix #1045)",
  "binaryRelease": "$RELEASE_TAG",
  "binaryReleaseNote": "published release that contains the pinned commit fix",
  "license": "MIT",
  "faceTemplate": { "provider": "ICT-FaceKit", "license": "MIT" },
  "platform": "${uname_s}/${uname_m}",
  "installedAt": "$(date -u +%Y-%m-%dT%H:%M:%SZ)"
}
EOF

echo "bootstrap-qtmesh-facerig: OK → $CACHE/bin/qtmesh (commit pin ${PINNED_COMMIT}, release ${RELEASE_TAG})"
