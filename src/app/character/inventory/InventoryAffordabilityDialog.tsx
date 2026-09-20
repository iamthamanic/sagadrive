/**
 * InventoryAffordabilityDialog — §10.3 / #32 purchase vs gift choice when adding
 * catalog items whose cost meets or exceeds character abstract resources.
 * Location: src/app/character/inventory/InventoryAffordabilityDialog.tsx
 */
import { Button } from '../../../shared/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '../../../shared/ui/dialog';
import type { AffordabilityDecision, PurchaseMode } from '../../../domains/rules/sagadrive/items';

export interface InventoryAffordabilityDialogProps {
  open: boolean;
  decision: AffordabilityDecision | null;
  itemName: string;
  onCancel: () => void;
  onConfirm: (mode: PurchaseMode) => void;
}

export function InventoryAffordabilityDialog({
  open,
  decision,
  itemName,
  onCancel,
  onConfirm,
}: InventoryAffordabilityDialogProps) {
  if (!decision) return null;

  const blocked = decision.kind === 'blocked-needs-gift-override';
  const equalCost = decision.kind === 'require-purchase-choice';

  return (
    <Dialog open={open} onOpenChange={(next) => !next && onCancel()}>
      <DialogContent
        className="max-w-md"
        data-inventory-affordability-dialog
        data-affordability-kind={decision.kind}
      >
        <DialogHeader>
          <DialogTitle>
            {blocked ? 'Zu teuer für Ressourcen' : 'Beschaffung wählen'}
          </DialogTitle>
          <DialogDescription>
            {blocked
              ? `${itemName} kostet ${decision.cost}, du hast nur ${decision.resources} Ressourcen. Kauf ist blockiert — Geschenk, Quest oder ohne Kauf möglich.`
              : equalCost
                ? `${itemName} kostet ${decision.cost} (gleich deinen Ressourcen). Kaufen senkt Ressourcen um 1; Geschenk/ohne Kauf belässt sie.`
                : `${itemName}: Beschaffung bestätigen.`}
          </DialogDescription>
        </DialogHeader>
        <DialogFooter className="flex-col gap-2 sm:flex-col">
          {equalCost && (
            <Button
              type="button"
              data-affordability-purchase
              onClick={() => onConfirm('purchase')}
            >
              Kaufen (−1 Ressource)
            </Button>
          )}
          <Button
            type="button"
            variant={blocked ? 'default' : 'outline'}
            data-affordability-gift
            onClick={() => onConfirm('gift')}
          >
            Geschenk / Quest / ohne Kauf
          </Button>
          <Button type="button" variant="ghost" onClick={onCancel}>
            Abbrechen
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
