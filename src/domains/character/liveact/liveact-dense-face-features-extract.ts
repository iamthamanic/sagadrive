/**
 * liveact-dense-face-features-extract — region feature extraction (#445).
 * Location: src/domains/character/liveact/liveact-dense-face-features-extract.ts
 *
 * Pure domain. Operates only on face-local normalized semantic points.
 * No provider indices, no temporal filter, no actor calib, no avatar mapping.
 */

import {
  LIVEACT_DENSE_FACE_FEATURES_CONTRACT,
  availableDenseScalar,
  clamp01,
  createEmptyDenseFaceFeatures,
  unavailableDenseScalar,
  type DenseContourStationsV1,
  type DenseScalarFeatureV1,
  type DenseSemanticGeometryV1,
  type LiveActDenseFaceFeaturesV1,
} from './liveact-dense-face-features-contract';
import {
  buildDenseFaceLocalFrame,
  denseLocalDistance,
  isFiniteVec3,
  mapGeometryToDenseLocal,
  type DenseLocalPointMap,
  type Vec3,
} from './liveact-dense-face-features-normalize';

function conf(face: number, geomAvail: number): number {
  return clamp01(face * clamp01(geomAvail));
}

function scalarFrom(
  value: number | null,
  faceConf: number,
  geomAvail: number,
): DenseScalarFeatureV1 {
  if (value === null || !Number.isFinite(value)) {
    return unavailableDenseScalar(conf(faceConf, geomAvail));
  }
  return availableDenseScalar(value, conf(faceConf, geomAvail));
}

function gapAt(
  upper: Vec3 | null | undefined,
  lower: Vec3 | null | undefined,
): number | null {
  if (!isFiniteVec3(upper) || !isFiniteVec3(lower)) return null;
  return denseLocalDistance(upper, lower);
}

function stationY(
  p: Vec3 | null | undefined,
  mouthCenter: Vec3,
): number | null {
  if (!isFiniteVec3(p)) return null;
  return p.y - mouthCenter.y;
}

function buildContour(
  ids: readonly [
    keyof DenseLocalPointMap,
    keyof DenseLocalPointMap,
    keyof DenseLocalPointMap,
    keyof DenseLocalPointMap,
    keyof DenseLocalPointMap,
  ],
  local: DenseLocalPointMap,
  mouthCenter: Vec3,
  faceConf: number,
): DenseContourStationsV1 {
  const s0 = scalarFrom(stationY(local[ids[0]], mouthCenter), faceConf, isFiniteVec3(local[ids[0]]) ? 1 : 0);
  const s1 = scalarFrom(stationY(local[ids[1]], mouthCenter), faceConf, isFiniteVec3(local[ids[1]]) ? 1 : 0);
  const s2 = scalarFrom(stationY(local[ids[2]], mouthCenter), faceConf, isFiniteVec3(local[ids[2]]) ? 1 : 0);
  const s3 = scalarFrom(stationY(local[ids[3]], mouthCenter), faceConf, isFiniteVec3(local[ids[3]]) ? 1 : 0);
  const s4 = scalarFrom(stationY(local[ids[4]], mouthCenter), faceConf, isFiniteVec3(local[ids[4]]) ? 1 : 0);
  const stations = [s0, s1, s2, s3, s4] as const;
  const availableCount = stations.filter((s) => s.available).length;
  if (availableCount < 3) {
    return { available: false, confidence: 0, stations: null };
  }
  return {
    available: true,
    confidence: conf(faceConf, availableCount / 5),
    stations,
  };
}

function extractLips(
  local: DenseLocalPointMap,
  faceConf: number,
): LiveActDenseFaceFeaturesV1['lips'] {
  const cL = local.mouthCornerLeft;
  const cR = local.mouthCornerRight;
  const uC = local.lipUpperCenter;
  const lC = local.lipLowerCenter;
  const uOL = local.lipUpperOuterLeft;
  const uIL = local.lipUpperInnerLeft;
  const uIR = local.lipUpperInnerRight;
  const uOR = local.lipUpperOuterRight;
  const lOL = local.lipLowerOuterLeft;
  const lIL = local.lipLowerInnerLeft;
  const lIR = local.lipLowerInnerRight;
  const lOR = local.lipLowerOuterRight;

  const width =
    isFiniteVec3(cL) && isFiniteVec3(cR) ? denseLocalDistance(cL, cR) : null;
  const gapCenter = gapAt(uC, lC);
  const gapLeft = gapAt(uIL ?? uOL, lIL ?? lOL);
  const gapRight = gapAt(uIR ?? uOR, lIR ?? lOR);

  const mouthCenter: Vec3 | null =
    isFiniteVec3(uC) && isFiniteVec3(lC)
      ? {
          x: (uC.x + lC.x) * 0.5,
          y: (uC.y + lC.y) * 0.5,
          z: (uC.z + lC.z) * 0.5,
        }
      : isFiniteVec3(cL) && isFiniteVec3(cR)
        ? {
            x: (cL.x + cR.x) * 0.5,
            y: (cL.y + cR.y) * 0.5,
            z: (cL.z + cR.z) * 0.5,
          }
        : null;

  const upperContour = mouthCenter
    ? buildContour(
        [
          'lipUpperOuterLeft',
          'lipUpperInnerLeft',
          'lipUpperCenter',
          'lipUpperInnerRight',
          'lipUpperOuterRight',
        ],
        local,
        mouthCenter,
        faceConf,
      )
    : { available: false, confidence: 0, stations: null };

  const lowerContour = mouthCenter
    ? buildContour(
        [
          'lipLowerOuterLeft',
          'lipLowerInnerLeft',
          'lipLowerCenter',
          'lipLowerInnerRight',
          'lipLowerOuterRight',
        ],
        local,
        mouthCenter,
        faceConf,
      )
    : { available: false, confidence: 0, stations: null };

  // Curvature: mean corner Y above mouth center → positive (smile)
  let curvature: number | null = null;
  if (mouthCenter && isFiniteVec3(cL) && isFiniteVec3(cR)) {
    curvature = (cL.y + cR.y) * 0.5 - mouthCenter.y;
  }

  // Compression: geometric — small gap relative to mouth width
  let compression: number | null = null;
  if (width !== null && width > 1e-6 && gapCenter !== null) {
    compression = clamp01(1 - gapCenter / (0.35 * width));
  }

  // Protrusion proxy: mean lip Z vs cheek reference Z
  let protrusion: number | null = null;
  if (isFiniteVec3(uC) && isFiniteVec3(lC)) {
    const lipZ = (uC.z + lC.z) * 0.5;
    const cheekL = local.cheekLeft;
    const cheekR = local.cheekRight;
    if (isFiniteVec3(cheekL) && isFiniteVec3(cheekR)) {
      const refZ = (cheekL.z + cheekR.z) * 0.5;
      protrusion = lipZ - refZ;
    } else {
      protrusion = lipZ;
    }
  }

  const cornerLeft =
    mouthCenter && isFiniteVec3(cL) ? cL.y - mouthCenter.y : null;
  const cornerRight =
    mouthCenter && isFiniteVec3(cR) ? cR.y - mouthCenter.y : null;
  const asymmetry =
    cornerLeft !== null && cornerRight !== null
      ? cornerLeft - cornerRight
      : null;

  return {
    width: scalarFrom(width, faceConf, width === null ? 0 : 1),
    gapLeft: scalarFrom(gapLeft, faceConf, gapLeft === null ? 0 : 1),
    gapCenter: scalarFrom(gapCenter, faceConf, gapCenter === null ? 0 : 1),
    gapRight: scalarFrom(gapRight, faceConf, gapRight === null ? 0 : 1),
    upperContour,
    lowerContour,
    curvature: scalarFrom(curvature, faceConf, curvature === null ? 0 : 1),
    compression: scalarFrom(compression, faceConf, compression === null ? 0 : 1),
    protrusion: scalarFrom(protrusion, faceConf, protrusion === null ? 0 : 1),
    cornerLeft: scalarFrom(cornerLeft, faceConf, cornerLeft === null ? 0 : 1),
    cornerRight: scalarFrom(cornerRight, faceConf, cornerRight === null ? 0 : 1),
    asymmetry: scalarFrom(asymmetry, faceConf, asymmetry === null ? 0 : 1),
  };
}

function extractEyes(
  local: DenseLocalPointMap,
  faceConf: number,
): LiveActDenseFaceFeaturesV1['eyes'] {
  const openL = gapAt(local.eyeUpperLeft, local.eyeLowerLeft);
  const openR = gapAt(local.eyeUpperRight, local.eyeLowerRight);

  const eyeCenterL =
    isFiniteVec3(local.eyeOuterLeft) && isFiniteVec3(local.eyeInnerLeft)
      ? {
          x: (local.eyeOuterLeft.x + local.eyeInnerLeft.x) * 0.5,
          y: (local.eyeOuterLeft.y + local.eyeInnerLeft.y) * 0.5,
          z: (local.eyeOuterLeft.z + local.eyeInnerLeft.z) * 0.5,
        }
      : null;
  const eyeCenterR =
    isFiniteVec3(local.eyeOuterRight) && isFiniteVec3(local.eyeInnerRight)
      ? {
          x: (local.eyeOuterRight.x + local.eyeInnerRight.x) * 0.5,
          y: (local.eyeOuterRight.y + local.eyeInnerRight.y) * 0.5,
          z: (local.eyeOuterRight.z + local.eyeInnerRight.z) * 0.5,
        }
      : null;

  const upperLidLeft =
    eyeCenterL && isFiniteVec3(local.eyeUpperLeft)
      ? local.eyeUpperLeft.y - eyeCenterL.y
      : null;
  const lowerLidLeft =
    eyeCenterL && isFiniteVec3(local.eyeLowerLeft)
      ? eyeCenterL.y - local.eyeLowerLeft.y
      : null;
  const upperLidRight =
    eyeCenterR && isFiniteVec3(local.eyeUpperRight)
      ? local.eyeUpperRight.y - eyeCenterR.y
      : null;
  const lowerLidRight =
    eyeCenterR && isFiniteVec3(local.eyeLowerRight)
      ? eyeCenterR.y - local.eyeLowerRight.y
      : null;

  return {
    eyeOpeningLeft: scalarFrom(openL, faceConf, openL === null ? 0 : 1),
    eyeOpeningRight: scalarFrom(openR, faceConf, openR === null ? 0 : 1),
    upperLidLeft: scalarFrom(upperLidLeft, faceConf, upperLidLeft === null ? 0 : 1),
    upperLidRight: scalarFrom(upperLidRight, faceConf, upperLidRight === null ? 0 : 1),
    lowerLidLeft: scalarFrom(lowerLidLeft, faceConf, lowerLidLeft === null ? 0 : 1),
    lowerLidRight: scalarFrom(lowerLidRight, faceConf, lowerLidRight === null ? 0 : 1),
  };
}

function extractBrows(
  local: DenseLocalPointMap,
  faceConf: number,
): LiveActDenseFaceFeaturesV1['brows'] {
  function disp(
    brow: Vec3 | null | undefined,
    eyeRef: Vec3 | null,
  ): number | null {
    if (!isFiniteVec3(brow) || !eyeRef) return null;
    return brow.y - eyeRef.y;
  }

  const eyeL =
    isFiniteVec3(local.eyeOuterLeft) && isFiniteVec3(local.eyeInnerLeft)
      ? {
          x: (local.eyeOuterLeft.x + local.eyeInnerLeft.x) * 0.5,
          y: (local.eyeOuterLeft.y + local.eyeInnerLeft.y) * 0.5,
          z: (local.eyeOuterLeft.z + local.eyeInnerLeft.z) * 0.5,
        }
      : null;
  const eyeR =
    isFiniteVec3(local.eyeOuterRight) && isFiniteVec3(local.eyeInnerRight)
      ? {
          x: (local.eyeOuterRight.x + local.eyeInnerRight.x) * 0.5,
          y: (local.eyeOuterRight.y + local.eyeInnerRight.y) * 0.5,
          z: (local.eyeOuterRight.z + local.eyeInnerRight.z) * 0.5,
        }
      : null;

  const iL = disp(local.browInnerLeft, eyeL);
  const mL = disp(local.browMidLeft, eyeL);
  const oL = disp(local.browOuterLeft, eyeL);
  const iR = disp(local.browInnerRight, eyeR);
  const mR = disp(local.browMidRight, eyeR);
  const oR = disp(local.browOuterRight, eyeR);

  return {
    innerLeft: scalarFrom(iL, faceConf, iL === null ? 0 : 1),
    midLeft: scalarFrom(mL, faceConf, mL === null ? 0 : 1),
    outerLeft: scalarFrom(oL, faceConf, oL === null ? 0 : 1),
    innerRight: scalarFrom(iR, faceConf, iR === null ? 0 : 1),
    midRight: scalarFrom(mR, faceConf, mR === null ? 0 : 1),
    outerRight: scalarFrom(oR, faceConf, oR === null ? 0 : 1),
  };
}

function extractCheeks(
  local: DenseLocalPointMap,
  faceConf: number,
): LiveActDenseFaceFeaturesV1['cheeks'] {
  const eyeL =
    isFiniteVec3(local.eyeOuterLeft) && isFiniteVec3(local.eyeInnerLeft)
      ? {
          x: (local.eyeOuterLeft.x + local.eyeInnerLeft.x) * 0.5,
          y: (local.eyeOuterLeft.y + local.eyeInnerLeft.y) * 0.5,
          z: (local.eyeOuterLeft.z + local.eyeInnerLeft.z) * 0.5,
        }
      : null;
  const eyeR =
    isFiniteVec3(local.eyeOuterRight) && isFiniteVec3(local.eyeInnerRight)
      ? {
          x: (local.eyeOuterRight.x + local.eyeInnerRight.x) * 0.5,
          y: (local.eyeOuterRight.y + local.eyeInnerRight.y) * 0.5,
          z: (local.eyeOuterRight.z + local.eyeInnerRight.z) * 0.5,
        }
      : null;

  const raiseL =
    eyeL && isFiniteVec3(local.cheekLeft) ? local.cheekLeft.y - eyeL.y : null;
  const raiseR =
    eyeR && isFiniteVec3(local.cheekRight) ? local.cheekRight.y - eyeR.y : null;

  // Compression proxy: cheek closer to nose alar in X
  const compL =
    isFiniteVec3(local.cheekLeft) && isFiniteVec3(local.noseAlarLeft)
      ? 1 - Math.min(1, Math.abs(local.cheekLeft.x - local.noseAlarLeft.x) * 2)
      : null;
  const compR =
    isFiniteVec3(local.cheekRight) && isFiniteVec3(local.noseAlarRight)
      ? 1 - Math.min(1, Math.abs(local.cheekRight.x - local.noseAlarRight.x) * 2)
      : null;

  // Volume/shape proxy: cheek Z prominence vs nose tip plane
  const volL =
    isFiniteVec3(local.cheekLeft) && isFiniteVec3(local.noseTip)
      ? local.cheekLeft.z - local.noseTip.z
      : isFiniteVec3(local.cheekLeft)
        ? local.cheekLeft.z
        : null;
  const volR =
    isFiniteVec3(local.cheekRight) && isFiniteVec3(local.noseTip)
      ? local.cheekRight.z - local.noseTip.z
      : isFiniteVec3(local.cheekRight)
        ? local.cheekRight.z
        : null;

  return {
    raiseLeft: scalarFrom(raiseL, faceConf, raiseL === null ? 0 : 1),
    raiseRight: scalarFrom(raiseR, faceConf, raiseR === null ? 0 : 1),
    compressionLeft: scalarFrom(compL, faceConf, compL === null ? 0 : 1),
    compressionRight: scalarFrom(compR, faceConf, compR === null ? 0 : 1),
    volumeProxyLeft: scalarFrom(volL, faceConf, volL === null ? 0 : 1),
    volumeProxyRight: scalarFrom(volR, faceConf, volR === null ? 0 : 1),
  };
}

function extractNose(
  local: DenseLocalPointMap,
  faceConf: number,
): LiveActDenseFaceFeaturesV1['nose'] {
  const bridge = local.noseBridge;
  const tip = local.noseTip;
  const alarL = local.noseAlarLeft;
  const alarR = local.noseAlarRight;
  const nlL = local.nasolabialLeft;
  const nlR = local.nasolabialRight;

  const alarDispL =
    isFiniteVec3(alarL) && isFiniteVec3(tip)
      ? denseLocalDistance(alarL, tip)
      : null;
  const alarDispR =
    isFiniteVec3(alarR) && isFiniteVec3(tip)
      ? denseLocalDistance(alarR, tip)
      : null;

  const nlDispL =
    isFiniteVec3(nlL) && isFiniteVec3(bridge)
      ? denseLocalDistance(nlL, bridge)
      : isFiniteVec3(nlL) && isFiniteVec3(tip)
        ? denseLocalDistance(nlL, tip)
        : null;
  const nlDispR =
    isFiniteVec3(nlR) && isFiniteVec3(bridge)
      ? denseLocalDistance(nlR, bridge)
      : isFiniteVec3(nlR) && isFiniteVec3(tip)
        ? denseLocalDistance(nlR, tip)
        : null;

  const width =
    isFiniteVec3(alarL) && isFiniteVec3(alarR)
      ? denseLocalDistance(alarL, alarR)
      : null;

  return {
    alarLeft: scalarFrom(alarDispL, faceConf, alarDispL === null ? 0 : 1),
    alarRight: scalarFrom(alarDispR, faceConf, alarDispR === null ? 0 : 1),
    nasolabialLeft: scalarFrom(nlDispL, faceConf, nlDispL === null ? 0 : 1),
    nasolabialRight: scalarFrom(nlDispR, faceConf, nlDispR === null ? 0 : 1),
    width: scalarFrom(width, faceConf, width === null ? 0 : 1),
  };
}

function extractJaw(
  local: DenseLocalPointMap,
  faceConf: number,
): LiveActDenseFaceFeaturesV1['jaw'] {
  const chin = local.chin;
  const jawL = local.jawLeft;
  const jawR = local.jawRight;
  const mouth =
    isFiniteVec3(local.lipUpperCenter) && isFiniteVec3(local.lipLowerCenter)
      ? {
          x: (local.lipUpperCenter.x + local.lipLowerCenter.x) * 0.5,
          y: (local.lipUpperCenter.y + local.lipLowerCenter.y) * 0.5,
          z: (local.lipUpperCenter.z + local.lipLowerCenter.z) * 0.5,
        }
      : null;

  // Chin drop: how far chin is below mouth center in -Y (local +Y is up)
  const chinDrop =
    isFiniteVec3(chin) && mouth ? mouth.y - chin.y : isFiniteVec3(chin) ? -chin.y : null;

  const chinForward = isFiniteVec3(chin) ? chin.z : null;

  const jawWidth =
    isFiniteVec3(jawL) && isFiniteVec3(jawR) ? denseLocalDistance(jawL, jawR) : null;

  return {
    chinDrop: scalarFrom(chinDrop, faceConf, chinDrop === null ? 0 : 1),
    chinForward: scalarFrom(chinForward, faceConf, chinForward === null ? 0 : 1),
    jawWidth: scalarFrom(jawWidth, faceConf, jawWidth === null ? 0 : 1),
  };
}

/**
 * Extract provider-neutral dense features from semantic geometry.
 * RAW geometric features of the current inference sample — no temporal filter.
 */
export function extractDenseFaceFeatures(input: {
  geometry: DenseSemanticGeometryV1;
  sequence: number;
  timestampMs: number;
}): LiveActDenseFaceFeaturesV1 {
  const faceConf = clamp01(input.geometry.faceConfidence);
  const frame = buildDenseFaceLocalFrame(input.geometry);

  if (frame.status !== 'ok') {
    return createEmptyDenseFaceFeatures({
      sequence: input.sequence,
      timestampMs: input.timestampMs,
      faceConfidence: faceConf,
      normalizationStatus: frame.status,
    });
  }

  const local = mapGeometryToDenseLocal(input.geometry, frame);
  const features: LiveActDenseFaceFeaturesV1 = {
    contractVersion: LIVEACT_DENSE_FACE_FEATURES_CONTRACT,
    sequence: input.sequence,
    timestampMs: input.timestampMs,
    presence: true,
    normalizationStatus: 'ok',
    faceConfidence: faceConf,
    lips: extractLips(local, faceConf),
    eyes: extractEyes(local, faceConf),
    brows: extractBrows(local, faceConf),
    cheeks: extractCheeks(local, faceConf),
    nose: extractNose(local, faceConf),
    jaw: extractJaw(local, faceConf),
  };
  return features;
}

/** Deterministic JSON-stable serialization for golden equality (excludes timestamps if needed). */
export function denseFeaturesForEquality(
  frame: LiveActDenseFaceFeaturesV1,
): Omit<LiveActDenseFaceFeaturesV1, 'timestampMs'> & { timestampMs: 0 } {
  return { ...frame, timestampMs: 0 };
}
