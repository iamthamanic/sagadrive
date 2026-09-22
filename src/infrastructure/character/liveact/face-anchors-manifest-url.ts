/**
 * face-anchors-manifest-url — resolve sibling face-anchors.json from model URL (#400/#419).
 * Location: src/infrastructure/character/liveact/face-anchors-manifest-url.ts
 *
 * Prefer model-stem sidecar (`m5-face1-face-anchors.json`) so M/W can share one folder.
 * Fall back to generic `face-anchors.json` in the same directory.
 * Preserve model cache-bust query (`?v=…`) so CDN cannot serve a stale sidecar (#419).
 */

/** Strip query/hash and known mesh extensions from a pathname basename. */
function modelStemFromPathname(pathname: string): string | null {
  const slash = pathname.lastIndexOf('/');
  const file = slash >= 0 ? pathname.slice(slash + 1) : pathname;
  if (!file) return null;
  const stem = file.replace(/\.(glb|vrm|gltf)$/i, '');
  return stem || null;
}

/**
 * Candidate URLs for SagaDriveFaceAnchorsV1 next to a GLB/VRM.
 * Order: `{stem}-face-anchors.json`, then `face-anchors.json`.
 * Cache-bust query from the model URL is copied onto every candidate.
 */
export function listFaceAnchorsManifestUrlCandidates(modelUrl: string): string[] {
  const trimmed = modelUrl.trim();
  if (!trimmed) return [];
  try {
    const base =
      typeof globalThis !== 'undefined' && 'location' in globalThis
        ? globalThis.location.href
        : 'http://localhost/';
    const url = new URL(trimmed, base);
    // Keep search for cache-bust consistency; drop hash (fragment is never fetched).
    url.hash = '';
    const cacheBustSearch = url.search;
    const path = url.pathname;
    const slash = path.lastIndexOf('/');
    if (slash < 0) return [];
    const dir = path.slice(0, slash + 1);
    const stem = modelStemFromPathname(path);
    const out: string[] = [];
    if (stem) {
      url.pathname = `${dir}${stem}-face-anchors.json`;
      url.search = cacheBustSearch;
      out.push(url.href);
    }
    url.pathname = `${dir}face-anchors.json`;
    url.search = cacheBustSearch;
    out.push(url.href);
    return out;
  } catch {
    return [];
  }
}

/** Primary candidate (stem sidecar), or null. */
export function resolveFaceAnchorsManifestUrlFromModelUrl(modelUrl: string): string | null {
  const candidates = listFaceAnchorsManifestUrlCandidates(modelUrl);
  return candidates[0] ?? null;
}
