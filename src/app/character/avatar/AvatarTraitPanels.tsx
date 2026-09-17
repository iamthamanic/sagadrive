/**
 * AvatarTraitPanels — CharacterEditor sections for modular base traits.
 * Location: src/app/character/avatar/AvatarTraitPanels.tsx
 *
 * Live base-trait selection only. Runtime overlays (inventory helmets, etc.) stay out of persistence.
 */

import {
  AVATAR_TRAIT_SECTIONS,
  type AvatarTraitGroupId,
  type BaseTraitSelection,
} from '../../../domains/character/avatar';
import { TraitCardPicker, useTraitApplyController } from './TraitCardPicker';

interface AvatarTraitPanelsProps {
  selection: BaseTraitSelection;
  onBaseTraitChange: (groupId: AvatarTraitGroupId, traitId: string) => void;
}

export function AvatarTraitPanels({
  selection,
  onBaseTraitChange,
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
            {section.groups.map((groupId) => (
              <TraitCardPicker
                key={groupId}
                groupId={groupId}
                value={selection[groupId] ?? ''}
                loadState={controller.getState(groupId)}
                onChange={(traitId) => controller.requestApply(groupId, traitId)}
                onRetry={(traitId) => controller.requestApply(groupId, traitId)}
              />
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}
