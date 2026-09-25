# Attribution — LiveAct Golden Reference VRM

- **File:** `valid-white-m1-default.vrm` — SagaDrive derivative `saga-teeth-binds-v1` of `White/White_M_1_Default.vrm`
- **Upstream:** https://github.com/TLTMedia/valid-vrm-avatars
- **Commit:** `3a79e95bc81655a3e1ec020538c67e7e17551b6f`
- **Original sha256:** `1ab7130c773bce62053c18599aea786ae6565604aeab4fcc9ef75c940830cff9` (68580812 bytes; upstream Git LFS pointer oid)
- **License:** Creative Commons Attribution 4.0 International (CC BY 4.0)
- **Original:** Google VALID — https://github.com/google-research/google-research/tree/master/valid
- **VRM + ARKit52:** TLTMedia
- **Purpose:** SagaDrive LiveAct diagnostic reference only — not a product default avatar
- **Changes (SagaDrive):** the expressions `jawOpen`, `jawLeft`, `jawRight` and `jawForward` additionally bind the lower-teeth mesh (`h_TeethDown`) to its authored `h_teeth.t_*` twin shape, so the teeth follow the jaw. Applied by `scripts/lib/liveact-reference-vrm-teeth-binds.mjs`; geometry, textures and rig are unchanged.
- **Derivative sha256:** `323269ae9de3b13294135e6e2c3d84b52eb2c5d29d5a2ac9e1619f273be1645b` (`saga-teeth-binds-v1`, rebuilt deterministically from the original)

Fetch binary: `node scripts/fetch-liveact-reference-vrm.mjs` — the unmodified original is kept in `.cache/liveact-reference-vrm/` (gitignored); `--skip-if-present` keeps a served file that already matches the derivative hash.
