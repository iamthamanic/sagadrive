/**
 * look-material-roles — Safe material role classification for LookRuntime (#342).
 * Location: src/infrastructure/look/look-material-roles.ts
 *
 * Unknown / generic names must NOT default to `cloth` (acceptance).
 */
import type { LookMaterialRole } from './look-runtime-types';

const ROLE_HINTS: ReadonlyArray<{ readonly role: LookMaterialRole; readonly hints: readonly string[] }> = [
  { role: 'eyes', hints: ['eye', 'iris', 'sclera', 'pupil'] },
  { role: 'cybernetic', hints: ['cyber', 'prosthetic', 'augment', 'mech'] },
  { role: 'metal', hints: ['metal', 'armor', 'steel', 'iron', 'chrome'] },
  { role: 'leather', hints: ['leather', 'belt', 'boot', 'strap'] },
  { role: 'hair', hints: ['hair', 'bangs', 'fringe', 'pony'] },
  { role: 'skin', hints: ['skin', 'face', 'body', 'flesh', 'head'] },
  {
    role: 'cloth',
    hints: ['cloth', 'clothes', 'outfit', 'top', 'shirt', 'robe', 'jacket', 'hoodie', 'pants', 'dress'],
  },
];

/**
 * Classify a mesh/material name into a Look material role.
 * No hint match → `unclassified` (safe fallback; never blanket cloth).
 */
export function classifyLookMaterialRole(materialOrMeshName: string): LookMaterialRole {
  const normalized = materialOrMeshName.trim().toLowerCase();
  if (!normalized) return 'unclassified';
  for (const entry of ROLE_HINTS) {
    if (entry.hints.some((hint) => normalized.includes(hint))) {
      return entry.role;
    }
  }
  return 'unclassified';
}

export function isTintableLookMaterialRole(role: LookMaterialRole): boolean {
  return role !== 'unclassified';
}
