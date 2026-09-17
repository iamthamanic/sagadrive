/**
 * Static SagaDrive NPC/creature icons (public SVG) — path helpers + prompt template.
 * Parallel to items `icon-assets.ts`.
 *
 * HARD WORKFLOW (do not skip):
 *   Cursor GenerateImage (style template + style refs)
 *   → PNG in assets/npc-creature-icon-sources/{slug}.png
 *   → VTracer via scripts/vectorize-npc-creature-icons.mjs
 *   → public/assets/npc-creatures/{slug}.svg
 *
 * NEVER hand-author geometric SVGs for this folder (breaks pack style parity).
 * See .cursor/rules/npc-creature-icons.mdc
 *
 * Location: src/domains/npc-creature/icon-assets.ts
 */

/** Basename slug for `public/assets/npc-creatures/{slug}.svg` and `iconKey`. */
export const NPC_CREATURE_ICON_SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

export const NPC_CREATURE_ICON_PUBLIC_DIR = '/assets/npc-creatures';
export const NPC_CREATURE_ICON_SOURCE_DIR = 'assets/npc-creature-icon-sources';
export const NPC_CREATURE_ICON_OUTPUT_DIR = 'public/assets/npc-creatures';
export const NPC_CREATURE_ICON_MANIFEST_PATH = 'assets/npc-creature-icons.manifest.json';
/** Shared style refs with item icons (same SagaDrive flat look). */
export const NPC_CREATURE_ICON_STYLE_REFS = [
  'assets/item-icon-style-refs/style-ref-sword.png',
  'assets/item-icon-style-refs/style-ref-potion.png',
] as const;

export type NpcCreatureIconGenerationStatus =
  | 'needs-png'
  | 'needs-svg'
  | 'ready'
  | 'regenerate';

export interface NpcCreatureIconManifestEntry {
  id: string;
  slug: string;
  name: string;
  /** Short subject description for Cursor PNG authoring. */
  iconPrompt: string;
  /** Definition `iconKey` — same as slug for static SVG icons. */
  iconKey: string;
  /** Repo-relative PNG source path. */
  sourcePng: string;
  /** Repo-relative SVG output path. */
  outputSvg: string;
  status: NpcCreatureIconGenerationStatus;
}

export interface NpcCreatureIconPromptInput {
  name: string;
  /** Subject-only description (no style boilerplate). */
  iconPrompt: string;
}

const NPC_CREATURE_ICON_STYLE_TEMPLATE = `RPG character or creature portrait icon for SagaDrive.

Single isolated subject (one NPC or one creature).
Centered composition — bust for humanoids, head/bust for animals.
Subject fully visible.
No cropping.
No environment.
No landscape.
No group of characters.
No text.
No letters.
No numbers.
No UI frame.
No decorative border.
Solid pure BLACK background (required — same as pack icons; never light/white/gray).

Flat stylized fantasy game asset.
Strong readable silhouette.
Clean shapes.
Limited detail.
Maximum approximately 6 dominant colors.
Subject fills use mid-tones (avoid near-white fills that break vectorization).
Clear dark outlines.
Minimal shading.
No photorealism.
No complex lighting.
No depth-of-field.
No particle-heavy background effects.

Designed specifically so the image can be cleanly converted into vector SVG.

Subject:
{{SUBJECT_DESCRIPTION}}

Maintain the exact same SagaDrive inventory icon style as the item icons (style references) and existing npc-creature pack PNGs (black background portraits).`;

/** Shared style template used by Cursor Agent image generation. */
export function getNpcCreatureIconStyleTemplate(): string {
  return NPC_CREATURE_ICON_STYLE_TEMPLATE;
}

/** Build the full Cursor image-generation prompt from NPC/creature fields. */
export function buildNpcCreatureIconPrompt(input: NpcCreatureIconPromptInput): string {
  const description = sanitizeIconPromptPart(input.iconPrompt, 400)
    || sanitizeIconPromptPart(input.name, 80)
    || 'creature';
  return NPC_CREATURE_ICON_STYLE_TEMPLATE.replace('{{SUBJECT_DESCRIPTION}}', description);
}

export function isNpcCreatureIconSlug(value: string): boolean {
  return NPC_CREATURE_ICON_SLUG_PATTERN.test(value);
}

/** Public URL for a static SVG icon — only plain kebab slugs. */
export function buildNpcCreatureIconPublicSrc(iconKey: string): string | null {
  const trimmed = typeof iconKey === 'string' ? iconKey.trim() : '';
  if (!isNpcCreatureIconSlug(trimmed)) return null;
  return `${NPC_CREATURE_ICON_PUBLIC_DIR}/${trimmed}.svg`;
}

export function buildNpcCreatureIconSourcePath(slug: string): string {
  return `${NPC_CREATURE_ICON_SOURCE_DIR}/${slug}.png`;
}

export function buildNpcCreatureIconOutputPath(slug: string): string {
  return `${NPC_CREATURE_ICON_OUTPUT_DIR}/${slug}.svg`;
}

/**
 * Accept plain slugs or legacy path-ish keys; returns basename slug or null.
 */
export function normalizeNpcCreatureIconSlug(
  iconKey: string | undefined | null,
): string | null {
  if (!iconKey || typeof iconKey !== 'string') return null;
  const trimmed = iconKey.trim();
  if (!trimmed) return null;
  const base = trimmed.includes('/') ? trimmed.slice(trimmed.lastIndexOf('/') + 1) : trimmed;
  const withoutExt = base.replace(/\.svg$/i, '').replace(/\.png$/i, '');
  return isNpcCreatureIconSlug(withoutExt) ? withoutExt : null;
}

function sanitizeIconPromptPart(value: string, max: number): string {
  return value
    .replace(/[\r\n\t]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, max);
}
