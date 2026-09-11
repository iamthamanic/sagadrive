/**
 * ItemVisualModeToggle — reusable 2D/3D preview mode switch for item visuals.
 * Location: src/app/items/visuals/ItemVisualModeToggle.tsx
 */
import type { ReactElement } from 'react';
import { Button } from '../../../shared/ui/button';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '../../../shared/ui/tooltip';
import type { ItemVisualMode } from './useItemVisualTools';

export interface ItemVisualModeToggleProps {
  mode: ItemVisualMode;
  onModeChange: (mode: ItemVisualMode) => void;
  /** Test/DOM attr prefix; defaults to workbench contract attrs. */
  dataPrefix?: string;
}

function withTooltip(label: string, control: ReactElement) {
  return (
    <Tooltip pinOnClick={false}>
      <TooltipTrigger asChild>
        <span className="inline-flex">{control}</span>
      </TooltipTrigger>
      <TooltipContent side="top" sideOffset={6}>
        {label}
      </TooltipContent>
    </Tooltip>
  );
}

export function ItemVisualModeToggle({
  mode,
  onModeChange,
  dataPrefix = 'item-workbench-visual',
}: ItemVisualModeToggleProps) {
  return (
    <div
      className="absolute right-1.5 top-1.5 z-10 inline-flex rounded-md border border-border/70 bg-background/90 p-px"
      role="group"
      aria-label="2D oder 3D"
      data-item-workbench-visual-toggle={dataPrefix === 'item-workbench-visual' ? true : undefined}
      data-item-visual-mode-toggle
      onClick={(event) => event.stopPropagation()}
      onKeyDown={(event) => event.stopPropagation()}
    >
      {withTooltip(
        '2D-Bildvorschau anzeigen',
        <Button
          type="button"
          size="sm"
          variant={mode === '2d' ? 'default' : 'ghost'}
          className="h-7 min-h-7 px-2 text-xs"
          aria-pressed={mode === '2d'}
          aria-label="2D-Bildvorschau anzeigen"
          data-item-workbench-visual-2d
          data-item-visual-mode="2d"
          onClick={() => onModeChange('2d')}
        >
          2D
        </Button>,
      )}
      {withTooltip(
        '3D-Modellvorschau anzeigen',
        <Button
          type="button"
          size="sm"
          variant={mode === '3d' ? 'default' : 'ghost'}
          className="h-7 min-h-7 px-2 text-xs"
          aria-pressed={mode === '3d'}
          aria-label="3D-Modellvorschau anzeigen"
          data-item-workbench-visual-3d
          data-item-visual-mode="3d"
          onClick={() => onModeChange('3d')}
        >
          3D
        </Button>,
      )}
    </div>
  );
}
