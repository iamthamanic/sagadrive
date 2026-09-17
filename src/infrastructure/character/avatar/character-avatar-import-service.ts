/**
 * character-avatar-import-service — validate + owner-scoped VRM/GLB upload (#5).
 * Location: src/infrastructure/character/avatar/character-avatar-import-service.ts
 *
 * Authoritative byte validation runs before storage write. Rig capabilities stay pending for #6.
 */

import { supabase } from '../../../lib/supabase';
import {
  AVATAR_IMPORT_MAX_BYTES,
  buildAvatarImportStoragePath,
  earlyCheckAvatarImportFile,
  validateAvatarImportBytes,
  type AvatarImportArtifact,
  type AvatarImportUiStatus,
} from '../../../domains/character/avatar';

const BUCKET = 'character-avatars';
const SIGNED_URL_SECONDS = 60 * 60 * 24 * 365;

async function getAuthenticatedUserId(): Promise<string> {
  const { data, error } = await supabase.auth.getUser();
  if (error || !data.user?.id) {
    throw new Error('Anmeldung erforderlich, um einen 3D-Charakter zu importieren.');
  }
  return data.user.id;
}

async function readFileBytes(file: File): Promise<Uint8Array> {
  const buffer = await file.arrayBuffer();
  return new Uint8Array(buffer);
}

export interface AvatarImportProgress {
  status: AvatarImportUiStatus;
  message: string;
  artifact?: AvatarImportArtifact;
}

/**
 * Import one VRM/GLB file. On failure, does not mark any artifact active.
 * Previous avatar model_url is left to the caller (UI must not clear it on error).
 */
export async function importCharacterAvatarModel(
  file: File,
  options: {
    characterId?: string | null;
    onProgress?: (progress: AvatarImportProgress) => void;
  } = {},
): Promise<AvatarImportArtifact> {
  const report = (status: AvatarImportUiStatus, message: string, artifact?: AvatarImportArtifact) => {
    options.onProgress?.({ status, message, artifact });
  };

  report('validating', 'Datei wird geprüft …');
  const early = earlyCheckAvatarImportFile({ fileName: file.name, byteSize: file.size });
  if (!early.ok) {
    report('error', early.message ?? 'Datei ungültig.');
    throw new Error(early.message ?? 'Datei ungültig.');
  }

  const bytes = await readFileBytes(file);
  let format: AvatarImportArtifact['format'];
  let mime: string;
  try {
    const validated = validateAvatarImportBytes({
      bytes,
      fileName: file.name,
      claimedMime: file.type,
    });
    format = validated.format;
    mime = validated.mime;
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Validierung fehlgeschlagen.';
    report('error', message);
    throw new Error(message);
  }

  report('uploading', 'Modell wird hochgeladen …');
  const ownerUserId = await getAuthenticatedUserId();
  const artifactId = crypto.randomUUID();
  const storagePath = buildAvatarImportStoragePath({ ownerUserId, artifactId, format });

  const blob = new Blob([new Uint8Array(bytes)], { type: mime });
  const { error: uploadError } = await supabase.storage.from(BUCKET).upload(storagePath, blob, {
    contentType: mime,
    upsert: false,
  });
  if (uploadError) {
    report('error', 'Upload fehlgeschlagen. Bitte erneut versuchen.');
    throw new Error(`Avatar-Upload fehlgeschlagen: ${uploadError.message}`);
  }

  report('analyzing', 'Import wird für die Rig-Analyse vorgemerkt …');

  // Deactivate previous active rows for this character (exactly-one active).
  if (options.characterId) {
    await supabase
      .from('character_avatar_import_assets')
      .update({ is_active: false })
      .eq('owner_user_id', ownerUserId)
      .eq('character_id', options.characterId)
      .eq('is_active', true);
  }

  const { error: insertError } = await supabase.from('character_avatar_import_assets').insert({
    id: artifactId,
    owner_user_id: ownerUserId,
    character_id: options.characterId ?? null,
    format,
    mime,
    byte_size: bytes.byteLength,
    storage_path: storagePath,
    rig_analysis_status: 'pending',
    is_active: true,
  });
  if (insertError) {
    await supabase.storage.from(BUCKET).remove([storagePath]);
    report('error', 'Import konnte nicht bestätigt werden.');
    throw new Error(`Avatar-Artefakt konnte nicht gespeichert werden: ${insertError.message}`);
  }

  const { data: signed, error: signedError } = await supabase.storage
    .from(BUCKET)
    .createSignedUrl(storagePath, SIGNED_URL_SECONDS);
  if (signedError || !signed?.signedUrl) {
    report('error', 'Vorschau-URL konnte nicht erzeugt werden.');
    throw new Error(signedError?.message ?? 'Signed URL fehlt');
  }

  const artifact: AvatarImportArtifact = {
    artifactId,
    format,
    byteSize: bytes.byteLength,
    storagePath,
    modelUrl: signed.signedUrl,
    rigAnalysisStatus: 'pending',
  };

  report('success', '3D-Charakter importiert. Rig-Analyse folgt automatisch.', artifact);
  return artifact;
}

export function avatarImportLimits() {
  return {
    maxBytes: AVATAR_IMPORT_MAX_BYTES,
    accept: '.vrm,.glb,model/gltf-binary,application/octet-stream',
  };
}
