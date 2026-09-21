# Review Ticket — liveact-face-diagnostics (#331)

- BASE_SHA: faf137b67add6327b9c435c52a8f32b1d615a651
- Verdict: **ACCEPT**

## Notes
- Domain stays pure; landmarks only on diagnostics type.
- Calibration guarded when tracking inactive; face-loss aborts collection.
- Overlay uses imperative canvas; React only for toggles/status.

## Findings
| Severity | Finding | Blocking |
|----------|---------|----------|
| Low | DeviceId select still does not rebind stream (inherited from #330) | no |

ACCEPT
