/**
 * AvatarTraitPanels — CharacterEditor sections for modular base traits.
 * Location: src/app/character/avatar/AvatarTraitPanels.tsx
 *
 * Live base-trait selection only. Runtime overlays (inventory helmets, etc.) stay out of persistence.
 * Optional morph drives #216 fit-range warnings (no silent incompatible render).
 */

import {
  AVATAR_TRAIT_SECTIONS,
  createDefaultTraitFitRange,
  resolveAvatarFitCompatibility,
  type AvatarTraitGroupId,
  type BaseBodyTraitSocket,
  type BaseTraitSelection,
  type SagaDriveAvatarMorphStateV1,
} from '../../../domains/character/avatar';
import { TraitCardPicker, useTraitApplyController } from './TraitCardPicker';
import { AvatarFitRangeNotice } from './AvatarFitRangeNotice';

interface AvatarTraitPanelsProps {
  selection: BaseTraitSelection;
  onBaseTraitChange: (groupId: AvatarTraitGroupId, traitId: string) => void;
  morph?: SagaDriveAvatarMorphStateV1;
}

function socketForGroup(groupId: AvatarTraitGroupId): BaseBodyTraitSocket {
  switch (groupId) {
    case 'ears':
      return 'ears';
    case 'hair':
      return 'hair';
    case 'clothing':
      return 'clothing';
    case 'accessory':
      return 'cybernetics';
    case 'head':
      return 'horns';
    default: {
      const _exhaustive: never = groupId;
      return _exhaustive;
    }
  }
}

export function AvatarTraitPanels({
  selection,
  onBaseTraitChange,
  morph,
}: AvatarTraitPanelsProps) {
  const controller = useTraitApplyController((groupId, traitId) => {
    onBaseTraitChange(groupId, traitId);
  });

  return (
    <div className="space-y-8">
      {AVATAR_TRAIT_SECTIONS.map((section) => (
        <section key={section.id} aria-labelledby={`avatar-trait-section-${section.id}`} className="space-y-4">
          <div>
            <h3 id={`avatar-trait-section-${section.id}`} className="text-base font-semibold">
              {section.title}
            </h3>
            <p className="mt-1 text-sm text-muted-foreground">{section.description}</p>
          </div>
          <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
            {section.groups.map((groupId) => {
              const traitId = selection[groupId] ?? 'none';
              const fit = createDefaultTraitFitRange({
                assetId: `trait:${groupId}:${traitId}`,
                socket: socketForGroup(groupId),
              });
              const compatibility = morph
                ? resolveAvatarFitCompatibility({ morph, fit })
                : {
                    status: 'ready' as const,
                    messageDe: null,
                    violatedBounds: [],
                    versionMismatch: false,
                  };

              return (
                <div key={groupId} className="space-y-2">
                  <TraitCardPicker
                    groupId={groupId}
                    value={traitId}
                    loadState={controller.getState(groupId)}
                    onChange={(nextId) => {
                      if (compatibility.status === 'incompatible') return;
                      controller.requestApply(groupId, nextId);
                    }}
                    onRetry={(retryId) => controller.requestApply(groupId, retryId)}
                  />
                  <AvatarFitRangeNotice result={compatibility} />
                </div>
              );
            })}
          </div>
        </section>
      ))}
    </div>
  );
}
