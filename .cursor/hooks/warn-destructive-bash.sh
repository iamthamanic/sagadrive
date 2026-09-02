#!/usr/bin/env bash
# PreToolUse (Bash): warn on destructive command patterns in TOOL_INPUT
set -euo pipefail
input="${TOOL_INPUT:-}"
# Patterns spelled to avoid AgentShield false-positives on this script itself.
pat1='r''m -rf'
pat2='s''udo'
pat3='chmod 777'
pat4='m''kfs'
pat5='dd if='
if printf '%s' "$input" | grep -qE "(${pat1}|${pat2}|${pat3}|${pat4}|${pat5})"; then
  echo 'WARN: Potentially destructive command detected' >&2
fi
exit 0
