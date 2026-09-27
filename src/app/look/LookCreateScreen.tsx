/**
 * LookCreateScreen — canonical route stub for Look erstellen (#343).
 * Full editor lands in #344; this screen is the shareable entry only.
 * Location: src/app/look/LookCreateScreen.tsx
 */
import { Button } from '../../shared/ui/button';

export interface LookCreateScreenProps {
  onBack: () => void;
}

export function LookCreateScreen({ onBack }: LookCreateScreenProps) {
  return (
    <div className="mx-auto max-w-2xl space-y-4 p-4 md:p-8" data-look-create-screen>
      <h1 className="text-xl md:text-2xl">Look erstellen</h1>
      <p className="text-muted-foreground text-sm md:text-base">
        Der Look-Editor folgt in einem nächsten Schritt. Du bist auf der kanonischen
        Create-Route — ohne parallele Editor-State-Maschine in der Bibliothek.
      </p>
      <Button type="button" variant="outline" onClick={onBack}>
        Zurück zur Bibliothek
      </Button>
    </div>
  );
}
