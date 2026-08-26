import type { CharacterAvatarFormat } from '../../types/character.types';
import { normalizeSafeUrl } from '../../avatar';

export interface CharacterStudioTraitAsset {
  id: string;
  name: string;
  modelUrl: string;
}

export interface CharacterStudioTraitGroup {
  id: string;
  name: string;
  required: boolean;
  initial: boolean;
  assets: CharacterStudioTraitAsset[];
}

export interface CharacterStudioManifest {
  format: CharacterAvatarFormat;
  groups: CharacterStudioTraitGroup[];
}

type JsonRecord = Record<string, unknown>;

function isRecord(value: unknown): value is JsonRecord {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function readString(record: JsonRecord, key: string): string | undefined {
  const value = record[key];
  return typeof value === 'string' ? value : undefined;
}

function readStringArray(record: JsonRecord, key: string): string[] {
  const value = record[key];
  if (!Array.isArray(value)) return [];
  return value.filter((item): item is string => typeof item === 'string');
}

function resolveModelUrl(sourceUrl: string, assetsLocation: string | undefined, traitsDirectory: string, directory: string): string | undefined {
  const source = normalizeSafeUrl(sourceUrl);
  if (!source) return undefined;

  try {
    const manifestUrl = source.startsWith('/') ? new URL(source, window.location.origin) : new URL(source);
    const assetBase = assetsLocation ? new URL(assetsLocation, manifestUrl) : manifestUrl;
    const traitBase = new URL(traitsDirectory.replace(/^\//, ''), assetBase.toString().endsWith('/') ? assetBase : new URL('.', assetBase));
    const modelUrl = new URL(directory.replace(/^\//, ''), traitBase).toString();
    return normalizeSafeUrl(modelUrl);
  } catch {
    return undefined;
  }
}

export function normalizeCharacterStudioManifest(input: unknown, sourceUrl: string): CharacterStudioManifest {
  if (!isRecord(input)) throw new Error('CharacterStudio manifest must be a JSON object');

  const formatValue = readString(input, 'format')?.toLowerCase();
  const format: CharacterAvatarFormat = formatValue === 'glb' ? 'glb' : 'vrm';
  const assetsLocation = readString(input, 'assetsLocation');
  const traitsDirectory = readString(input, 'traitsDirectory') ?? '';
  const requiredTraits = new Set(readStringArray(input, 'requiredTraits'));
  const initialTraits = new Set(readStringArray(input, 'initialTraits'));
  const rawTraits = input.traits;
  if (!Array.isArray(rawTraits)) return { format, groups: [] };

  const groups: CharacterStudioTraitGroup[] = [];

  for (const rawTrait of rawTraits) {
    if (!isRecord(rawTrait)) continue;
    const id = readString(rawTrait, 'trait');
    if (!id) continue;
    const name = readString(rawTrait, 'name') ?? id;
    const rawCollection = rawTrait.collection;
    const assets: CharacterStudioTraitAsset[] = [];

    if (Array.isArray(rawCollection)) {
      for (const rawAsset of rawCollection) {
        if (!isRecord(rawAsset)) continue;
        const assetId = readString(rawAsset, 'id');
        const directory = readString(rawAsset, 'directory');
        if (!assetId || !directory) continue;
        const modelUrl = resolveModelUrl(sourceUrl, assetsLocation, traitsDirectory, directory);
        if (!modelUrl) continue;
        assets.push({
          id: assetId,
          name: readString(rawAsset, 'name') ?? assetId,
          modelUrl,
        });
      }
    }

    groups.push({
      id,
      name,
      required: requiredTraits.has(id),
      initial: initialTraits.has(id),
      assets,
    });
  }

  return { format, groups };
}

export async function loadCharacterStudioManifest(url: string, signal?: AbortSignal): Promise<CharacterStudioManifest> {
  const safeUrl = normalizeSafeUrl(url);
  if (!safeUrl) throw new Error('CharacterStudio manifest URL is not allowed');

  const response = await fetch(safeUrl, {
    signal,
    credentials: 'omit',
    referrerPolicy: 'no-referrer',
  });
  if (!response.ok) throw new Error(`CharacterStudio manifest could not be loaded (${response.status})`);

  const payload: unknown = await response.json();
  return normalizeCharacterStudioManifest(payload, safeUrl);
}
