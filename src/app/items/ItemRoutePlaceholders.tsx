/**
 * Placeholder screens for Item routes until Workbench (#139) lands.
 * Location: src/app/items/ItemRoutePlaceholders.tsx
 */
import { Button } from '../../components/ui/button';

export function ItemCreatePlaceholder({ onBack }: { onBack: () => void }) {
  return (
    <div className="mx-auto flex max-w-lg flex-col gap-4 p-6" data-item-route="create">
      <h1 className="text-2xl font-bold tracking-wide">Neues Item</h1>
      <p className="text-sm text-muted-foreground">
        Die Item-Werkbank wird in einem späteren Schritt ergänzt. Die Route{' '}
        <code className="text-xs">/items/create</code> ist bereits adressierbar.
      </p>
      <Button type="button" variant="outline" className="w-fit" onClick={onBack}>
        Zurück zur Bibliothek
      </Button>
    </div>
  );
}

export function ItemDetailPlaceholder({
  itemId,
  onBack,
}: {
  itemId: string;
  onBack: () => void;
}) {
  return (
    <div className="mx-auto flex max-w-lg flex-col gap-4 p-6" data-item-route="detail">
      <h1 className="text-2xl font-bold tracking-wide">Item</h1>
      <p className="text-sm text-muted-foreground">
        Platzhalter für <code className="break-all text-xs">/items/{itemId}</code>. Bearbeitung folgt
        mit der Item-Workbench.
      </p>
      <Button type="button" variant="outline" className="w-fit" onClick={onBack}>
        Zurück zur Bibliothek
      </Button>
    </div>
  );
}

export function NotFoundPlaceholder({
  attemptedPath,
  onHome,
}: {
  attemptedPath: string;
  onHome: () => void;
}) {
  return (
    <div className="mx-auto flex max-w-lg flex-col gap-4 p-6" data-item-route="not-found">
      <h1 className="text-2xl font-bold tracking-wide">Seite nicht gefunden</h1>
      <p className="text-sm text-muted-foreground">
        Unbekannte Adresse <code className="break-all text-xs">{attemptedPath}</code>.
      </p>
      <Button type="button" className="w-fit" onClick={onHome}>
        Zum Dashboard
      </Button>
    </div>
  );
}
