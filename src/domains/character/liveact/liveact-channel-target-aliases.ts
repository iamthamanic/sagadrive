/**
 * LiveAct channel → model target aliases (VRM expressions / GLB morph names).
 * Location: src/domains/character/liveact/liveact-channel-target-aliases.ts
 *
 * Explicit table only — no fuzzy matching beyond listed aliases.
 */

import {
  LIVEACT_FACE_CHANNELS,
  type LiveActFaceChannelId,
} from './liveact-face-contract';
import {
  createEmptyLiveActAvatarFaceSupport,
  type LiveActAvatarFaceChannelSupport,
} from './liveact-capabilities';

/** PascalCase variant for exporters that title-case ARKit names. */
function pascalCase(id: string): string {
  if (!id.length) return id;
  if (id.startsWith('_')) return id;
  return id.charAt(0).toUpperCase() + id.slice(1);
}

function aliasesForChannel(id: LiveActFaceChannelId): readonly string[] {
  const list: string[] = [id];
  const pascal = pascalCase(id);
  if (pascal !== id) list.push(pascal);
  return list;
}

export const LIVEACT_CHANNEL_TARGET_ALIASES: Readonly<
  Record<LiveActFaceChannelId, readonly string[]>
> = Object.fromEntries(
  LIVEACT_FACE_CHANNELS.map((id) => [id, aliasesForChannel(id)]),
) as Record<LiveActFaceChannelId, readonly string[]>;

export interface LiveActChannelTargetResolution {
  faceSupport: LiveActAvatarFaceChannelSupport;
  resolvedNames: Readonly<Partial<Record<LiveActFaceChannelId, string>>>;
}

/**
 * Resolve which LiveAct face channels exist on the model (expressions or morph targets).
 */
export function resolveLiveActChannelTargets(
  presentTargetNames: readonly string[],
): LiveActChannelTargetResolution {
  const present = new Set(presentTargetNames);
  const faceSupport = createEmptyLiveActAvatarFaceSupport() as Record<
    LiveActFaceChannelId,
    boolean
  >;
  const resolvedNames: Partial<Record<LiveActFaceChannelId, string>> = {};

  for (const id of LIVEACT_FACE_CHANNELS) {
    const aliases = LIVEACT_CHANNEL_TARGET_ALIASES[id];
    const match = aliases.find((alias) => present.has(alias));
    if (match) {
      faceSupport[id] = true;
      resolvedNames[id] = match;
    }
  }

  return { faceSupport, resolvedNames };
}
