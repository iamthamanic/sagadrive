/**
 * LiveAct capability inspector rows — Input / Mapping / Avatar (pure domain, #333).
 * Location: src/domains/character/liveact/liveact-capability-inspector.ts
 */

import {
  LIVEACT_FACE_CHANNELS,
  type LiveActFaceChannelId,
} from './liveact-face-contract';
import type { LiveActCapabilitiesV1 } from './liveact-capabilities';

export interface LiveActCapabilityInspectorRow {
  id: string;
  labelDe: string;
  input: boolean;
  mapping: boolean;
  avatar: boolean;
}

/** Face channels always listed in inspector when input.face is on (key + active targets). */
const INSPECTOR_FACE_CHANNEL_IDS: readonly LiveActFaceChannelId[] = [
  'eyeBlinkLeft',
  'eyeBlinkRight',
  'jawOpen',
  'mouthSmileLeft',
  'mouthSmileRight',
  'mouthFrownLeft',
  'mouthFrownRight',
  'mouthPucker',
  'mouthShrugUpper',
  'mouthShrugLower',
];

function faceChannelLabelDe(id: LiveActFaceChannelId): string {
  return id;
}

export function buildLiveActCapabilityInspectorRows(
  caps: LiveActCapabilitiesV1,
): LiveActCapabilityInspectorRow[] {
  const rows: LiveActCapabilityInspectorRow[] = [
    {
      id: 'head',
      labelDe: 'Kopf',
      input: caps.input.headPose,
      mapping: caps.input.headPose,
      avatar: caps.avatarBones.head,
    },
    {
      id: 'leftEye',
      labelDe: 'Auge links',
      input: caps.input.eyeGaze,
      mapping: caps.input.eyeGaze,
      avatar: caps.avatarBones.leftEye,
    },
    {
      id: 'rightEye',
      labelDe: 'Auge rechts',
      input: caps.input.eyeGaze,
      mapping: caps.input.eyeGaze,
      avatar: caps.avatarBones.rightEye,
    },
  ];

  const faceIds = new Set<LiveActFaceChannelId>();
  for (const id of INSPECTOR_FACE_CHANNEL_IDS) faceIds.add(id);
  for (const id of LIVEACT_FACE_CHANNELS) {
    if (id === '_neutral') continue;
    if (caps.avatarFace[id]) faceIds.add(id);
  }

  for (const id of LIVEACT_FACE_CHANNELS) {
    if (id === '_neutral' || !faceIds.has(id)) continue;
    rows.push({
      id: `face:${id}`,
      labelDe: faceChannelLabelDe(id),
      input: caps.input.face,
      mapping: caps.input.face,
      avatar: caps.avatarFace[id],
    });
  }

  return rows;
}
