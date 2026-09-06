/**
 * ItemAvailabilitySection — Personal vs World scope picker (#139).
 * World id is chosen from editable profiles only (never free-text).
 * Location: src/app/items/workbench/ItemAvailabilitySection.tsx
 */
import { Label } from '../../../components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../../../components/ui/select';
import type { WorldProfileVm } from '../../../modules/worlds/types/world.types';
import type { WorkbenchFormState } from './workbenchForm';

export interface ItemAvailabilitySectionProps {
  form: WorkbenchFormState;
  readOnly: boolean;
  /** Scope locked after create (identity immutable). */
  scopeLocked: boolean;
  worlds: WorldProfileVm[];
  worldsLoading: boolean;
  onChange: (next: WorkbenchFormState) => void;
}

export function ItemAvailabilitySection({
  form,
  readOnly,
  scopeLocked,
  worlds,
  worldsLoading,
  onChange,
}: ItemAvailabilitySectionProps) {
  const disabled = readOnly || scopeLocked;

  return (
    <section
      className="space-y-4"
      data-item-workbench-availability
      aria-labelledby="wb-availability"
    >
      <h2
        id="wb-availability"
        className="text-sm font-semibold uppercase tracking-wider text-muted-foreground"
      >
        Verfügbarkeit
      </h2>

      <div className="space-y-2">
        <Label>Eigentum</Label>
        <Select
          value={form.availability}
          disabled={disabled}
          onValueChange={(value) =>
            onChange({
              ...form,
              availability: value === 'world' ? 'world' : 'personal',
              worldProfileId: value === 'world' ? form.worldProfileId : '',
            })
          }
        >
          <SelectTrigger className="h-11 min-h-11" data-item-workbench-availability-scope>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="personal">Mein Item</SelectItem>
            <SelectItem value="world">Welt-Item</SelectItem>
          </SelectContent>
        </Select>
        {scopeLocked && (
          <p className="text-xs text-muted-foreground">
            Eigentum bleibt nach dem Speichern unverändert. Nutze „Als eigenes Item verwenden“ für
            eine Kopie.
          </p>
        )}
      </div>

      {form.availability === 'world' && (
        <div className="space-y-2">
          <Label>Welt *</Label>
          <Select
            value={form.worldProfileId || undefined}
            disabled={disabled || worldsLoading}
            onValueChange={(value) => onChange({ ...form, worldProfileId: value })}
          >
            <SelectTrigger className="h-11 min-h-11" data-item-workbench-world>
              <SelectValue placeholder={worldsLoading ? 'Welten laden…' : 'Welt wählen'} />
            </SelectTrigger>
            <SelectContent>
              {worlds.map((world) => (
                <SelectItem key={world.id} value={world.id}>
                  {world.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {!worldsLoading && worlds.length === 0 && (
            <p className="text-sm text-destructive" role="alert">
              Keine editierbare Welt verfügbar. Lege zuerst eine Welt in der Bibliothek an.
            </p>
          )}
        </div>
      )}
    </section>
  );
}
