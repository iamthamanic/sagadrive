/**
 * avatar-structure-scanner — bounded glTF/GLB structure scan via @gltf-transform/core (#252).
 * Location: src/infrastructure/character/avatar/avatar-structure-scanner.ts
 *
 * No remote URI resolution. Client preview uses the same extractor but domain marks
 * authoritative=false. Server persist must use authoritativeAnalyzeAvatarStructure.
 */

import { NodeIO } from '@gltf-transform/core';
import {
  AVATAR_STRUCTURE_ANALYSIS_BOUNDS,
  authoritativeAnalyzeAvatarStructure,
  previewAnalyzeAvatarStructure,
  type AvatarStructureEvidence,
  type AvatarStructureAnalysisResultV2,
  type AvatarStructureMeshEvidence,
  type AvatarStructureNodeEvidence,
} from '../../../domains/character/avatar';
import type { SagaDriveHumanoidBoneId } from '../../../domains/character/avatar';
import { resolveCanonicalBoneId } from './rig-bone-aliases';

function emptyEvidence(partial: Partial<AvatarStructureEvidence> = {}): AvatarStructureEvidence {
  return {
    byteSize: 0,
    nodeCount: 0,
    meshCount: 0,
    skinnedMeshCount: 0,
    skeletonCount: 0,
    boneCount: 0,
    morphTargetCount: 0,
    humanoidBones: {},
    nodes: [],
    meshes: [],
    truncated: false,
    rejectedRemoteUri: false,
    ...partial,
  };
}

/**
 * Extract structural evidence from GLB/GLTF bytes. Fail-closed on size / remote URI.
 */
export async function extractAvatarStructureEvidenceFromBytes(
  bytes: Uint8Array,
): Promise<AvatarStructureEvidence> {
  const byteSize = bytes.byteLength;
  if (byteSize <= 0) {
    return emptyEvidence({ parseError: 'Leeres Asset.', byteSize });
  }
  if (byteSize > AVATAR_STRUCTURE_ANALYSIS_BOUNDS.maxBytes) {
    return emptyEvidence({
      byteSize,
      truncated: true,
      parseError: 'Asset zu groß für Analyse.',
    });
  }

  // Reject obvious external URI hints in ASCII window before parse.
  const probeLen = Math.min(bytes.byteLength, 256 * 1024);
  let ascii = '';
  for (let i = 0; i < probeLen; i += 1) {
    const c = bytes[i];
    ascii += c >= 32 && c < 127 ? String.fromCharCode(c) : ' ';
  }
  const lower = ascii.toLowerCase();
  if (
    lower.includes('http://') ||
    lower.includes('https://') ||
    lower.includes('file://') ||
    /"uri"\s*:\s*"https?:/i.test(ascii)
  ) {
    return emptyEvidence({
      byteSize,
      rejectedRemoteUri: true,
      parseError: 'Remote-URI in glTF erkannt — Analyse abgelehnt.',
    });
  }

  try {
    const io = new NodeIO();
    // Do not register remote fetch — NodeIO without fetch stays local buffers only.
    const document = await io.readBinary(bytes);
    const root = document.getRoot();

    const nodes: AvatarStructureNodeEvidence[] = [];
    const meshes: AvatarStructureMeshEvidence[] = [];
    const humanoidBones: Partial<Record<SagaDriveHumanoidBoneId, string>> = {};
    let truncated = false;
    let boneCount = 0;
    let morphTargetCount = 0;
    let skinnedMeshCount = 0;

    const glNodes = root.listNodes();
    const glMeshes = root.listMeshes();
    const glSkins = root.listSkins();

    if (glNodes.length > AVATAR_STRUCTURE_ANALYSIS_BOUNDS.maxNodes) {
      truncated = true;
    }
    if (glMeshes.length > AVATAR_STRUCTURE_ANALYSIS_BOUNDS.maxMeshes) {
      truncated = true;
    }
    if (glSkins.length > AVATAR_STRUCTURE_ANALYSIS_BOUNDS.maxSkeletons) {
      truncated = true;
    }

    const nodeLimit = Math.min(glNodes.length, AVATAR_STRUCTURE_ANALYSIS_BOUNDS.maxNodes);
    for (let i = 0; i < nodeLimit; i += 1) {
      const node = glNodes[i];
      const mesh = node.getMesh();
      const skin = node.getSkin();
      const extrasRoot = node.getExtras();

      nodes.push({
        name: node.getName() || undefined,
        extras: extrasRoot ?? undefined,
        meshIndex: mesh ? glMeshes.indexOf(mesh) : undefined,
        skinIndex: skin ? glSkins.indexOf(skin) : undefined,
      });
    }

    const meshLimit = Math.min(glMeshes.length, AVATAR_STRUCTURE_ANALYSIS_BOUNDS.maxMeshes);
    for (let i = 0; i < meshLimit; i += 1) {
      const mesh = glMeshes[i];
      const primitives = mesh.listPrimitives();
      let meshMorphs = 0;
      let isSkinned = false;
      for (const prim of primitives) {
        const targets = prim.listTargets();
        meshMorphs += targets.length;
        // Skinned if WEIGHTS_0 / JOINTS_0 present
        if (prim.getAttribute('JOINTS_0') || prim.getAttribute('WEIGHTS_0')) {
          isSkinned = true;
        }
      }
      if (isSkinned) skinnedMeshCount += 1;
      morphTargetCount += meshMorphs;
      if (morphTargetCount > AVATAR_STRUCTURE_ANALYSIS_BOUNDS.maxMorphTargets) {
        truncated = true;
      }
      if (skinnedMeshCount > AVATAR_STRUCTURE_ANALYSIS_BOUNDS.maxSkinnedMeshes) {
        truncated = true;
      }
      meshes.push({
        name: mesh.getName() || undefined,
        primitiveCount: primitives.length,
        morphTargetCount: meshMorphs,
        isSkinned,
      });
    }

    const skinLimit = Math.min(glSkins.length, AVATAR_STRUCTURE_ANALYSIS_BOUNDS.maxSkeletons);
    for (let i = 0; i < skinLimit; i += 1) {
      const joints = glSkins[i].listJoints();
      for (const joint of joints) {
        boneCount += 1;
        if (boneCount > AVATAR_STRUCTURE_ANALYSIS_BOUNDS.maxBones) {
          truncated = true;
          break;
        }
        const name = joint.getName();
        const canonical = resolveCanonicalBoneId(name);
        if (canonical && !humanoidBones[canonical]) {
          humanoidBones[canonical] = name;
        }
      }
      if (truncated) break;
    }

    return {
      byteSize,
      nodeCount: glNodes.length,
      meshCount: glMeshes.length,
      skinnedMeshCount,
      skeletonCount: glSkins.length,
      boneCount,
      morphTargetCount,
      humanoidBones,
      nodes,
      meshes,
      truncated,
      rejectedRemoteUri: false,
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unbekannter Parse-Fehler';
    return emptyEvidence({ byteSize, parseError: message });
  }
}

export async function analyzeAvatarGlbBytesAuthoritative(
  bytes: Uint8Array,
): Promise<AvatarStructureAnalysisResultV2> {
  const evidence = await extractAvatarStructureEvidenceFromBytes(bytes);
  return authoritativeAnalyzeAvatarStructure(evidence);
}

/** Non-authoritative client preview — same scanner, UX only. */
export async function previewAnalyzeAvatarGlbBytes(
  bytes: Uint8Array,
): Promise<AvatarStructureAnalysisResultV2> {
  const evidence = await extractAvatarStructureEvidenceFromBytes(bytes);
  return previewAnalyzeAvatarStructure(evidence);
}
