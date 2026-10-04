/**
 * ProgramDisplayShell — fullscreen-safe 16:9 Program Output surface (#365).
 * Location: src/app/session/program/ProgramDisplayShell.tsx
 *
 * No navigation chrome, no private controls, no debug UI.
 */
import type { ProgramPresentationReadModel } from '../../../domains/session/presentation/program-presentation';
import { ProgramOutputView } from './ProgramOutputView';

type ProgramDisplayShellProps = {
  readModel: ProgramPresentationReadModel | null;
  isLoading?: boolean;
  error?: string | null;
};

export function ProgramDisplayShell({
  readModel,
  isLoading = false,
  error = null,
}: ProgramDisplayShellProps) {
  const layout = readModel?.program.layout.kind ?? 'fullscreen-16x9';

  return (
    <div
      className="flex h-full min-h-0 w-full items-center justify-center bg-background"
      data-program-display="v1"
      data-session-display="v1"
      aria-label="Program Output"
    >
      <div
        className={
          layout === 'letterbox'
            ? 'aspect-video h-auto max-h-full w-full max-w-[100vw] overflow-hidden bg-muted/30'
            : 'aspect-video h-full max-h-full w-full max-w-[min(100vw,calc(100vh*16/9))] overflow-hidden bg-muted/20'
        }
        data-program-stage
      >
        <ProgramOutputView
          readModel={readModel}
          isLoading={isLoading}
          error={error}
        />
      </div>
    </div>
  );
}
