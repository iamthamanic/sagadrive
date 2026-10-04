# Review Ticket — liveact-hybrid-mouth-face-solver (#447)

- Verdict: **ACCEPT**
- Branch: `agent/liveact-hybrid-mouth-face-solver`
- Previous HEAD: a1252957222d6f48ac22d2a1b7bce0e7fd8e554f
- Base/main: 8136a3c90af8ffa164afdd9365876836c41d5c18

## Focus — 7 review findings re-checked

| # | Finding | Result |
|---|---------|--------|
| 1 | L/R mirror mismatch (semantic mirrored + dense anatomical) | Fixed — anatomical fusion → mirror once |
| 2 | High-confidence disagreement unreachable | Fixed — disagreement before under/over |
| 3 | jawOpen from static chinDrop | Fixed — chinDrop removed; gapCenter open-only; #449 documented |
| 4 | Press/roll from inverse gap at closed mouth | Fixed — compression gate |
| 5 | Clean non-degradation zero-inflated median | Fixed — active controls + per-control hard rule |
| 6 | Success flag unauditable (private underImp) | Fixed — `activeUnderResponseMedianAbs` reported + gated |
| 7 | CE gates missing in acceptance | Fixed — CE-04 / CE-20 + N/A |

## Scope
- #448 / #449 / #450 not pulled forward
- #446 iris path unchanged
- Success thresholds not loosened

## Findings
none blocking
