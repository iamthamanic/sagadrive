/**
 * ProgramOutputView — control-free Program Output composition (#365).
 * Location: src/app/session/program/ProgramOutputView.tsx
 */
import type { ProgramPresentationReadModel } from '../../../domains/session/presentation/program-presentation';
import { SharedScenePresentationView } from '../SharedScenePresentationView';

type ProgramOutputViewProps = {
  readModel: ProgramPresentationReadModel | null;
  isLoading?: boolean;
  error?: string | null;
};

/**
 * Renders presentation-safe program content only (no private controls).
 */
export function ProgramOutputView({
  readModel,
  isLoading = false,
  error = null,
}: ProgramOutputViewProps) {
  if (isLoading) {
    return (
      <div
        className="flex h-full items-center justify-center text-sm text-muted-foreground"
        data-program-output="loading"
        role="status"
      >
        Program wird geladen…
      </div>
    );
  }

  if (error) {
    return (
      <div
        className="flex h-full items-center justify-center px-6 text-center text-sm text-muted-foreground"
        data-program-output="error"
        role="alert"
      >
        Verbindung unterbrochen. Anzeige wird neu synchronisiert…
      </div>
    );
  }

  if (!readModel) {
    return (
      <div
        className="flex h-full items-center justify-center text-sm text-muted-foreground"
        data-program-output="empty"
      >
        Kein Program Output
      </div>
    );
  }

  const { program, scene, status } = readModel;

  return (
    <div
      className="relative flex h-full min-h-0 flex-col"
      data-program-output="v1"
      data-program-status={status}
      data-program-source={program.source.kind}
      data-program-layout={program.layout.kind}
      data-program-revision={String(program.programRevision)}
    >
      {program.overlay?.kind === 'title' ? (
        <p
          className="pointer-events-none absolute left-4 top-4 z-10 max-w-[80%] truncate text-sm font-medium text-foreground/90 drop-shadow"
          data-program-overlay="title"
        >
          {program.overlay.text}
        </p>
      ) : null}

      {program.source.kind === 'look' ? (
        <div
          className="flex h-full items-center justify-center px-6 text-center text-sm text-muted-foreground"
          data-program-fallback="look-neutral"
        >
          Look-Quelle noch nicht verfügbar — neutrale Anzeige
        </div>
      ) : null}

      {program.source.kind === 'neutral' ? (
        <div
          className="flex h-full items-center justify-center text-sm text-muted-foreground"
          data-program-source-neutral
        >
          Program bereit
        </div>
      ) : null}

      {program.source.kind === 'shared-scene' ? (
        <div className="min-h-0 flex-1 overflow-y-auto p-4 md:p-8">
          <SharedScenePresentationView presentation={scene} />
        </div>
      ) : null}
    </div>
  );
}
