/**
 * Avatar save materialized export — pure domain (no React / network / Three).
 * Location: src/domains/character/avatar/avatar-save-export.ts
 *
 * Compact appearance.avatar remains SoT. On explicit Character Save, build an
 * owner-scoped GLB package that embeds morph + base traits + version metadata.
 * Runtime/inventory overlays must never enter the export payload.
 */

import type { CharacterAvatarDto } from '../domain/character.entity';
import {
  MORPH_CONTRACT_VERSION,
  createDefaultAvatarMorphState,
  validateAvatarMorphInput,
  type SagaDriveAvatarMorphStateV1,
} from './morph-contract';
import { MTOON_PROFILE_VERSION } from './mtoon-profile';
import { RIG_CONTRACT_VERSION } from './rig-contract';
import { BASE_BODY_ASSET_VERSION, BASE_BODY_CONTRACT_VERSION } from './base-body-contract';
import {
  serializePersistedBaseTraits,
  type BaseTraitSelection,
  type RuntimeTraitOverlay,
} from './trait-layers';

export const AVATAR_SAVE_EXPORT_VERSION = 'AvatarSaveExportV1' as const;
export const AVATAR_SAVE_EXPORT_MAX_BYTES = 150 * 1024 * 1024;

export type AvatarSaveExportUiStatus =
  | 'idle'
  | 'preparing'
  | 'uploading'
  | 'activating'
  | 'success'
  | 'error';

export interface AvatarSaveExportPayloadV1 {
  contractVersion: typeof AVATAR_SAVE_EXPORT_VERSION;
  morphContractVersion: typeof MORPH_CONTRACT_VERSION;
  rigContractVersion: typeof RIG_CONTRACT_VERSION;
  mtoonProfileVersion: typeof MTOON_PROFILE_VERSION;
  baseBodyContractVersion: typeof BASE_BODY_CONTRACT_VERSION;
  baseBodyAssetVersion: string;
  preset: string;
  modelFormat: 'vrm' | 'glb';
  /** Allowlisted catalog path when no imported mesh was copied into the package. */
  catalogBasePath?: string;
  /** True when source mesh bytes were embedded; false for metadata-only package. */
  embedsSourceMesh: boolean;
  baseTraits: BaseTraitSelection;
  morph: SagaDriveAvatarMorphStateV1;
  /** Explicitly empty — overlays are filtered out and must stay empty. */
  runtimeOverlays: readonly [];
}

export interface AvatarSaveExportArtifact {
  artifactId: string;
  storagePath: string;
  modelUrl: string;
  byteSize: number;
  format: 'glb';
  payload: AvatarSaveExportPayloadV1;
}

/**
 * Strip runtime overlays and rebuild export payload from compact avatar only.
 * Passing overlays is allowed so callers can prove they are discarded.
 */
export function buildAvatarSaveExportPayload(input: {
  avatar: CharacterAvatarDto;
  runtimeOverlays?: readonly RuntimeTraitOverlay[];
  embedsSourceMesh?: boolean;
  catalogBasePath?: string;
}): AvatarSaveExportPayloadV1 {
  // Overlays are intentionally ignored — never bake inventory/session equipment.
  void input.runtimeOverlays;

  const baseTraits = serializePersistedBaseTraits({
    head: input.avatar.traits.head,
    ears: input.avatar.traits.ears,
    hair: input.avatar.traits.hair,
    clothing: input.avatar.traits.clothing,
    accessory: input.avatar.traits.accessory,
  });

  const morphValidation = validateAvatarMorphInput(
    input.avatar.morph ?? createDefaultAvatarMorphState(),
  );
  if (!morphValidation.ok) {
    throw new Error(morphValidation.warnings[0] ?? 'Morph-State ungültig für Export.');
  }

  return {
    contractVersion: AVATAR_SAVE_EXPORT_VERSION,
    morphContractVersion: MORPH_CONTRACT_VERSION,
    rigContractVersion: RIG_CONTRACT_VERSION,
    mtoonProfileVersion: MTOON_PROFILE_VERSION,
    baseBodyContractVersion: BASE_BODY_CONTRACT_VERSION,
    baseBodyAssetVersion: BASE_BODY_ASSET_VERSION,
    preset: input.avatar.preset,
    modelFormat: input.avatar.model_format,
    catalogBasePath: input.catalogBasePath,
    embedsSourceMesh: Boolean(input.embedsSourceMesh),
    baseTraits,
    morph: morphValidation.state,
    runtimeOverlays: [],
  };
}

/** True when payload has no runtime overlays and morph contract matches. */
export function assertExportPayloadSafe(payload: AvatarSaveExportPayloadV1): void {
  if (payload.contractVersion !== AVATAR_SAVE_EXPORT_VERSION) {
    throw new Error('Unbekannte Export-Vertragsversion.');
  }
  if (payload.runtimeOverlays.length !== 0) {
    throw new Error('Export darf keine Runtime-Overlays enthalten.');
  }
  if (payload.morph.contractVersion !== MORPH_CONTRACT_VERSION) {
    throw new Error('Morph-Version im Export stimmt nicht.');
  }
}

export function buildAvatarExportStoragePath(input: {
  ownerUserId: string;
  artifactId: string;
}): string {
  const owner = input.ownerUserId.trim();
  const artifactId = input.artifactId.trim();
  if (!owner || !artifactId) throw new Error('Owner oder Artefakt fehlt.');
  if (owner.includes('/') || artifactId.includes('/')) {
    throw new Error('Ungültiger Storage-Pfad.');
  }
  return `${owner}/exports/${artifactId}.glb`;
}

/**
 * Encode export payload as a minimal valid GLB (JSON chunk + extras).
 * When sourceMeshBytes is a glTF-binary container, prefer copying it and injecting extras.
 */
export function encodeAvatarExportGlb(input: {
  payload: AvatarSaveExportPayloadV1;
  sourceMeshBytes?: Uint8Array;
}): Uint8Array {
  assertExportPayloadSafe(input.payload);

  if (input.sourceMeshBytes && isGlbContainer(input.sourceMeshBytes)) {
    const injected = tryInjectExtrasIntoGlb(input.sourceMeshBytes, input.payload);
    if (injected) {
      if (injected.byteLength > AVATAR_SAVE_EXPORT_MAX_BYTES) {
        throw new Error('Export-Artefakt ist zu groß.');
      }
      return injected;
    }
  }

  const json = JSON.stringify({
    asset: { version: '2.0', generator: 'SagaDriveAvatarSaveExportV1' },
    scenes: [{ nodes: [0] }],
    scene: 0,
    nodes: [{ name: 'SagaDriveAvatarExport' }],
    extras: {
      sagadriveAvatarExport: input.payload,
    },
  });
  const jsonBytes = new TextEncoder().encode(json);
  const jsonPadding = (4 - (jsonBytes.byteLength % 4)) % 4;
  const jsonChunkLength = jsonBytes.byteLength + jsonPadding;
  const totalLength = 12 + 8 + jsonChunkLength;
  if (totalLength > AVATAR_SAVE_EXPORT_MAX_BYTES) {
    throw new Error('Export-Artefakt ist zu groß.');
  }

  const out = new Uint8Array(totalLength);
  const view = new DataView(out.buffer);
  // magic "glTF"
  out[0] = 0x67;
  out[1] = 0x6c;
  out[2] = 0x54;
  out[3] = 0x46;
  view.setUint32(4, 2, true);
  view.setUint32(8, totalLength, true);
  view.setUint32(12, jsonChunkLength, true);
  view.setUint32(16, 0x4e4f534a, true); // JSON
  out.set(jsonBytes, 20);
  for (let i = 0; i < jsonPadding; i += 1) {
    out[20 + jsonBytes.byteLength + i] = 0x20;
  }
  return out;
}

function isGlbContainer(bytes: Uint8Array): boolean {
  return (
    bytes.length >= 12 &&
    bytes[0] === 0x67 &&
    bytes[1] === 0x6c &&
    bytes[2] === 0x54 &&
    bytes[3] === 0x46
  );
}

/**
 * Best-effort: rewrite GLB JSON chunk extras. Returns null if structure is unsupported.
 */
function tryInjectExtrasIntoGlb(
  source: Uint8Array,
  payload: AvatarSaveExportPayloadV1,
): Uint8Array | null {
  if (source.byteLength < 20) return null;
  const view = new DataView(source.buffer, source.byteOffset, source.byteLength);
  const jsonChunkLength = view.getUint32(12, true);
  const jsonChunkType = view.getUint32(16, true);
  if (jsonChunkType !== 0x4e4f534a) return null;
  const jsonStart = 20;
  const jsonEnd = jsonStart + jsonChunkLength;
  if (jsonEnd > source.byteLength) return null;

  let jsonText = '';
  for (let i = jsonStart; i < jsonEnd; i += 1) {
    const c = source[i];
    if (c === 0x20 || c === 0x00) continue; // skip padding
    jsonText += String.fromCharCode(c);
  }
  // Re-read without skipping spaces inside JSON — use raw then trim end padding only.
  const rawJson = source.subarray(jsonStart, jsonEnd);
  let end = rawJson.byteLength;
  while (end > 0 && (rawJson[end - 1] === 0x20 || rawJson[end - 1] === 0x00)) end -= 1;
  jsonText = new TextDecoder().decode(rawJson.subarray(0, end));

  let doc: Record<string, unknown>;
  try {
    doc = JSON.parse(jsonText) as Record<string, unknown>;
  } catch {
    return null;
  }
  const extras =
    typeof doc.extras === 'object' && doc.extras !== null
      ? { ...(doc.extras as Record<string, unknown>) }
      : {};
  extras.sagadriveAvatarExport = payload;
  doc.extras = extras;

  const nextJson = new TextEncoder().encode(JSON.stringify(doc));
  const jsonPadding = (4 - (nextJson.byteLength % 4)) % 4;
  const nextJsonChunkLength = nextJson.byteLength + jsonPadding;
  const rest = source.subarray(jsonEnd);
  const totalLength = 12 + 8 + nextJsonChunkLength + rest.byteLength;
  if (totalLength > AVATAR_SAVE_EXPORT_MAX_BYTES) return null;

  const out = new Uint8Array(totalLength);
  const outView = new DataView(out.buffer);
  out[0] = 0x67;
  out[1] = 0x6c;
  out[2] = 0x54;
  out[3] = 0x46;
  outView.setUint32(4, 2, true);
  outView.setUint32(8, totalLength, true);
  outView.setUint32(12, nextJsonChunkLength, true);
  outView.setUint32(16, 0x4e4f534a, true);
  out.set(nextJson, 20);
  for (let i = 0; i < jsonPadding; i += 1) {
    out[20 + nextJson.byteLength + i] = 0x20;
  }
  out.set(rest, 20 + nextJsonChunkLength);
  return out;
}
