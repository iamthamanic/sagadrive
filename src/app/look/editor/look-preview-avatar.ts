/**
 * look-preview-avatar — Minimal CharacterAvatarDto for Look Preview harness (#345).
 * Location: src/app/look/editor/look-preview-avatar.ts
 */
import type { CharacterAvatarDto } from '../../../domains/character/domain/character.entity';

export function lookPreviewAvatarFromModelUrl(modelUrl: string): CharacterAvatarDto {
  const lower = modelUrl.replace(/[?#].*$/, '').toLowerCase();
  const format = lower.endsWith('.vrm') ? 'vrm' : 'glb';
  return {
    schema_version: 1,
    provider: 'm3-character-studio',
    source: 'sagadrive',
    preset: 'look-preview',
    model_format: format,
    model_url: modelUrl,
    traits: {},
    colors: { hair: '#3a2a1a', skin: '#e0b090' },
    body: { height: 1, size: 1 },
    anatomy: 'humanoid',
  };
}
