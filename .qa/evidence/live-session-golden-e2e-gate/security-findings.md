# Security findings — live-session-golden-e2e-gate (#378)

| ID | Severity | Finding | Status |
|----|----------|---------|--------|
| G-01 | info | Viewer/Director gameplay mutations fail-closed via capability mirror | mitigated (domain + E2E) |
| G-02 | info | gm_only / character_specific audience never delivered to wrong context | mitigated (mayReceiveKnowledgeFact) |
| G-03 | info | Forged director/GM, cross-session targets, expired media → forbidden | mitigated (adversarial map) |
| G-04 | info | Stale revision / duplicate idempotency classified per #303 | mitigated (reuse authorizeSessionCommand) |
| — | — | No known P0/P1 data-loss / auth / secret-leak / sync issues introduced by this gate | — |
