/**
 * liveact-mediapipe-sample — MediaPipe Face Landmarker output → LiveActSourceSample (pure domain).
 * Location: src/domains/character/liveact/liveact-mediapipe-sample.ts
 *
 * Shared by the LiveAct MediaPipe source and the tracking round-trip harness, so the harness
 * measures exactly the app's mapping. Only blendshape scores and the head matrix are read —
 * landmarks never enter a sample (local-only contract).
 *
 * Conventions (verified by `npm run qa:liveact-tracking-roundtrip`): MediaPipe input is the raw,
 * unmirrored frame and its Left/Right blendshapes are anatomical (the user's own left). The
 * mapped sample (Diagnostics V2 RAW) is therefore anatomical too: +yaw / +x = toward the user's
 * own left, +pitch = face down, +roll = head tilted toward the user's right shoulder, +y = gaze up.
 * The avatars use the same anatomical frame (+yaw = toward the avatar's own left, ...).
 */

import { LIVEACT_FACE_CHANNELS, type LiveActFaceChannelId } from './liveact-face-contract';
import type { LiveActHeadPose, LiveActSourceSample } from './liveact-contract';

/**
 * LiveAct drives the avatar as the user's mirror image, like the mirrored camera preview: closing
 * the left eye closes the avatar's right eye, which is on the same screen side. The engine applies
 * {@link mirrorLiveActSourceSample} between RAW and MAPPED, so RAW stays the tracker's anatomical
 * reading.
 */
export const LIVEACT_MIRROR_AVATAR = true;

export interface LiveActMediaPipeCategory {
  categoryName: string;
  score: number;
}

export interface LiveActMediaPipeFaceInput {
  categories: readonly LiveActMediaPipeCategory[] | undefined;
  /** `facialTransformationMatrixes[i].data` — column-major 4×4. */
  matrix?: ArrayLike<number> | null;
  enableHeadPose: boolean;
  faceIndex: number;
  faceCount: number;
}

/**
 * Head angles from the facial transformation matrix (camera space of the raw frame: +X image
 * right, +Y up, +Z toward the camera; identity = looking straight into the camera).
 * Intrinsic YXZ — exactly what the avatar outputs compose with `Euler(pitch, yaw, roll, 'YXZ')`
 * on a +Z-facing head. Only ratios are used, so a uniform scale in the matrix cancels out.
 */
export function liveActHeadPoseFromFacialTransform(
  matrix: ArrayLike<number> | null | undefined,
): LiveActHeadPose | null {
  if (!matrix || matrix.length < 11) return null;
  const at = (row: number, col: number): number => Number(matrix[col * 4 + row]);
  const r00 = at(0, 0);
  const r02 = at(0, 2);
  const r10 = at(1, 0);
  const r11 = at(1, 1);
  const r12 = at(1, 2);
  const r20 = at(2, 0);
  const r22 = at(2, 2);
  if (![r00, r02, r10, r11, r12, r20, r22].every(Number.isFinite)) return null;
  const cosPitch = Math.hypot(r10, r11);
  const pitch = Math.atan2(-r12, cosPitch);
  if (cosPitch < 1e-6) {
    // Gimbal lock (±90° pitch): yaw and roll share one axis — attribute it to yaw.
    return { yaw: Math.atan2(-r20, r00), pitch, roll: 0 };
  }
  return { yaw: Math.atan2(r02, r22), pitch, roll: Math.atan2(r10, r11) };
}

function mirroredChannelTwin(id: LiveActFaceChannelId): LiveActFaceChannelId {
  const twin = id.endsWith('Left')
    ? `${id.slice(0, -'Left'.length)}Right`
    : id.endsWith('Right')
      ? `${id.slice(0, -'Right'.length)}Left`
      : id;
  return LIVEACT_FACE_CHANNELS.find((candidate) => candidate === twin) ?? id;
}

const MIRRORED_CHANNEL: ReadonlyMap<LiveActFaceChannelId, LiveActFaceChannelId> = new Map(
  LIVEACT_FACE_CHANNELS.map((id) => [id, mirroredChannelTwin(id)]),
);

/** Left/right twin of a face channel (`eyeBlinkLeft` ↔ `eyeBlinkRight`, `jawLeft` ↔ `jawRight`). */
export function mirroredLiveActFaceChannel(id: LiveActFaceChannelId): LiveActFaceChannelId {
  return MIRRORED_CHANNEL.get(id) ?? id;
}

/**
 * Mirror image of a sample: left/right channels and eyes swap, horizontal gaze, yaw and roll
 * flip sign; pitch and vertical gaze stay. Applying it twice returns the original sample.
 */
export function mirrorLiveActSourceSample(sample: LiveActSourceSample): LiveActSourceSample {
  const face: Partial<Record<LiveActFaceChannelId, number>> = {};
  for (const id of LIVEACT_FACE_CHANNELS) {
    const value = sample.face[id];
    if (typeof value === 'number') face[mirroredLiveActFaceChannel(id)] = value;
  }
  return {
    ...sample,
    headYaw: -sample.headYaw,
    headRoll: -sample.headRoll,
    eyeLeftX: -sample.eyeRightX,
    eyeLeftY: sample.eyeRightY,
    eyeRightX: -sample.eyeLeftX,
    eyeRightY: sample.eyeLeftY,
    face,
  };
}

/** Anatomical (unmirrored) sample — see the conventions in the header. */
export function mapMediaPipeFaceToLiveActSample(input: LiveActMediaPipeFaceInput): LiveActSourceSample {
  const byName = new Map((input.categories ?? []).map((c) => [c.categoryName, c.score]));
  const score = (name: string): number => byName.get(name) ?? 0;
  const face: Partial<Record<LiveActFaceChannelId, number>> = {};
  for (const id of LIVEACT_FACE_CHANNELS) {
    const value = byName.get(id);
    if (typeof value === 'number') face[id] = value;
  }
  const head = input.enableHeadPose ? liveActHeadPoseFromFacialTransform(input.matrix) : null;
  return {
    presence: 1,
    headYaw: head?.yaw ?? 0,
    headPitch: head?.pitch ?? 0,
    headRoll: head?.roll ?? 0,
    // In/Out are relative to the nose: toward the user's left = left eye out, right eye in.
    eyeLeftX: score('eyeLookOutLeft') - score('eyeLookInLeft'),
    eyeLeftY: score('eyeLookUpLeft') - score('eyeLookDownLeft'),
    eyeRightX: score('eyeLookInRight') - score('eyeLookOutRight'),
    eyeRightY: score('eyeLookUpRight') - score('eyeLookDownRight'),
    face,
    faceIndex: input.faceIndex,
    faceCount: input.faceCount,
  };
}
