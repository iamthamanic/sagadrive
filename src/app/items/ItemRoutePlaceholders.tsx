/**
 * Placeholder screens for unknown Item routes. Create/detail live in workbench (#139).
 * Location: src/app/items/ItemRoutePlaceholders.tsx
 */
import { Button } from '../../shared/ui/button';

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
