/**
 * ItemBasicsSection — name + description for Workbench (#139).
 * Location: src/app/items/workbench/ItemBasicsSection.tsx
 */
import { Input } from '../../../shared/ui/input';
import { Label } from '../../../shared/ui/label';
import { Textarea } from '../../../shared/ui/textarea';
import type { WorkbenchFormState } from './workbenchForm';

export interface ItemBasicsSectionProps {
  form: WorkbenchFormState;
  readOnly: boolean;
  onChange: (next: WorkbenchFormState) => void;
}

export function ItemBasicsSection({ form, readOnly, onChange }: ItemBasicsSectionProps) {
  return (
    <section className="space-y-4" data-item-workbench-basics aria-labelledby="wb-basics">
      <h2 id="wb-basics" className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
        Basisdaten
      </h2>
      <div className="space-y-2">
        <Label htmlFor="wb-name">Name *</Label>
        <Input
          id="wb-name"
          className="h-11 min-h-11"
          value={form.name}
          maxLength={80}
          disabled={readOnly}
          onChange={(event) => onChange({ ...form, name: event.target.value })}
          data-item-workbench-name
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="wb-description">Beschreibung</Label>
        <Textarea
          id="wb-description"
          rows={4}
          maxLength={1000}
          value={form.description}
          disabled={readOnly}
          onChange={(event) => onChange({ ...form, description: event.target.value })}
          data-item-workbench-description
        />
        <p className="text-xs text-muted-foreground">{form.description.length}/1000</p>
      </div>
    </section>
  );
}
