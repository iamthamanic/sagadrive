/**
 * face-anchors-manifest-url — resolve sibling face-anchors.json from model URL (#400).
 * Location: src/infrastructure/character/liveact/face-anchors-manifest-url.ts
 */

/** Same directory as the GLB/VRM: `…/face-anchors.json` (SagaDrive authoring convention). */
export function resolveFaceAnchorsManifestUrlFromModelUrl(modelUrl: string): string | null {
  const trimmed = modelUrl.trim();
  if (!trimmed) return null;
  try {
    const base =
      typeof globalThis !== 'undefined' && 'location' in globalThis
        ? globalThis.location.href
        : 'http://localhost/';
    const url = new URL(trimmed, base);
    const path = url.pathname;
    const slash = path.lastIndexOf('/');
    if (slash < 0) return null;
    url.pathname = `${path.slice(0, slash + 1)}face-anchors.json`;
    return url.href;
  } catch {
    return null;
  }
}
