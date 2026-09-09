/**
 * ItemKindField — Item-Art dropdown; applies type template via onKindChange (#139).
 * Location: src/app/items/workbench/ItemKindField.tsx
 */
import { Label } from '../../../shared/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../../../shared/ui/select';
import type { ItemKindKey } from '../../../domains/items';
import type { WorkbenchFormState } from './workbenchForm';
import { WORKBENCH_TYPE_ENTRIES } from './workbenchLabels';

export interface ItemKindFieldProps {
  form: WorkbenchFormState;
  readOnly: boolean;
  onKindChange: (kindKey: ItemKindKey) => void;
}

export function ItemKindField({ form, readOnly, onKindChange }: ItemKindFieldProps) {
  return (
    <div className="space-y-2" data-item-workbench-kind-field>
      <Label htmlFor="wb-kind">Item-Art</Label>
      <Select
        value={form.kindKey}
        disabled={readOnly}
        onValueChange={(value) => {
          if (value && value !== form.kindKey) {
            onKindChange(value as ItemKindKey);
          }
        }}
      >
        <SelectTrigger id="wb-kind" className="h-11 min-h-11 w-full" data-item-workbench-kind>
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {WORKBENCH_TYPE_ENTRIES.map((entry) => (
            <SelectItem key={entry.id} value={entry.kindKey}>
              {entry.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
