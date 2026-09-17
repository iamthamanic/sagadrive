/**
 * Avatar trait group ids and base/overlay layer resolution.
 * Location: src/domains/character/avatar/trait-layers.ts
 *
 * Pure domain: one source of truth for which trait is visible after overlays.
 * Overlay never becomes a persisted base trait.
 */

export const AVATAR_TRAIT_GROUP_IDS = [
  'head',
  'ears',
  'hair',
  'clothing',
  'accessory',
] as const;

export type AvatarTraitGroupId = (typeof AVATAR_TRAIT_GROUP_IDS)[number];

export function isAvatarTraitGroupId(value: string): value is AvatarTraitGroupId {
  return (AVATAR_TRAIT_GROUP_IDS as readonly string[]).includes(value);
}

/** Persisted base look — only these keys may enter `appearance.avatar.traits`. */
export type BaseTraitSelection = Partial<Record<AvatarTraitGroupId, string>>;

/**
 * Temporary gameplay/equipment overlay. Never serialized into appearance.avatar.traits.
 * `hides` lists base channels that must be suppressed while this overlay is attached.
 */
export interface RuntimeTraitOverlay {
  groupId: AvatarTraitGroupId;
  traitId: string;
  /** Channels hidden while this overlay is active (e.g. helmet → hair). */
  hides?: readonly AvatarTraitGroupId[];
  /**
   * Higher wins when multiple overlays claim the same group.
   * Default 0; inventory/equipment layers use higher values later (#158).
   */
  priority?: number;
}

export interface EffectiveTraitSelection {
  /** Visible trait id per group after overlay + hide resolution. */
  traits: BaseTraitSelection;
  /** Groups suppressed by an active overlay hide rule. */
  hiddenGroups: readonly AvatarTraitGroupId[];
  /** Overlay trait ids that won their channel (not persisted). */
  activeOverlays: Readonly<Partial<Record<AvatarTraitGroupId, string>>>;
}

/**
 * Resolve visible traits: overlay replaces its own group; hide removes base channels.
 * Cardinality: one effective trait id per group (or absent when hidden / unset).
 */
export function resolveEffectiveTraits(
  base: BaseTraitSelection,
  overlays: readonly RuntimeTraitOverlay[],
): EffectiveTraitSelection {
  const byGroup = new Map<AvatarTraitGroupId, RuntimeTraitOverlay>();
  for (const overlay of overlays) {
    if (!isAvatarTraitGroupId(overlay.groupId)) continue;
    const trimmed = overlay.traitId.trim();
    if (!trimmed) continue;
    const existing = byGroup.get(overlay.groupId);
    const nextPriority = overlay.priority ?? 0;
    if (!existing || nextPriority >= (existing.priority ?? 0)) {
      byGroup.set(overlay.groupId, { ...overlay, traitId: trimmed });
    }
  }

  const hidden = new Set<AvatarTraitGroupId>();
  for (const overlay of byGroup.values()) {
    for (const channel of overlay.hides ?? []) {
      if (isAvatarTraitGroupId(channel)) hidden.add(channel);
    }
  }

  const traits: BaseTraitSelection = {};
  const activeOverlays: Partial<Record<AvatarTraitGroupId, string>> = {};

  for (const groupId of AVATAR_TRAIT_GROUP_IDS) {
    const overlay = byGroup.get(groupId);
    if (overlay) {
      traits[groupId] = overlay.traitId;
      activeOverlays[groupId] = overlay.traitId;
      continue;
    }
    if (hidden.has(groupId)) continue;
    const baseId = base[groupId]?.trim();
    if (baseId) traits[groupId] = baseId;
  }

  return {
    traits,
    hiddenGroups: [...hidden],
    activeOverlays,
  };
}

/** Strip overlays / unknown keys — only allowlisted groups with non-empty ids. */
export function serializePersistedBaseTraits(
  traits: BaseTraitSelection,
): BaseTraitSelection {
  const out: BaseTraitSelection = {};
  for (const groupId of AVATAR_TRAIT_GROUP_IDS) {
    const id = traits[groupId]?.trim();
    if (id) out[groupId] = id;
  }
  return out;
}
