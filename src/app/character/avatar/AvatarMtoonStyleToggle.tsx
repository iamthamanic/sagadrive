/**
 * AvatarMtoonStyleToggle — viewport overlay to compare SagaDrive MToon vs raw PBR.
 * Location: src/app/character/avatar/AvatarMtoonStyleToggle.tsx
 *
 * Editor-only; state is runtime-ephemeral (not saved on appearance.avatar).
 */
import { Button } from '../../../shared/ui/button';

interface AvatarMtoonStyleToggleProps {
  enabled: boolean;
  disabled?: boolean;
  onChange: (enabled: boolean) => void;
}

export function AvatarMtoonStyleToggle({
  enabled,
  disabled,
  onChange,
}: AvatarMtoonStyleToggleProps) {
  return (
    <div
      className="pointer-events-auto absolute right-3 top-3 z-[2]"
      data-avatar-mtoon-toggle-host="true"
    >
      <Button
        type="button"
        size="sm"
        variant={enabled ? 'default' : 'outline'}
        disabled={disabled}
        aria-pressed={enabled}
        aria-label={enabled ? 'MToon-Stil ausschalten' : 'MToon-Stil einschalten'}
        title={enabled ? 'MToon an — tippen für Rohvorschau' : 'MToon aus — tippen für Stil'}
        onClick={() => onChange(!enabled)}
        data-testid="avatar-mtoon-toggle"
        className="h-8 border-white/15 bg-black/50 px-2.5 text-[11px] text-slate-100 backdrop-blur-sm hover:bg-black/65"
      >
        {enabled ? 'MToon an' : 'MToon aus'}
      </Button>
    </div>
  );
}
