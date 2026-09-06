/**
 * ItemForkDialog — fork Core/builtin into Personal or World (#139).
 * Location: src/app/items/workbench/ItemForkDialog.tsx
 */
import { useState } from 'react';
import { Button } from '../../../components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '../../../components/ui/dialog';
import { Label } from '../../../components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../../../components/ui/select';
import type { ForkDefinitionTarget } from '../../../infrastructure/inventory/item-catalog-service';
import type { WorldProfileVm } from '../../../modules/worlds/types/world.types';

export interface ItemForkDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  worlds: WorldProfileVm[];
  saving: boolean;
  onConfirm: (target: ForkDefinitionTarget) => void;
}

export function ItemForkDialog({
  open,
  onOpenChange,
  worlds,
  saving,
  onConfirm,
}: ItemForkDialogProps) {
  const [scope, setScope] = useState<'personal' | 'world'>('personal');
  const [worldProfileId, setWorldProfileId] = useState('');
  const [error, setError] = useState('');

  const handleConfirm = () => {
    if (scope === 'personal') {
      onConfirm({ scope: 'personal' });
      return;
    }
    if (!worldProfileId) {
      setError('Bitte eine Welt wählen.');
      return;
    }
    setError('');
    onConfirm({ scope: 'world', worldProfileId });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent data-item-workbench-fork>
        <DialogHeader>
          <DialogTitle>Als eigenes Item verwenden</DialogTitle>
          <DialogDescription>
            Es entsteht eine neue editierbare Kopie. Die Originaldefinition bleibt unverändert.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="space-y-2">
            <Label>Ziel</Label>
            <Select
              value={scope}
              onValueChange={(value) => setScope(value === 'world' ? 'world' : 'personal')}
            >
              <SelectTrigger className="h-11 min-h-11">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="personal">Mein Item</SelectItem>
                <SelectItem value="world">Welt-Item</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {scope === 'world' && (
            <div className="space-y-2">
              <Label>Welt *</Label>
              <Select value={worldProfileId || undefined} onValueChange={setWorldProfileId}>
                <SelectTrigger className="h-11 min-h-11">
                  <SelectValue placeholder="Welt wählen" />
                </SelectTrigger>
                <SelectContent>
                  {worlds.map((world) => (
                    <SelectItem key={world.id} value={world.id}>
                      {world.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {error && (
            <p className="text-sm text-destructive" role="alert">
              {error}
            </p>
          )}
        </div>

        <DialogFooter className="gap-2">
          <Button
            type="button"
            variant="outline"
            className="h-11 min-h-11"
            onClick={() => onOpenChange(false)}
            disabled={saving}
          >
            Abbrechen
          </Button>
          <Button
            type="button"
            className="h-11 min-h-11"
            onClick={handleConfirm}
            disabled={saving}
            data-item-workbench-fork-confirm
          >
            {saving ? 'Kopieren…' : 'Kopie erstellen'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
