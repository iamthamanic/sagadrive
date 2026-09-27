/**
 * LookEditScreen — canonical route stub for Look bearbeiten (#343).
 * Location: src/app/look/LookEditScreen.tsx
 */
import { Button } from '../../shared/ui/button';

export interface LookEditScreenProps {
  lookId: string;
  onBack: () => void;
}

export function LookEditScreen({ lookId, onBack }: LookEditScreenProps) {
  return (
    <div className="mx-auto max-w-2xl space-y-4 p-4 md:p-8" data-look-edit-screen>
      <h1 className="text-xl md:text-2xl">Look bearbeiten</h1>
      <p className="text-muted-foreground text-sm md:text-base">
        Look-ID: <code className="text-foreground">{lookId}</code>
      </p>
      <p className="text-muted-foreground text-sm md:text-base">
        Der vollständige Look-Editor kommt mit Issue #344. Diese Route bleibt der
        kanonische Einstieg aus der Bibliothek.
      </p>
      <Button type="button" variant="outline" onClick={onBack}>
        Zurück zur Bibliothek
      </Button>
    </div>
  );
}
