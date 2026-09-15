/**
 * Shared SVG validation + sanitization for SagaDrive item icons (VTracer output).
 * Location: scripts/lib/item-icon-svg.mjs
 */

const FORBIDDEN_TAG = /<\s*(script|foreignObject)\b/i;
const EVENT_ATTR = /\son[a-z]+\s*=/i;
const DATA_URI_IMAGE = /data:image\//i;
const BASE64_BLOB = /base64\s*,/i;
/** Allow only W3C SVG/XML namespace URLs; reject everything else http(s) or //. */
const ALLOWED_XMLNS = /^https?:\/\/www\.w3\.org\//i;
const PATH_TAG = /<path\b[^>]*\/>|<path\b[^>]*>[\s\S]*?<\/path>/gi;
/** VTracer --optimize 2 often wraps paths in `<g fill="…">`. */
const GROUP_TAG = /<g\b([^>]*)>([\s\S]*?)<\/g>/gi;

/**
 * @param {string} svg
 * @returns {{ ok: true, svg: string } | { ok: false, errors: string[] }}
 */
export function validateAndSanitizeItemIconSvg(svg) {
  const errors = [];
  const trimmed = typeof svg === 'string' ? svg.trim() : '';

  if (!trimmed) {
    return { ok: false, errors: ['SVG is empty'] };
  }
  if (!/<svg\b/i.test(trimmed)) {
    errors.push('missing <svg root element');
  }
  if (FORBIDDEN_TAG.test(trimmed)) {
    errors.push('forbidden tag (script or foreignObject)');
  }
  if (EVENT_ATTR.test(trimmed)) {
    errors.push('event-handler attribute (onclick/onload/…)');
  }
  if (DATA_URI_IMAGE.test(trimmed) || BASE64_BLOB.test(trimmed)) {
    errors.push('embedded raster / base64 image data');
  }

  const urlHits = trimmed.match(/https?:\/\/[^\s"'<>]+|\/\/[^\s"'<>]+/gi) || [];
  for (const hit of urlHits) {
    if (ALLOWED_XMLNS.test(hit)) continue;
    errors.push(`external URL (${hit.slice(0, 64)})`);
    break;
  }

  // Non-fragment href / xlink:href (images, scripts, remote refs).
  const hrefMatches = trimmed.matchAll(/\b(?:xlink:)?href\s*=\s*["']([^"']+)["']/gi);
  for (const match of hrefMatches) {
    const value = match[1] || '';
    if (value.startsWith('#')) continue;
    if (ALLOWED_XMLNS.test(value)) continue;
    errors.push(`non-fragment href (${value.slice(0, 64)})`);
    break;
  }

  if (errors.length > 0) {
    return { ok: false, errors };
  }

  // Deterministic light cleanup: strip XML decls / DOCTYPE / generator comment.
  let cleaned = trimmed
    .replace(/<\?xml[\s\S]*?\?>/gi, '')
    .replace(/<!DOCTYPE[\s\S]*?>/gi, '')
    .replace(/<!--\s*Generator:[\s\S]*?-->/gi, '')
    .trim();

  cleaned = stripLightBackdropGroups(cleaned);
  cleaned = stripLightBackdropPaths(cleaned);

  if (!/<path\b/i.test(cleaned) && !/<circle\b/i.test(cleaned) && !/<rect\b/i.test(cleaned) && !/<polygon\b/i.test(cleaned)) {
    return { ok: false, errors: ['SVG has no drawable shapes after sanitization'] };
  }

  if (!/xmlns=/.test(cleaned)) {
    cleaned = cleaned.replace(
      /<svg\b/i,
      '<svg xmlns="http://www.w3.org/2000/svg"',
    );
  }

  return { ok: true, svg: `${cleaned}\n` };
}

/**
 * Drop near-white / light-gray VTracer backdrop groups/paths for a plain/transparent field.
 * Keeps mid-tone object fills (blade highlights, glass). Threshold is luminance-based.
 * @param {string} svg
 */
function stripLightBackdropGroups(svg) {
  return svg.replace(GROUP_TAG, (full, attrs) => {
    const fillMatch = String(attrs).match(/\bfill\s*=\s*["']([^"']+)["']/i);
    if (!fillMatch) return full;
    const luminance = fillLuminance(fillMatch[1]);
    if (luminance === null || luminance < 0.85) return full;
    return '';
  });
}

/**
 * @param {string} svg
 */
function stripLightBackdropPaths(svg) {
  return svg.replace(PATH_TAG, (tag) => {
    const fillMatch = tag.match(/\bfill\s*=\s*["']([^"']+)["']/i);
    if (!fillMatch) return tag;
    const luminance = fillLuminance(fillMatch[1]);
    if (luminance === null || luminance < 0.85) return tag;
    // Only strip large backdrop-like paths (short highlight paths stay).
    const dMatch = tag.match(/\bd\s*=\s*["']([^"']*)["']/i);
    const d = dMatch?.[1] ?? '';
    if (d.length < 80) return tag;
    if (!/^M0[,\s]/i.test(d) && !/M0,0/i.test(d) && !/M0,\d+/i.test(d)) return tag;
    return '';
  }).replace(/\n{3,}/g, '\n\n');
}

/** @param {string} fill @returns {number | null} 0..1 */
function fillLuminance(fill) {
  const hex = fill.trim();
  const m = hex.match(/^#([0-9a-f]{3}|[0-9a-f]{6})$/i);
  if (!m) return null;
  let h = m[1];
  if (h.length === 3) h = h.split('').map((c) => c + c).join('');
  const r = parseInt(h.slice(0, 2), 16) / 255;
  const g = parseInt(h.slice(2, 4), 16) / 255;
  const b = parseInt(h.slice(4, 6), 16) / 255;
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}
