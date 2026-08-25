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
import type { AbilityDto } from '../types/character.types';

type AbilityType = AbilityDto['type'];

interface CharacterAbilitiesPanelProps {
  abilities: AbilityDto[];
  onChange: (abilities: AbilityDto[]) => void;
}

const abilityTypeLabels: Record<AbilityType, string> = {
  combat: 'Kampf',
  magic: 'Zauber',
  skill: 'Fähigkeit',
};

export function CharacterAbilitiesPanel({ abilities, onChange }: CharacterAbilitiesPanelProps) {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [type, setType] = useState<AbilityType>('skill');
  const [cost, setCost] = useState(0);
  const [effect, setEffect] = useState('');
  const [validationError, setValidationError] = useState('');

  const resetDraft = () => {
    setName('');
    setDescription('');
    setType('skill');
    setCost(0);
    setEffect('');
    setValidationError('');
  };

  const handleDialogChange = (open: boolean) => {
    setDialogOpen(open);
    if (!open) resetDraft();
  };

  const handleAddAbility = () => {
    const trimmedName = name.trim();
    if (!trimmedName) {
      setValidationError('Bitte gib einen Namen für die Fähigkeit ein.');
      return;
    }

    const nextAbility: AbilityDto = {
      id: crypto.randomUUID(),
      name: trimmedName,
      description: description.trim(),
      type,
      cost: Math.max(0, cost),
      effect: effect.trim(),
    };

    onChange([...abilities, nextAbility]);
    setDialogOpen(false);
    resetDraft();
  };

  const handleRemoveAbility = (abilityId: string) => {
    onChange(abilities.filter((ability) => ability.id !== abilityId));
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <Label>Fähigkeiten ({abilities.length})</Label>
          <p className="text-xs text-muted-foreground">Kampfaktionen, Zauber und besondere Skills des Charakters.</p>
        </div>
        <Button size="sm" onClick={() => setDialogOpen(true)}>
          <Plus className="h-4 w-4" />
          Fähigkeit hinzufügen
        </Button>
      </div>

      {abilities.length === 0 ? (
        <div className="rounded-lg border border-dashed border-foreground/20 bg-muted/20 px-4 py-8 text-center">
          <p className="font-medium">Noch keine Fähigkeiten</p>
          <p className="mt-1 text-sm text-muted-foreground">Füge die erste Fähigkeit hinzu, damit sie beim Charakter gespeichert wird.</p>
          <Button className="mt-4" onClick={() => setDialogOpen(true)}>
            <Plus className="h-4 w-4" />
            Fähigkeit hinzufügen
          </Button>
        </div>
      ) : (
        <div className="space-y-2">
          {abilities.map((ability) => (
            <div key={ability.id} className="flex items-center justify-between gap-4 rounded-lg border border-foreground/15 bg-muted/20 p-3">
              <div className="min-w-0">
                <p className="truncate font-medium">{ability.name}</p>
                <p className="text-sm text-muted-foreground">
                  {abilityTypeLabels[ability.type]}{ability.cost > 0 ? ` · Kosten ${ability.cost}` : ''}
                </p>
                {ability.description && <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">{ability.description}</p>}
              </div>
              <Button
                type="button"
                size="sm"
                variant="destructive"
                onClick={() => handleRemoveAbility(ability.id)}
                aria-label={`${ability.name} entfernen`}
              >
                <Trash2 className="h-4 w-4" />
                Entfernen
              </Button>
            </div>
          ))}
        </div>
      )}

      <Dialog open={dialogOpen} onOpenChange={handleDialogChange}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Fähigkeit hinzufügen</DialogTitle>
            <DialogDescription>Lege die wichtigsten Daten für die neue Fähigkeit fest.</DialogDescription>
          </DialogHeader>

          <div className="grid gap-4">
            <div className="space-y-2">
              <Label htmlFor="ability-name">Name</Label>
              <Input
                id="ability-name"
                value={name}
                onChange={(event) => {
                  setName(event.target.value);
                  if (validationError) setValidationError('');
                }}
                placeholder="z. B. Feuerball"
                aria-invalid={Boolean(validationError)}
              />
              {validationError && <p className="text-sm text-destructive">{validationError}</p>}
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="ability-type">Typ</Label>
                <Select value={type} onValueChange={(value) => setType(value as AbilityType)}>
                  <SelectTrigger id="ability-type"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="combat">Kampf</SelectItem>
                    <SelectItem value="magic">Zauber</SelectItem>
                    <SelectItem value="skill">Fähigkeit</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="ability-cost">Kosten</Label>
                <Input
                  id="ability-cost"
                  type="number"
                  min="0"
                  value={cost}
                  onChange={(event) => setCost(Math.max(0, Number.parseInt(event.target.value, 10) || 0))}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="ability-description">Beschreibung</Label>
              <Textarea id="ability-description" rows={3} value={description} onChange={(event) => setDescription(event.target.value)} />
            </div>

            <div className="space-y-2">
              <Label htmlFor="ability-effect">Effekt</Label>
              <Textarea id="ability-effect" rows={2} value={effect} onChange={(event) => setEffect(event.target.value)} />
            </div>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => handleDialogChange(false)}>Abbrechen</Button>
            <Button type="button" onClick={handleAddAbility}>Fähigkeit hinzufügen</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
