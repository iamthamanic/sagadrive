/**
 * LookCreateChooser — Create-flow entry: Preset / Referenzbilder / Duplizieren (#353).
 * Location: src/app/look/create/LookCreateChooser.tsx
 */
import { Button } from '../../../shared/ui/button';

export type LookCreatePath = 'preset' | 'references' | 'duplicate';

export type LookCreateChooserProps = {
  onChoose: (path: LookCreatePath) => void;
  onBack: () => void;
};

export function LookCreateChooser({ onChoose, onBack }: LookCreateChooserProps) {
  return (
    <div className="mx-auto flex h-full max-w-lg flex-col gap-4 p-4" data-look-create-chooser>
      <div className="flex items-center gap-2">
        <Button type="button" variant="ghost" className="min-h-11" onClick={onBack}>
          Zurück
        </Button>
        <h1 className="text-lg font-semibold">Look erstellen</h1>
      </div>
      <p className="text-sm text-muted-foreground">
        Wähle, wie der neue Look entstehen soll.
      </p>
      <div className="flex flex-col gap-3">
        <Button
          type="button"
          variant="outline"
          className="min-h-14 justify-start px-4 text-left"
          onClick={() => onChoose('preset')}
          data-look-create-path="preset"
        >
          <span className="flex flex-col items-start gap-0.5">
            <span className="font-medium">Preset</span>
            <span className="text-xs font-normal text-muted-foreground">
              Manuell im Look Editor starten
            </span>
          </span>
        </Button>
        <Button
          type="button"
          variant="outline"
          className="min-h-14 justify-start px-4 text-left"
          onClick={() => onChoose('references')}
          data-look-create-path="references"
        >
          <span className="flex flex-col items-start gap-0.5">
            <span className="font-medium">Von Referenzbildern</span>
            <span className="text-xs font-normal text-muted-foreground">
              1–10 Bilder analysieren und Draft prüfen
            </span>
          </span>
        </Button>
        <Button
          type="button"
          variant="outline"
          className="min-h-14 justify-start px-4 text-left"
          onClick={() => onChoose('duplicate')}
          data-look-create-path="duplicate"
        >
          <span className="flex flex-col items-start gap-0.5">
            <span className="font-medium">Bestehenden Look duplizieren</span>
            <span className="text-xs font-normal text-muted-foreground">
              Kopie als Ausgangspunkt wählen
            </span>
          </span>
        </Button>
      </div>
    </div>
  );
}
