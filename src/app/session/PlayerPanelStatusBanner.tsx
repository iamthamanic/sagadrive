/**
 * PlayerPanelStatusBanner — Waiting / Paused / Disconnected / Error banner for Player Panel V1.
 * Location: src/app/session/PlayerPanelStatusBanner.tsx
 */
import { Button } from '../../shared/ui/button';
import type { PlayerPanelConnectionKind } from '../../domains/session/contracts/player-panel';

type PlayerPanelStatusBannerProps = {
  kind: PlayerPanelConnectionKind;
  label: string;
  detail: string | null;
  onResync?: () => void;
};

function toneClass(kind: PlayerPanelConnectionKind): string {
  switch (kind) {
    case 'ready':
      return 'border-primary/40 bg-primary/10 text-foreground';
    case 'waiting':
    case 'paused':
    case 'loading':
      return 'border-border bg-muted/60 text-foreground';
    case 'disconnected':
    case 'error':
    case 'completed':
      return 'border-destructive/40 bg-destructive/10 text-foreground';
  }
}

export function PlayerPanelStatusBanner({
  kind,
  label,
  detail,
  onResync,
}: PlayerPanelStatusBannerProps) {
  if (kind === 'ready') return null;

  return (
    <div
      className={`flex flex-wrap items-start justify-between gap-3 rounded-md border px-3 py-2 ${toneClass(kind)}`}
      role="status"
      data-player-panel-status={kind}
    >
      <div className="min-w-0 space-y-0.5">
        <p className="text-sm font-medium">{label}</p>
        {detail ? <p className="text-xs text-muted-foreground">{detail}</p> : null}
      </div>
      {(kind === 'disconnected' || kind === 'error') && onResync ? (
        <Button type="button" size="sm" variant="outline" onClick={onResync}>
          Erneut verbinden
        </Button>
      ) : null}
    </div>
  );
}
