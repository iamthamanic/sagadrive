/**
 * NpcCreatureStatblockView — read-only compact Statblock dialog for Library (#197).
 * Body lives in NpcCreatureStatblockPanel (shared with editor live preview).
 * Location: src/app/library/npc-creatures/NpcCreatureStatblockView.tsx
 */
import type { NpcCreatureDefinition } from '../../../domains/npc-creature';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '../../../shared/ui/dialog';
import { Button } from '../../../shared/ui/button';
import { NpcCreatureStatblockPanel } from './NpcCreatureStatblockPanel';
import {
  formatNpcLevelMachtgradLine,
  NPC_CREATURE_CATEGORY_LABELS,
  NPC_CREATURE_KIND_LABELS,
} from './npcCreatureLibraryLabels';
import { deriveNpcCreaturePower } from '../../../domains/npc-creature';

export interface NpcCreatureStatblockViewProps {
  definition: NpcCreatureDefinition | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function NpcCreatureStatblockView({
  definition,
  open,
  onOpenChange,
}: NpcCreatureStatblockViewProps) {
  if (!definition) return null;

  const derived = deriveNpcCreaturePower(definition);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="max-h-[90vh] w-[calc(100%-1.5rem)] max-w-lg overflow-y-auto sm:max-w-xl"
        data-npc-statblock-view
        aria-describedby="npc-statblock-description"
      >
        <DialogHeader>
          <DialogTitle className="pr-8 text-left text-lg sm:text-xl">
            {definition.name}
          </DialogTitle>
          <DialogDescription id="npc-statblock-description" className="text-left">
            {NPC_CREATURE_KIND_LABELS[definition.kind]} ·{' '}
            {NPC_CREATURE_CATEGORY_LABELS[definition.category]} ·{' '}
            {formatNpcLevelMachtgradLine(definition.level, derived.machtgradLabel)}
          </DialogDescription>
        </DialogHeader>

        <NpcCreatureStatblockPanel definition={definition} compactHeader />

        <div className="flex justify-end pt-2">
          <Button
            type="button"
            variant="outline"
            className="h-11 min-h-11"
            onClick={() => onOpenChange(false)}
          >
            Schließen
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
