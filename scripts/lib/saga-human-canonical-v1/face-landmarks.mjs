/**
 * saga-human-canonical-v1/face-landmarks — face anchors as facts of the canonical topology.
 * Location: scripts/lib/saga-human-canonical-v1/face-landmarks.mjs
 *
 * Eyes from the lash-row helpers (they sit on the lid margins), brows from the eyebrow proxy,
 * lips / nose / forehead from the exact midline profile (x = 0), lip contact and chin heights
 * from the MakeHuman default rig (lip-chain tails, jaw tip), mouth corners at the mouthSmile
 * peaks. Each anchor is a Body vertex (anchors bind on Body). The generic ARKit morph seed puts
 * the eye corners of this mesh on the nose bridge (its blink target reaches the midline).
 */

/** normal·(+Z) threshold — excludes mouth-sack and eye-socket interior surfaces. */
const FRONT_FACING = 0.3;
const MIDLINE_EPS_M = 1e-5;

/**
 * @param {{
 *   Pm: Float64Array;
 *   groupOf: string[];
 *   chinHeightM: number;
 *   lipContactHeightM: number;
 *   body: { positions: Float32Array; normals: Float32Array; morphs: { name: string; position: Float32Array }[] };
 *   eyebrows: { positions: Float32Array };
 * }} input
 * @returns {Record<string, number>} anchor id → Body vertex index
 */
export function deriveCanonicalFaceLandmarks({ Pm, groupOf, chinHeightM, lipContactHeightM, body, eyebrows }) {
  const bp = body.positions;
  const n = bp.length / 3;
  const X = (i) => bp[i * 3];
  const Y = (i) => bp[i * 3 + 1];
  const Z = (i) => bp[i * 3 + 2];
  const front = (i) => body.normals[i * 3 + 2] > FRONT_FACING;
  const mid = (i) => Math.abs(X(i)) < MIDLINE_EPS_M;

  const pick = (score, filter, requireFront = true) => {
    let best = -1;
    let bestScore = -Infinity;
    for (let i = 0; i < n; i += 1) {
      if ((requireFront && !front(i)) || !filter(i)) continue;
      const s = score(i);
      if (s > bestScore) {
        bestScore = s;
        best = i;
      }
    }
    if (best < 0) throw new Error('landmarks: no candidate vertex');
    return best;
  };
  const frontmost = (filter) => pick(Z, filter);
  const nearestOnSide = (p, sign) =>
    pick((i) => -((X(i) - p[0]) ** 2 + (Y(i) - p[1]) ** 2 + (Z(i) - p[2]) ** 2), (i) => Math.sign(X(i)) === sign);
  const morphMagnitude = (name) => {
    const m = body.morphs.find((x) => x.name === name);
    if (!m) throw new Error(`landmarks: Body lacks ${name}`);
    return (i) => Math.hypot(m.position[i * 3], m.position[i * 3 + 1], m.position[i * 3 + 2]);
  };

  /** @type {Record<string, number>} */
  const v = {};
  // Character left = +X (SagaDriveFaceAnchorsV1 contract). The corner crease faces sideways,
  // so no front-facing filter here (it would skip the true peak and break L/R symmetry).
  v.mouthCornerLeft = pick(morphMagnitude('mouthSmileLeft'), (i) => X(i) > 0, false);
  v.mouthCornerRight = pick(morphMagnitude('mouthSmileRight'), (i) => X(i) < 0, false);
  const mouthW = X(v.mouthCornerLeft) - X(v.mouthCornerRight);
  if (!(mouthW > 0.03 && mouthW < 0.08)) throw new Error(`landmarks: implausible mouth width ${mouthW}`);

  // Lip bodies: frontmost midline points above / below the lip contact line, offset from it so
  // the closed lips' shared edge is skipped. The upper band stays short of the nose base.
  const stomionY = lipContactHeightM;
  const lipGap = 0.05 * mouthW;
  v.mouthUpper = frontmost((i) => mid(i) && Y(i) > stomionY + lipGap && Y(i) <= stomionY + 0.2 * mouthW);
  v.mouthLower = frontmost((i) => mid(i) && Y(i) < stomionY - lipGap && Y(i) >= stomionY - 0.3 * mouthW);

  // Chin (soft-tissue pogonion): walk the midline profile down into the mentolabial sulcus,
  // then take the frontmost point below it (search ends just under the MakeHuman jaw tip).
  const profile = [];
  for (let i = 0; i < n; i += 1) {
    if (front(i) && mid(i) && Y(i) < Y(v.mouthLower) && Y(i) >= chinHeightM - 0.1 * mouthW) profile.push(i);
  }
  profile.sort((a, b) => Y(b) - Y(a));
  let sulcus = 0;
  while (sulcus + 1 < profile.length && Z(profile[sulcus + 1]) <= Z(profile[sulcus])) sulcus += 1;
  const belowSulcus = profile.slice(sulcus + 1);
  if (!belowSulcus.length) throw new Error('landmarks: no chin prominence below the mentolabial sulcus');
  v.chin = belowSulcus.reduce((a, b) => (Z(b) > Z(a) ? b : a));

  const helperPoints = (group) => {
    const pts = [];
    for (let s = 0; s < groupOf.length; s += 1) {
      if (groupOf[s] === group) pts.push([Pm[s * 3], Pm[s * 3 + 1], Pm[s * 3 + 2]]);
    }
    if (!pts.length) throw new Error(`landmarks: helper group ${group} is empty`);
    return pts;
  };
  const meanY = (pts) => pts.reduce((s, p) => s + p[1], 0) / pts.length;
  const extreme = (pts, score) => pts.reduce((a, b) => (score(b) > score(a) ? b : a));
  const avg = (a, b) => a.map((x, k) => (x + b[k]) / 2);

  let eyeInnerY = 0;
  let browTopY = -Infinity;
  for (const [side, tag, sign] of /** @type {const} */ ([['Left', 'l', 1], ['Right', 'r', -1]])) {
    const [upper, lower] = [1, 2]
      .map((k) => helperPoints(`helper-${tag}-eyelashes-${k}`))
      .sort((a, b) => meanY(b) - meanY(a));
    const medial = (pts) => extreme(pts, (p) => -Math.abs(p[0]));
    const lateral = (pts) => extreme(pts, (p) => Math.abs(p[0]));
    v[`eye${side}Inner`] = nearestOnSide(avg(medial(upper), medial(lower)), sign);
    v[`eye${side}Outer`] = nearestOnSide(avg(lateral(upper), lateral(lower)), sign);
    v[`eye${side}Upper`] = nearestOnSide(extreme(upper, (p) => p[1]), sign);
    v[`eye${side}Lower`] = nearestOnSide(extreme(lower, (p) => -p[1]), sign);
    eyeInnerY += Y(v[`eye${side}Inner`]) / 2;

    const brow = [];
    for (let i = 0; i < eyebrows.positions.length / 3; i += 1) {
      const p = [eyebrows.positions[i * 3], eyebrows.positions[i * 3 + 1], eyebrows.positions[i * 3 + 2]];
      if (Math.sign(p[0]) === sign) brow.push(p);
    }
    if (!brow.length) throw new Error(`landmarks: no eyebrow vertices on ${side}`);
    const inner = medial(brow);
    const outer = lateral(brow);
    const centerAbsX = (Math.abs(inner[0]) + Math.abs(outer[0])) / 2;
    const band = brow.filter((p) => Math.abs(Math.abs(p[0]) - centerAbsX) < 0.002);
    const center = [0, 1, 2].map((k) => band.reduce((s, p) => s + p[k], 0) / band.length);
    v[`brow${side}Inner`] = nearestOnSide(inner, sign);
    v[`brow${side}Outer`] = nearestOnSide(outer, sign);
    v[`brow${side}Center`] = nearestOnSide(center, sign);
    browTopY = Math.max(browTopY, Y(v[`brow${side}Inner`]));
  }

  v.noseTip = frontmost((i) => mid(i) && Y(i) > Y(v.mouthUpper) && Y(i) < eyeInnerY);
  const foreheadY = browTopY + mouthW;
  v.forehead = frontmost((i) => mid(i) && Math.abs(Y(i) - foreheadY) < 0.3 * mouthW);

  const order = [
    ['forehead', 'browLeftInner'],
    ['browLeftCenter', 'eyeLeftUpper'],
    ['eyeLeftUpper', 'eyeLeftLower'],
    ['noseTip', 'mouthUpper'],
    ['mouthUpper', 'mouthLower'],
    ['mouthLower', 'chin'],
  ];
  for (const [above, below] of order) {
    if (!(Y(v[above]) > Y(v[below]))) throw new Error(`landmarks: ${above} is not above ${below}`);
  }
  for (const side of ['Left', 'Right']) {
    if (!(Math.abs(X(v[`eye${side}Outer`])) > Math.abs(X(v[`eye${side}Inner`])))) {
      throw new Error(`landmarks: eye${side} outer corner is not lateral of the inner corner`);
    }
  }
  // The identity mesh is exactly symmetric, so paired landmarks must mirror each other.
  for (const [l, r] of [
    ['mouthCornerLeft', 'mouthCornerRight'],
    ['eyeLeftInner', 'eyeRightInner'],
    ['eyeLeftOuter', 'eyeRightOuter'],
    ['browLeftCenter', 'browRightCenter'],
  ]) {
    const off = Math.hypot(X(v[l]) + X(v[r]), Y(v[l]) - Y(v[r]), Z(v[l]) - Z(v[r]));
    if (off > 5e-4) throw new Error(`landmarks: ${l}/${r} not mirrored (${(off * 1000).toFixed(2)} mm)`);
  }
  return v;
}
