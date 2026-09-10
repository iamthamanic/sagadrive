/**
 * Static SagaDrive item icons (public SVG) — prompt template + path helpers.
 * Separate from Meshy thumbnail2d (`assets.ts`). Domain-pure: no React / network.
 * Location: src/domains/items/icon-assets.ts
 */

/** Basename slug for `public/assets/items/{slug}.svg` and `iconKey`. */
export const ITEM_ICON_SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

export const ITEM_ICON_PUBLIC_DIR = '/assets/items';
export const ITEM_ICON_SOURCE_DIR = 'assets/item-icon-sources';
export const ITEM_ICON_OUTPUT_DIR = 'public/assets/items';
export const ITEM_ICON_MANIFEST_PATH = 'assets/item-icons.manifest.json';

export type ItemIconGenerationStatus =
  | 'needs-png'
  | 'needs-svg'
  | 'ready'
  | 'regenerate';

export interface ItemIconManifestEntry {
  id: string;
  slug: string;
  name: string;
  /** Short object description appended to the shared style template. */
  iconPrompt: string;
  /** Definition `iconKey` — same as slug for static SVG icons. */
  iconKey: string;
  /** Repo-relative PNG source path. */
  sourcePng: string;
  /** Repo-relative SVG output path. */
  outputSvg: string;
  /**
   * `ready` — valid SVG exists; do not auto-regenerate.
   * `regenerate` — explicit re-vectorize / re-generate allowed.
   * `needs-png` / `needs-svg` — incomplete pipeline.
   */
  status: ItemIconGenerationStatus;
}

export interface ItemIconPromptInput {
  name: string;
  /** Object-only description (no style boilerplate). */
  iconPrompt: string;
}

const ITEM_ICON_STYLE_TEMPLATE = `RPG inventory item icon for SagaDrive.

Single isolated object.
Centered composition.
Object fully visible.
No cropping.
No environment.
No character holding the object.
No text.
No letters.
No numbers.
No UI frame.
No inventory slot background.
No decorative border.
Plain or transparent background.

Flat stylized fantasy game asset.
Strong readable silhouette.
Clean shapes.
Limited detail.
Maximum approximately 6 dominant colors.
Clear dark outlines.
Minimal shading.
No photorealism.
No complex lighting.
No depth-of-field.
No particle-heavy background effects.

Designed specifically so the image can be cleanly converted into vector SVG.

Item:
{{ITEM_DESCRIPTION}}

Maintain the exact same SagaDrive inventory icon style as the other generated item icons.`;

/** Shared style template used by Cursor Agent image generation. */
export function getItemIconStyleTemplate(): string {
  return ITEM_ICON_STYLE_TEMPLATE;
}

/**
 * Build the full Cursor image-generation prompt from item fields.
 * Uses `iconPrompt` when present; otherwise falls back to name + description.
 */
export function buildItemIconPrompt(input: ItemIconPromptInput): string {
  const description = sanitizeIconPromptPart(input.iconPrompt, 400)
    || sanitizeIconPromptPart(input.name, 80)
    || 'item';
  return ITEM_ICON_STYLE_TEMPLATE.replace('{{ITEM_DESCRIPTION}}', description);
}

export function isItemIconSlug(value: string): boolean {
  return ITEM_ICON_SLUG_PATTERN.test(value);
}

/** Public URL for a static SVG icon — only plain slugs (`iron-sword`), not legacy path keys. */
export function buildItemIconPublicSrc(iconKey: string): string | null {
  const trimmed = typeof iconKey === 'string' ? iconKey.trim() : '';
  if (!isItemIconSlug(trimmed)) return null;
  return `${ITEM_ICON_PUBLIC_DIR}/${trimmed}.svg`;
}

export function buildItemIconSourcePath(slug: string): string {
  return `${ITEM_ICON_SOURCE_DIR}/${slug}.png`;
}

export function buildItemIconOutputPath(slug: string): string {
  return `${ITEM_ICON_OUTPUT_DIR}/${slug}.svg`;
}

/**
 * Accept plain slugs (`iron-sword`) or legacy path-ish keys (`icons/iron-sword`);
 * returns basename slug or null.
 */
export function normalizeItemIconSlug(iconKey: string | undefined | null): string | null {
  if (!iconKey || typeof iconKey !== 'string') return null;
  const trimmed = iconKey.trim();
  if (!trimmed) return null;
  const base = trimmed.includes('/') ? trimmed.slice(trimmed.lastIndexOf('/') + 1) : trimmed;
  const withoutExt = base.replace(/\.svg$/i, '').replace(/\.png$/i, '');
  return isItemIconSlug(withoutExt) ? withoutExt : null;
}

function sanitizeIconPromptPart(value: string, max: number): string {
  return value
    .replace(/[\r\n\t]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, max);
}
