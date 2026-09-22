# review-ticket: liveact-semantic-morph-validator-v2 (#401)

**Verdict:** ACCEPT

## Summary
Extends the face asset gate with versioned semantic QA driven by face anchor regions. Structural V1 checks remain mandatory; semantic enforcement activates when anchors are provided.

## Notes
- Inventory documents `semanticQa.contractVersion`, per-channel metrics, and combination pose results.
- Fixtures cover pass, jaw leakage fail, and wrong-side smile fail.
