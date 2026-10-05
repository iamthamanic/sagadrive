# Acceptance — director-control-room (#376)

## Intent
Dedicated Director Production Control Room consuming #375 runtime. Route `/live/director` grants no capability.

## Acceptance
- [x] Director screen requires capability server-side (cue RPC) + client denied messaging
- [x] Preview ≠ Program until Take / auto cue
- [x] Automatic Mode visible and overrideable
- [x] offline source placeholder; Program via existing ProgramDisplayShell
- [x] no gameplay mutation actions
- [x] responsive (mobile emergency cues) + test-gate
