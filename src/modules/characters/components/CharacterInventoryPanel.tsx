import { useState } from 'react';
import { Plus, Trash2 } from 'lucide-react';
import { Button } from '../../../components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '../../../components/ui/dialog';
import { Input } from '../../../components/ui/input';
import { Label } from '../../../components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../../components/ui/select';
import { Textarea } from '../../../components/ui/textarea';
import type { ItemDto } from '../types/character.types';

type ItemType = ItemDto['type'];

interface CharacterInventoryPanelProps {
  items: ItemDto[];
  onChange: (items: ItemDto[]) => void;
  capacity?: number;
}

const itemTypeLabels: Record<ItemType, string> = {
  weapon: 'Waffe',
  armor: 'Rüstung',
  consumable: 'Verbrauch',
  misc: 'Sonstiges',
};

export function CharacterInventoryPanel({ items, onChange, capacity = 30 }: CharacterInventoryPanelProps) {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [type, setType] = useState<ItemType>('misc');
  const [quantity, setQuantity] = useState(1);
  const [validationError, setValidationError] = useState('');
  const inventoryFull = items.length >= capacity;

  const resetDraft = () => {
    setName('');
    setDescription('');
    setType('misc');
    setQuantity(1);
    setValidationError('');
  };

  const handleDialogChange = (open: boolean) => {
    if (open && inventoryFull) return;
    setDialogOpen(open);
    if (!open) resetDraft();
  };

  const handleTypeChange = (value: string) => {
    if (value === 'weapon' || value === 'armor' || value === 'consumable' || value === 'misc') {
      setType(value);
    }
  };

  const handleAddItem = () => {
    if (inventoryFull) {
      setDialogOpen(false);
      return;
    }

    const trimmedName = name.trim();
    if (!trimmedName) {
      setValidationError('Bitte gib einen Namen für den Gegenstand ein.');
      return;
    }

    const nextItem: ItemDto = {
      id: crypto.randomUUID(),
      name: trimmedName,
      description: description.trim(),
      type,
      quantity: Math.max(1, quantity),
    };

    onChange([...items, nextItem]);
    setDialogOpen(false);
    resetDraft();
  };

  const handleRemoveItem = (itemId: string) => {
    onChange(items.filter((item) => item.id !== itemId));
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <Label>Inventar ({items.length}/{capacity})</Label>
          <p className="text-xs text-muted-foreground">
            {inventoryFull ? 'Das Inventar ist voll. Entferne zuerst einen Gegenstand.' : 'Jeder Gegenstand belegt einen Inventarplatz.'}
          </p>
        </div>
        <Button size="sm" onClick={() => handleDialogChange(true)} disabled={inventoryFull}>
          <Plus className="h-4 w-4" />
          Hinzufügen
        </Button>
      </div>

      <div className="grid grid-cols-3 gap-2 sm:grid-cols-4 md:grid-cols-5 xl:grid-cols-6">
        {Array.from({ length: capacity }, (_, index) => {
          const item = items[index];
          if (!item) {
            return (
              <div
                key={`empty-${index}`}
                className="flex aspect-square items-center justify-center rounded-lg border border-foreground/20 bg-muted/15 text-xs text-muted-foreground"
                aria-label={`Freier Inventarplatz ${index + 1}`}
              >
                {index + 1}
              </div>
            );
          }

          return (
            <div
              key={item.id}
              className="group relative flex aspect-square min-w-0 flex-col justify-between rounded-lg border border-primary/35 bg-primary/5 p-2.5 shadow-sm transition-[border-color,background-color] hover:border-primary/60 hover:bg-primary/10"
            >
              <div className="min-w-0 pr-7">
                <p className="truncate text-sm font-medium" title={item.name}>{item.name}</p>
                <p className="mt-0.5 truncate text-xs text-muted-foreground">{itemTypeLabels[item.type]}</p>
              </div>
              <div className="flex items-end justify-between gap-1 text-xs text-muted-foreground">
                <span>Slot {index + 1}</span>
                <span className="font-medium text-foreground">×{item.quantity}</span>
              </div>
              <Button
                type="button"
                size="icon"
                variant="ghost"
                onClick={() => handleRemoveItem(item.id)}
                className="absolute right-1.5 top-1.5 size-7 text-destructive opacity-80 hover:bg-destructive/10 hover:text-destructive hover:opacity-100"
                aria-label={`${item.name} aus Inventar entfernen`}
              >
                <Trash2 className="h-3.5 w-3.5" />
              </Button>
            </div>
          );
        })}
      </div>

      <Dialog open={dialogOpen} onOpenChange={handleDialogChange}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Gegenstand hinzufügen</DialogTitle>
            <DialogDescription>Der neue Gegenstand wird im nächsten freien Inventarplatz abgelegt.</DialogDescription>
          </DialogHeader>

          <div className="grid gap-4">
            <div className="space-y-2">
              <Label htmlFor="inventory-name">Name</Label>
              <Input
                id="inventory-name"
                value={name}
                onChange={(event) => {
                  setName(event.target.value);
                  if (validationError) setValidationError('');
                }}
                placeholder="z. B. Heiltrank"
                aria-invalid={Boolean(validationError)}
              />
              {validationError && <p className="text-sm text-destructive">{validationError}</p>}
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="inventory-type">Typ</Label>
                <Select value={type} onValueChange={handleTypeChange}>
                  <SelectTrigger id="inventory-type"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="weapon">Waffe</SelectItem>
                    <SelectItem value="armor">Rüstung</SelectItem>
                    <SelectItem value="consumable">Verbrauch</SelectItem>
                    <SelectItem value="misc">Sonstiges</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="inventory-quantity">Menge</Label>
                <Input
                  id="inventory-quantity"
                  type="number"
                  min="1"
                  value={quantity}
                  onChange={(event) => setQuantity(Math.max(1, Number.parseInt(event.target.value, 10) || 1))}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="inventory-description">Beschreibung</Label>
              <Textarea id="inventory-description" rows={3} value={description} onChange={(event) => setDescription(event.target.value)} />
            </div>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => handleDialogChange(false)}>Abbrechen</Button>
            <Button type="button" onClick={handleAddItem}>Gegenstand hinzufügen</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
