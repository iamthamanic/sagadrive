# Attribution — LiveAct Golden Reference VRM

- **File:** `valid-white-m1-default.vrm` (from `White/White_M_1_Default.vrm`)
- **Upstream:** https://github.com/TLTMedia/valid-vrm-avatars
- **Commit:** `3a79e95bc81655a3e1ec020538c67e7e17551b6f`
- **License:** Creative Commons Attribution 4.0 International (CC BY 4.0)
- **Original:** Google VALID — https://github.com/google-research/google-research/tree/master/valid
- **VRM + ARKit52:** TLTMedia
- **Purpose:** SagaDrive LiveAct diagnostic reference only — not a product default avatar
- **Changes (SagaDrive):** the expressions `jawOpen`, `jawLeft`, `jawRight` and `jawForward` additionally bind the lower-teeth mesh (`h_TeethDown`) to its authored `h_teeth.t_*` twin shape, so the teeth follow the jaw. Applied by `scripts/lib/liveact-reference-vrm-teeth-binds.mjs`; geometry, textures and rig are unchanged.

Fetch binary: `node scripts/fetch-liveact-reference-vrm.mjs` (existing copy: add `--skip-if-present` to apply the patch only)
