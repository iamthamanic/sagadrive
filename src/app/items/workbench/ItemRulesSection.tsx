/**
 * ItemRulesSection — type-dependent SagaDrive mechanical fields (#139).
 * Progressive disclosure: only relevant controls for the current inventory type.
 * Location: src/app/items/workbench/ItemRulesSection.tsx
 */
import { Checkbox } from '../../../shared/ui/checkbox';
import { Input } from '../../../shared/ui/input';
import { Label } from '../../../shared/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../../../shared/ui/select';
import { WEAPON_DAMAGE_OPTIONS } from '../../character';
import {
  parseItemCost,
  parseItemLoad,
  parseMinimumStrength,
  parseProtection,
  type WorkbenchFormState,
} from './workbenchForm';

export interface ItemRulesSectionProps {
  form: WorkbenchFormState;
  readOnly: boolean;
  onChange: (next: WorkbenchFormState) => void;
}

export function ItemRulesSection({ form, readOnly, onChange }: ItemRulesSectionProps) {
  return (
    <section className="space-y-4" data-item-workbench-rules aria-labelledby="wb-rules">
      <h2 id="wb-rules" className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
        SagaDrive-Regeln
      </h2>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div className="space-y-2">
          <Label htmlFor="wb-load">Last *</Label>
          <Select
            value={String(form.load)}
            disabled={readOnly}
            onValueChange={(value) => onChange({ ...form, load: parseItemLoad(value) })}
          >
            <SelectTrigger id="wb-load" className="h-11 min-h-11">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {[0, 1, 2, 3].map((value) => (
                <SelectItem key={value} value={String(value)}>
                  {value}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label htmlFor="wb-cost">Kosten *</Label>
          <Select
            value={String(form.cost)}
            disabled={readOnly}
            onValueChange={(value) => onChange({ ...form, cost: parseItemCost(value) })}
          >
            <SelectTrigger id="wb-cost" className="h-11 min-h-11">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {[0, 1, 2, 3, 4, 5].map((value) => (
                <SelectItem key={value} value={String(value)}>
                  {value}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label htmlFor="wb-stack">Stacklimit *</Label>
          <Input
            id="wb-stack"
            type="number"
            min={1}
            max={99}
            className="h-11 min-h-11"
            disabled={readOnly || form.type === 'container'}
            value={form.type === 'container' ? 1 : form.stackLimit}
            onChange={(event) =>
              onChange({
                ...form,
                stackLimit: Math.min(99, Math.max(1, Number.parseInt(event.target.value, 10) || 1)),
              })
            }
          />
        </div>
      </div>

      {form.type === 'weapon' && (
        <div className="space-y-3 rounded-lg border border-border/60 bg-muted/10 p-4">
          <p className="font-medium">Waffe</p>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label>Schaden *</Label>
              <Select
                value={form.damage}
                disabled={readOnly}
                onValueChange={(value) => onChange({ ...form, damage: value })}
              >
                <SelectTrigger className="h-11 min-h-11">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {WEAPON_DAMAGE_OPTIONS.map((option) => (
                    <SelectItem key={option} value={option}>
                      {option}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="wb-damage-type">Schadensart *</Label>
              <Input
                id="wb-damage-type"
                className="h-11 min-h-11"
                maxLength={40}
                disabled={readOnly}
                value={form.damageType}
                onChange={(event) => onChange({ ...form, damageType: event.target.value })}
              />
            </div>
            <div className="space-y-2 sm:col-span-2">
              <Label>Handhabung *</Label>
              <Select
                value={form.handling}
                disabled={readOnly}
                onValueChange={(value) =>
                  onChange({
                    ...form,
                    handling: value === 'twoHanded' ? 'twoHanded' : 'oneHanded',
                  })
                }
              >
                <SelectTrigger className="h-11 min-h-11">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="oneHanded">Einhändig</SelectItem>
                  <SelectItem value="twoHanded">Zweihändig</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="flex flex-wrap gap-4">
            <label className="flex min-h-11 items-center gap-2 text-sm">
              <Checkbox
                checked={form.finesse}
                disabled={readOnly}
                onCheckedChange={(checked) => onChange({ ...form, finesse: checked === true })}
              />
              Finesse
            </label>
            <label className="flex min-h-11 items-center gap-2 text-sm">
              <Checkbox
                checked={form.reichweite}
                disabled={readOnly}
                onCheckedChange={(checked) => onChange({ ...form, reichweite: checked === true })}
              />
              Reichweite
            </label>
          </div>
          <div className="space-y-2">
            <Label>Durchdringung (0–3)</Label>
            <Select
              value={String(form.penetration)}
              disabled={readOnly}
              onValueChange={(value) =>
                onChange({
                  ...form,
                  penetration: Math.min(3, Math.max(0, Number.parseInt(value, 10) || 0)),
                })
              }
            >
              <SelectTrigger className="h-11 min-h-11">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {[0, 1, 2, 3].map((value) => (
                  <SelectItem key={value} value={String(value)}>
                    {value === 0 ? 'Keine' : value}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      )}

      {form.type === 'armor' && (
        <div className="grid gap-4 sm:grid-cols-2 rounded-lg border border-border/60 bg-muted/10 p-4">
          <div className="space-y-2">
            <Label>Schutz *</Label>
            <Select
              value={String(form.protection)}
              disabled={readOnly}
              onValueChange={(value) => {
                const protection = parseProtection(value);
                const minimumStrength =
                  protection === 1 ? 1 : protection === 2 ? 2 : 4;
                onChange({ ...form, protection, minimumStrength });
              }}
            >
              <SelectTrigger className="h-11 min-h-11">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {[1, 2, 3].map((value) => (
                  <SelectItem key={value} value={String(value)}>
                    {value}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Mindeststärke *</Label>
            <Select
              value={String(form.minimumStrength)}
              disabled={readOnly}
              onValueChange={(value) =>
                onChange({ ...form, minimumStrength: parseMinimumStrength(value) })
              }
            >
              <SelectTrigger className="h-11 min-h-11">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {[1, 2, 4].map((value) => (
                  <SelectItem key={value} value={String(value)}>
                    {value}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      )}

      {form.type === 'container' && (
        <div className="space-y-2 rounded-lg border border-border/60 bg-muted/10 p-4">
          <Label htmlFor="wb-capacity">Kapazität (1–20) *</Label>
          <Input
            id="wb-capacity"
            type="number"
            min={1}
            max={20}
            className="h-11 min-h-11"
            disabled={readOnly}
            value={form.containerCapacity}
            onChange={(event) =>
              onChange({
                ...form,
                containerCapacity: Math.min(
                  20,
                  Math.max(1, Number.parseInt(event.target.value, 10) || 1),
                ),
              })
            }
          />
        </div>
      )}

      {(form.type === 'tool' || form.type === 'misc' || form.type === 'consumable') && (
        <div className="space-y-2">
          <Label htmlFor="wb-traits">Traits (kommagetrennt)</Label>
          <Input
            id="wb-traits"
            className="h-11 min-h-11"
            disabled={readOnly}
            value={form.traits}
            onChange={(event) => onChange({ ...form, traits: event.target.value })}
          />
        </div>
      )}

      {form.type === 'misc' && (
        <div className="space-y-2">
          <Label>Ausrüstungsslot</Label>
          <Select
            value={form.miscEquip}
            disabled={readOnly}
            onValueChange={(value) =>
              onChange({
                ...form,
                miscEquip:
                  value === 'head' ||
                  value === 'accessory' ||
                  value === 'special' ||
                  value === 'feet'
                    ? value
                    : 'none',
              })
            }
          >
            <SelectTrigger className="h-11 min-h-11">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="none">Kein Slot</SelectItem>
              <SelectItem value="head">Kopf</SelectItem>
              <SelectItem value="accessory">Accessoire</SelectItem>
              <SelectItem value="special">Spezial</SelectItem>
              <SelectItem value="feet">Füße</SelectItem>
            </SelectContent>
          </Select>
        </div>
      )}
    </section>
  );
}
