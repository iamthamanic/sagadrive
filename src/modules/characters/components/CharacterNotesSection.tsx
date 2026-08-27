/**
 * CharacterNotesSection — Free-form notes under Hintergrundgeschichte.
 * Location: src/modules/characters/components/CharacterNotesSection.tsx
 */
import { Label } from '../../../components/ui/label';
import { Textarea } from '../../../components/ui/textarea';

type CharacterNotesSectionProps = {
  value: string;
  onChange: (value: string) => void;
};

export function CharacterNotesSection({ value, onChange }: CharacterNotesSectionProps) {
  return (
    <section className="space-y-4">
      <div>
        <h3 className="font-semibold">Notizen</h3>
        <p className="text-sm text-muted-foreground">
          Freie Spielnotizen, offene Fragen, Ziele oder Erinnerungen. Sie werden mit dem Charakter gespeichert und verändern keine Werte.
        </p>
      </div>
      <div className="space-y-2">
        <Label htmlFor="notes">Notizen</Label>
        <Textarea
          id="notes"
          rows={10}
          value={value}
          onChange={(event) => onChange(event.target.value)}
          className="min-h-[220px]"
          placeholder="Freie Spielnotizen, offene Fragen, Ziele oder Erinnerungen ..."
        />
      </div>
    </section>
  );
}
