/**
 * ItemWorkbenchLanding — initial create surface with workbench line-art (#139).
 * Location: src/app/items/workbench/ItemWorkbenchLanding.tsx
 */
import workbenchArt from '../../../assets/items/workbench-line-art.svg';

export interface ItemWorkbenchLandingProps {
  onStart: () => void;
}

export function ItemWorkbenchLanding({ onStart }: ItemWorkbenchLandingProps) {
  return (
    <button
      type="button"
      onClick={onStart}
      className="group relative flex min-h-[min(70vh,32rem)] w-full flex-col items-center justify-center gap-6 rounded-xl border border-dashed border-border/80 bg-muted/10 px-6 py-12 text-center transition hover:border-primary/50 hover:bg-muted/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      data-item-workbench-landing
      aria-label="Klicke hier, um ein Item zu erstellen"
    >
      <img
        src={workbenchArt}
        alt=""
        className="pointer-events-none max-h-56 w-full max-w-xl opacity-90 transition group-hover:opacity-100"
        data-item-workbench-art
      />
      <span className="text-lg font-semibold tracking-wide text-foreground md:text-xl">
        Klicke hier, um ein Item zu erstellen
      </span>
      <span className="max-w-md text-sm text-muted-foreground">
        Wähle danach einen Typ — nur passende Felder werden angezeigt.
      </span>
    </button>
  );
}
