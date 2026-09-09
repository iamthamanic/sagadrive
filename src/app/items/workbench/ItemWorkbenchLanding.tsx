/**
 * ItemWorkbenchLanding — square click target over workbench line-art (#139 forge layout).
 * Location: src/app/items/workbench/ItemWorkbenchLanding.tsx
 */
import workbenchArt from '../../../assets/items/workbench-line-art.svg';

export interface ItemWorkbenchLandingProps {
  onStart: () => void;
  /** When false, art shows but the CTA cannot receive clicks (e.g. type modal open). */
  interactive?: boolean;
}

export function ItemWorkbenchLanding({ onStart, interactive = true }: ItemWorkbenchLandingProps) {
  return (
    <div
      className={`relative flex min-h-[min(70vh,32rem)] w-full flex-col items-center justify-center px-4 py-10 ${
        interactive ? '' : 'pointer-events-none'
      }`}
      data-item-workbench-landing-shell
      aria-hidden={interactive ? undefined : true}
    >
      <img
        src={workbenchArt}
        alt=""
        className="pointer-events-none absolute bottom-[12%] left-1/2 w-full max-w-2xl -translate-x-1/2 opacity-90"
        data-item-workbench-art
      />

      <button
        type="button"
        onClick={onStart}
        disabled={!interactive}
        tabIndex={interactive ? 0 : -1}
        className="relative z-10 flex aspect-square w-full max-w-[14rem] flex-col items-center justify-center gap-2 rounded-lg border border-dashed border-border/80 bg-background/50 px-4 text-center transition hover:border-primary/50 hover:bg-background/70 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-80"
        data-item-workbench-landing
        aria-label="Klicke hier, um ein Item zu erstellen"
      >
        <span className="text-base font-semibold leading-snug tracking-wide text-foreground md:text-lg">
          Klicke hier, um ein Item zu erstellen
        </span>
      </button>
    </div>
  );
}
