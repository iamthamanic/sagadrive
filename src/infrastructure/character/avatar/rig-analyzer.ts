/**
 * Analyze a loaded Three.js avatar graph into SagaDriveHumanoidRigV1 capabilities.
 * Location: src/infrastructure/character/avatar/rig-analyzer.ts
 *
 * Bounded traversal only. Never upgrades capabilities from provider success strings.
 */

import * as THREE from 'three';
import { VRM } from '@pixiv/three-vrm';
import {
  RIG_CONTRACT_VERSION,
  resolveAvatarRigCapabilities,
  summarizeRigAnalysisStatus,
  type AvatarRigAnalysisResult,
  type SagaDriveHumanoidAnchorId,
  type SagaDriveHumanoidBoneId,
  type SagaDriveHumanoidRigV1,
} from '../../../domains/character/avatar';
import {
  RIG_ANALYSIS_MAX_BONES,
  RIG_ANALYSIS_MAX_NODES,
  resolveCanonicalBoneId,
} from './rig-bone-aliases';

function deriveAnchors(
  bones: Readonly<Partial<Record<SagaDriveHumanoidBoneId, string>>>,
): Partial<Record<SagaDriveHumanoidAnchorId, string>> {
  const anchors: Partial<Record<SagaDriveHumanoidAnchorId, string>> = {};
  if (bones.head) anchors.head = bones.head;
  if (bones.chest) {
    anchors.chest = bones.chest;
    anchors.back = bones.chest;
  }
  if (bones.hips) anchors.hips = bones.hips;
  if (bones.leftHand) anchors.leftHand = bones.leftHand;
  if (bones.rightHand) anchors.rightHand = bones.rightHand;
  if (bones.leftFoot) anchors.leftFoot = bones.leftFoot;
  if (bones.rightFoot) anchors.rightFoot = bones.rightFoot;
  return anchors;
}

export function analyzeAvatarRigFromObject3D(
  root: THREE.Object3D,
  options: { vrm?: VRM; claimedProviderSuccess?: boolean } = {},
): AvatarRigAnalysisResult {
  // claimedProviderSuccess is intentionally ignored (fail-closed against client/provider lies).
  void options.claimedProviderSuccess;

  const mappedBones: Partial<Record<SagaDriveHumanoidBoneId, string>> = {};
  let boneCount = 0;
  let nodeCount = 0;
  let hasSkinnedMesh = false;
  let truncated = false;

  root.traverse((object) => {
    if (truncated) return;
    nodeCount += 1;
    if (nodeCount > RIG_ANALYSIS_MAX_NODES) {
      truncated = true;
      return;
    }
    if (object instanceof THREE.SkinnedMesh) {
      hasSkinnedMesh = true;
      const bones = object.skeleton?.bones ?? [];
      for (const bone of bones) {
        boneCount += 1;
        if (boneCount > RIG_ANALYSIS_MAX_BONES) {
          truncated = true;
          break;
        }
        const canonical = resolveCanonicalBoneId(bone.name);
        if (!canonical) continue;
        if (!mappedBones[canonical]) {
          mappedBones[canonical] = bone.name;
        }
      }
    }
    if (object instanceof THREE.Bone) {
      boneCount += 1;
      const canonical = resolveCanonicalBoneId(object.name);
      if (canonical && !mappedBones[canonical]) {
        mappedBones[canonical] = object.name;
      }
    }
  });

  const vrm = options.vrm;
  const hasVrmHumanoid = Boolean(vrm?.humanoid);
  if (vrm?.humanoid) {
    const humanoid = vrm.humanoid;
    const vrmMap: Array<[SagaDriveHumanoidBoneId, string]> = [
      ['hips', 'hips'],
      ['spine', 'spine'],
      ['chest', 'chest'],
      ['neck', 'neck'],
      ['head', 'head'],
      ['leftUpperArm', 'leftUpperArm'],
      ['leftLowerArm', 'leftLowerArm'],
      ['leftHand', 'leftHand'],
      ['rightUpperArm', 'rightUpperArm'],
      ['rightLowerArm', 'rightLowerArm'],
      ['rightHand', 'rightHand'],
      ['leftUpperLeg', 'leftUpperLeg'],
      ['leftLowerLeg', 'leftLowerLeg'],
      ['leftFoot', 'leftFoot'],
      ['rightUpperLeg', 'rightUpperLeg'],
      ['rightLowerLeg', 'rightLowerLeg'],
      ['rightFoot', 'rightFoot'],
    ];
    for (const [canonical, vrmBone] of vrmMap) {
      const node = humanoid.getNormalizedBoneNode(
        vrmBone as 'hips' | 'spine' | 'chest' | 'neck' | 'head' | 'leftUpperArm' | 'leftLowerArm' | 'leftHand' | 'rightUpperArm' | 'rightLowerArm' | 'rightHand' | 'leftUpperLeg' | 'leftLowerLeg' | 'leftFoot' | 'rightUpperLeg' | 'rightLowerLeg' | 'rightFoot',
      );
      if (node && !mappedBones[canonical]) {
        mappedBones[canonical] = node.name || vrmBone;
        boneCount = Math.max(boneCount, 1);
      }
    }
  }

  root.updateWorldMatrix(true, true);
  const box = new THREE.Box3().setFromObject(root);
  const size = box.isEmpty() ? new THREE.Vector3(1, 1, 1) : box.getSize(new THREE.Vector3());
  const heightMeters = Math.max(size.y, 0.001);
  // Target ~1.7m adult; clamp extreme scales in capability layer.
  const scaleFactor = 1.7 / heightMeters;

  const capabilities = resolveAvatarRigCapabilities({
    boneCount,
    mappedBones,
    hasVrmHumanoid,
    hasSkinnedMesh,
    scaleFactor,
  });
  const limitations = truncated
    ? [
        ...capabilities.limitations,
        'Analyse abgebrochen (Knoten-/Knochen-Limit) — Ergebnis eingeschränkt.',
      ]
    : [...capabilities.limitations];
  const finalCapabilities = { ...capabilities, limitations };

  const rig: SagaDriveHumanoidRigV1 = {
    contractVersion: RIG_CONTRACT_VERSION,
    bones: mappedBones,
    anchors: deriveAnchors(mappedBones),
    upAxis: 'y',
    forwardAxis: 'z',
    unit: 'meter',
    scaleFactor: Math.min(20, Math.max(0.05, scaleFactor)),
  };

  const status = summarizeRigAnalysisStatus(finalCapabilities);
  const message =
    status === 'ready'
      ? 'Rig-Analyse abgeschlossen.'
      : status === 'limited'
        ? 'Rig erkannt — einige Fähigkeiten sind eingeschränkt.'
        : status === 'analyzing'
          ? 'Rig-Analyse läuft …'
          : 'Rig-Analyse fehlgeschlagen.';

  return { status, capabilities: finalCapabilities, rig, message };
}
