/**
 * Avatar import contracts — pure validation + artifact types (no React / network).
 * Location: src/domains/character/avatar/avatar-import.ts
 *
 * Client may run early UX checks; Infrastructure must re-validate before storage write.
 * Capabilities are never accepted from the client — only `pending` / server-set statuses.
 */

export const AVATAR_IMPORT_MAX_BYTES = 150 * 1024 * 1024;

export const AVATAR_IMPORT_ALLOWED_EXTENSIONS = ['vrm', 'glb'] as const;
export type AvatarImportExtension = (typeof AVATAR_IMPORT_ALLOWED_EXTENSIONS)[number];

export type AvatarImportFormat = 'vrm' | 'glb';

/**
 * Rig/morph capabilities — server/analysis (#6) only.
 * Clients must never invent or escalate these values.
 */
export type AvatarRigAnalysisStatus =
  | 'pending'
  | 'static'
  | 'partial'
  | 'ready'
  | 'unsupported'
  | 'failed';

export interface AvatarImportArtifact {
  artifactId: string;
  format: AvatarImportFormat;
  byteSize: number;
  storagePath: string;
  /** Signed or app-relative URL for AvatarCanvas — not a free remote mesh URL from the user. */
  modelUrl: string;
  /** Always starts as pending after import; #6 owns upgrades. */
  rigAnalysisStatus: AvatarRigAnalysisStatus;
}

export type AvatarImportUiStatus =
  | 'idle'
  | 'validating'
  | 'uploading'
  | 'analyzing'
  | 'success'
  | 'error'
  | 'unsupported-capabilities';

export interface AvatarImportEarlyCheck {
  ok: boolean;
  format?: AvatarImportFormat;
  message?: string;
}

/** GLB / VRM container magic: ASCII "glTF" at offset 0. */
export function sniffGlbContainer(bytes: Uint8Array): boolean {
  return (
    bytes.length >= 12 &&
    bytes[0] === 0x67 &&
    bytes[1] === 0x6c &&
    bytes[2] === 0x54 &&
    bytes[3] === 0x46
  );
}

export function extensionFromFileName(fileName: string): AvatarImportExtension | undefined {
  const match = /\.([a-z0-9]+)$/i.exec(fileName.trim());
  if (!match) return undefined;
  const ext = match[1].toLowerCase();
  if (ext === 'vrm' || ext === 'glb') return ext;
  return undefined;
}

export function formatFromExtension(ext: AvatarImportExtension): AvatarImportFormat {
  return ext;
}

/**
 * Early UX check (filename + size). Does not replace byte validation.
 */
export function earlyCheckAvatarImportFile(input: {
  fileName: string;
  byteSize: number;
}): AvatarImportEarlyCheck {
  const ext = extensionFromFileName(input.fileName);
  if (!ext) {
    return {
      ok: false,
      message: 'Nur .vrm- oder .glb-Dateien sind erlaubt.',
    };
  }
  if (input.byteSize <= 0) {
    return { ok: false, message: 'Die Datei ist leer.' };
  }
  if (input.byteSize > AVATAR_IMPORT_MAX_BYTES) {
    return {
      ok: false,
      message: 'Die Datei ist zu groß (max. 150 MB).',
    };
  }
  return { ok: true, format: formatFromExtension(ext) };
}

/**
 * Authoritative byte validation — call before any storage write.
 * Rejects non-glTF containers and oversize payloads.
 */
export function validateAvatarImportBytes(input: {
  bytes: Uint8Array;
  fileName: string;
  claimedMime?: string;
}): { format: AvatarImportFormat; mime: string } {
  const early = earlyCheckAvatarImportFile({
    fileName: input.fileName,
    byteSize: input.bytes.byteLength,
  });
  if (!early.ok || !early.format) {
    throw new Error(early.message ?? 'Ungültige Avatar-Datei.');
  }
  if (!sniffGlbContainer(input.bytes)) {
    throw new Error('Die Datei ist kein gültiges VRM/GLB (glTF-Binary).');
  }
  const claimed = input.claimedMime?.toLowerCase().trim();
  if (
    claimed &&
    claimed !== 'model/gltf-binary' &&
    claimed !== 'application/octet-stream' &&
    claimed !== 'model/vrm'
  ) {
    throw new Error('Der Dateityp stimmt nicht mit dem Inhalt überein.');
  }
  // Reject obvious embedded remote URI hooks in the first JSON chunk (best-effort).
  if (containsUnsafeExternalUriHint(input.bytes)) {
    throw new Error('Die Datei enthält unsichere externe Ressourcen-Verweise.');
  }
  return {
    format: early.format,
    mime: early.format === 'vrm' ? 'model/gltf-binary' : 'model/gltf-binary',
  };
}

/**
 * Scan a limited prefix for http(s) URIs inside the GLB (fail-closed for imports).
 * Local/data mesh buffers use binary chunks — string "https://" in JSON is suspicious.
 */
export function containsUnsafeExternalUriHint(bytes: Uint8Array): boolean {
  const sampleLen = Math.min(bytes.byteLength, 256 * 1024);
  let ascii = '';
  for (let i = 0; i < sampleLen; i += 1) {
    const c = bytes[i];
    ascii += c >= 32 && c < 127 ? String.fromCharCode(c) : ' ';
  }
  const lower = ascii.toLowerCase();
  if (lower.includes('https://') || lower.includes('http://')) return true;
  if (lower.includes('file://')) return true;
  return false;
}

/**
 * Build owner-scoped storage path. Caller must pass authenticated user id only.
 */
export function buildAvatarImportStoragePath(input: {
  ownerUserId: string;
  artifactId: string;
  format: AvatarImportFormat;
}): string {
  const owner = input.ownerUserId.trim();
  const artifactId = input.artifactId.trim();
  if (!owner || !artifactId) throw new Error('Owner oder Artefakt fehlt.');
  if (owner.includes('/') || artifactId.includes('/')) {
    throw new Error('Ungültiger Storage-Pfad.');
  }
  return `${owner}/${artifactId}.${input.format}`;
}

/** Strip any client-supplied capability fields from an unknown payload. */
export function sanitizeImportResultFromServer(payload: unknown): AvatarImportArtifact | null {
  if (typeof payload !== 'object' || payload === null) return null;
  const record = payload as Record<string, unknown>;
  if (typeof record.artifactId !== 'string') return null;
  if (record.format !== 'vrm' && record.format !== 'glb') return null;
  if (typeof record.byteSize !== 'number' || record.byteSize <= 0) return null;
  if (typeof record.storagePath !== 'string') return null;
  if (typeof record.modelUrl !== 'string') return null;
  // Ignore any client-like capability keys if present.
  const status =
    record.rigAnalysisStatus === 'pending' ||
    record.rigAnalysisStatus === 'static' ||
    record.rigAnalysisStatus === 'partial' ||
    record.rigAnalysisStatus === 'ready' ||
    record.rigAnalysisStatus === 'unsupported' ||
    record.rigAnalysisStatus === 'failed'
      ? record.rigAnalysisStatus
      : 'pending';
  return {
    artifactId: record.artifactId,
    format: record.format,
    byteSize: record.byteSize,
    storagePath: record.storagePath,
    modelUrl: record.modelUrl,
    rigAnalysisStatus: status === 'ready' ? 'pending' : status,
    // Note: force pending when server mistakenly echoed client "ready" — #6 owns ready.
  };
}
