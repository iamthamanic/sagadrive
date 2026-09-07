/**
 * ItemWorkbenchTopbar — back | title | primary save/fork CTA (#139).
 * Location: src/app/items/workbench/ItemWorkbenchTopbar.tsx
 */
import { ArrowLeft } from 'lucide-react';
import { Button } from '../../../shared/ui/button';

export interface ItemWorkbenchTopbarProps {
  title: string;
  primaryLabel: string;
  primaryDisabled?: boolean;
  onBack: () => void;
  onPrimary: () => void;
  saving?: boolean;
}

export function ItemWorkbenchTopbar({
  title,
  primaryLabel,
  primaryDisabled,
  onBack,
  onPrimary,
  saving,
}: ItemWorkbenchTopbarProps) {
  return (
    <header
      className="flex flex-wrap items-center gap-3 border-b border-border/60 pb-4"
      data-item-workbench-topbar
    >
      <Button
        type="button"
        variant="ghost"
        className="h-11 min-h-11 gap-2 px-3"
        onClick={onBack}
        data-item-workbench-back
      >
        <ArrowLeft className="size-4" aria-hidden="true" />
        Zurück zu Items
      </Button>

      <h1 className="min-w-0 flex-1 truncate text-center text-lg font-semibold tracking-wide md:text-xl">
        {title}
      </h1>

      <Button
        type="button"
        className="h-11 min-h-11 min-w-[7.5rem]"
        onClick={onPrimary}
        disabled={primaryDisabled || saving}
        data-item-workbench-primary
      >
        {saving ? 'Speichern…' : primaryLabel}
      </Button>
    </header>
  );
}
