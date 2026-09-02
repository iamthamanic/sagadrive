#!/usr/bin/env bash
# PostToolUse: block accidental secret patterns in written files
set -euo pipefail
input="${TOOL_INPUT:-}"
if printf '%s' "$input" | grep -qE '(sk-ant-|sk-proj-|ghp_|AKIA)'; then
  echo 'BLOCK: Possible secret detected in written file' >&2
  exit 1
fi
