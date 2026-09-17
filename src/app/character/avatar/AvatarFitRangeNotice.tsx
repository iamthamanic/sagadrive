/**
 * Compact DE warning for trait/wearable fit-range compatibility (#216).
 * Location: src/app/character/avatar/AvatarFitRangeNotice.tsx
 */
import type { AvatarFitCompatibilityResult } from '../../../domains/character/avatar';

interface AvatarFitRangeNoticeProps {
  result: AvatarFitCompatibilityResult;
}

export function AvatarFitRangeNotice({ result }: AvatarFitRangeNoticeProps) {
  if (result.status === 'ready' || !result.messageDe) return null;

  const tone =
    result.status === 'needs-review'
      ? 'border-amber-500/40 bg-amber-500/10 text-amber-100'
      : 'border-red-500/40 bg-red-500/10 text-red-100';

  return (
    <p
      className={`rounded-md border px-3 py-2 text-sm ${tone}`}
      data-testid="avatar-fit-range-notice"
      data-fit-status={result.status}
      role="status"
    >
      {result.messageDe}
    </p>
  );
}
