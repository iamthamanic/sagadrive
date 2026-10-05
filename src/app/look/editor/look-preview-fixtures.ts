/**
 * look-preview-fixtures — Representative Look Preview Stage slots (#345).
 * Location: src/app/look/editor/look-preview-fixtures.ts
 *
 * Preview harness catalog — not a second game world. Missing meshes degrade.
 */
import { resolveSpeciesTemplateModelUrl } from '../../../domains/character/avatar/species-template-models-v1';

export type LookPreviewFixtureId =
  | 'playerHumanoid'
  | 'secondaryHumanoid'
  | 'item'
  | 'prop'
  | 'ground'
  | 'vegetation'
  | 'sky'
  | 'water'
  | 'vfx';

export type LookPreviewFixtureSlot = {
  readonly id: LookPreviewFixtureId;
  readonly labelDe: string;
  readonly kind: 'humanoid' | 'item' | 'prop' | 'reserved';
  readonly modelUrl: string | null;
  readonly supported: boolean;
  readonly noticeDe: string | null;
};

const SECONDARY_HUMANOID_URL = '/assets/avatars/reference/valid-white-m1-default.vrm';

function playerHumanoidUrl(): string | null {
  return (
    resolveSpeciesTemplateModelUrl({
      speciesId: 'human',
      genderReading: 'masculine-read',
    }) ?? null
  );
}

export function listLookPreviewFixtures(): readonly LookPreviewFixtureSlot[] {
  const playerUrl = playerHumanoidUrl();
  return [
    {
      id: 'playerHumanoid',
      labelDe: 'Spieler-Humanoid',
      kind: 'humanoid',
      modelUrl: playerUrl,
      supported: Boolean(playerUrl),
      noticeDe: playerUrl ? null : 'Humanoid-Fixture fehlt — Stage bleibt nutzbar.',
    },
    {
      id: 'secondaryHumanoid',
      labelDe: 'Zweiter Humanoid / NPC',
      kind: 'humanoid',
      modelUrl: SECONDARY_HUMANOID_URL,
      supported: true,
      noticeDe: null,
    },
    {
      id: 'item',
      labelDe: 'Item',
      kind: 'item',
      modelUrl: null,
      supported: false,
      noticeDe: 'Item-Fixture noch nicht verfügbar.',
    },
    {
      id: 'prop',
      labelDe: 'Prop / Gebäudeausschnitt',
      kind: 'prop',
      modelUrl: null,
      supported: false,
      noticeDe: 'Prop-Fixture noch nicht verfügbar.',
    },
    {
      id: 'ground',
      labelDe: 'Boden (Testfläche)',
      kind: 'reserved',
      modelUrl: null,
      supported: false,
      noticeDe: 'Noch nicht verfügbar',
    },
    {
      id: 'vegetation',
      labelDe: 'Vegetation (Testfläche)',
      kind: 'reserved',
      modelUrl: null,
      supported: false,
      noticeDe: 'Noch nicht verfügbar',
    },
    {
      id: 'sky',
      labelDe: 'Himmel (Testfläche)',
      kind: 'reserved',
      modelUrl: null,
      supported: false,
      noticeDe: 'Noch nicht verfügbar',
    },
    {
      id: 'water',
      labelDe: 'Wasser (Testfläche)',
      kind: 'reserved',
      modelUrl: null,
      supported: false,
      noticeDe: 'Noch nicht verfügbar',
    },
    {
      id: 'vfx',
      labelDe: 'VFX (Testfläche)',
      kind: 'reserved',
      modelUrl: null,
      supported: false,
      noticeDe: 'Noch nicht verfügbar',
    },
  ];
}

export function getLookPreviewFixture(
  id: LookPreviewFixtureId,
): LookPreviewFixtureSlot | undefined {
  return listLookPreviewFixtures().find((slot) => slot.id === id);
}
