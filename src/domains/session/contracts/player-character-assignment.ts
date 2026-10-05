/**
 * player-character-assignment — Join character pick / resolve (#478).
 * Location: src/domains/session/contracts/player-character-assignment.ts
 *
 * Client may only propose owned characters; server validates character_id.
 */

export type AssignableCharacterOption = {
  readonly id: string;
  readonly publicId: string | null;
  readonly name: string;
};

export type CharacterAssignmentPick =
  | { readonly kind: 'none'; readonly reason: string }
  | { readonly kind: 'single'; readonly character: AssignableCharacterOption }
  | { readonly kind: 'choose'; readonly characters: readonly AssignableCharacterOption[] }
  | { readonly kind: 'bound'; readonly characterId: string };

/**
 * Derive picker state from owned characters + optional existing membership binding.
 */
export function resolveCharacterAssignmentPick(input: {
  owned: readonly AssignableCharacterOption[];
  boundCharacterId?: string | null;
}): CharacterAssignmentPick {
  if (input.boundCharacterId) {
    return { kind: 'bound', characterId: input.boundCharacterId };
  }
  const eligible = input.owned.filter((c) => Boolean(c.id) && Boolean(c.publicId));
  if (eligible.length === 0) {
    return {
      kind: 'none',
      reason: 'Kein eigener Charakter mit Public ID verfügbar',
    };
  }
  if (eligible.length === 1) {
    return { kind: 'single', character: eligible[0]! };
  }
  return { kind: 'choose', characters: eligible };
}

export function assertOwnedCharacterId(
  ownedIds: readonly string[],
  characterId: string,
): void {
  if (!ownedIds.includes(characterId)) {
    throw new Error('Charakter gehört nicht zum angemeldeten User');
  }
}

/**
 * URL characterPublicId is routing context only; membership character_id is authority.
 */
export function assertUrlCharacterMatchesMembership(input: {
  urlCharacterPublicId: string | null | undefined;
  membershipCharacterPublicId: string | null | undefined;
}): void {
  const url = (input.urlCharacterPublicId ?? '').trim().toUpperCase();
  const bound = (input.membershipCharacterPublicId ?? '').trim().toUpperCase();
  if (!url) {
    throw new Error('Character Public ID in Route fehlt');
  }
  if (!bound) {
    throw new Error('Keine Membership-Charakterbindung für diese Session');
  }
  if (url !== bound) {
    throw new Error('URL-Charakter stimmt nicht mit Session-Membership überein');
  }
}

export function resolveMembershipCharacterPublicId(input: {
  membershipCharacterId: string | null | undefined;
  characters: readonly AssignableCharacterOption[];
}): string | null {
  const id = input.membershipCharacterId;
  if (!id) return null;
  const match = input.characters.find((c) => c.id === id);
  const publicId = match?.publicId?.trim().toUpperCase() ?? null;
  return publicId || null;
}
