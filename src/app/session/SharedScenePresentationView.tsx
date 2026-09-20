/**
 * SharedScenePresentationView — Read-only shared scene context for players/display (#301).
 * Location: src/app/session/SharedScenePresentationView.tsx
 */
import type { SharedScenePresentation } from '../../domains/session/contracts/shared-scene-presentation';

type SharedScenePresentationViewProps = {
  presentation: SharedScenePresentation | null;
  sceneIdFallback?: string | null;
  compact?: boolean;
};

export function SharedScenePresentationView({
  presentation,
  sceneIdFallback = null,
  compact = false,
}: SharedScenePresentationViewProps) {
  if (!presentation) {
    return (
      <section
        aria-label="Gemeinsame Szene"
        className="rounded-md border border-dashed border-border px-3 py-3 text-sm text-muted-foreground"
        data-shared-scene="empty"
      >
        Noch keine gemeinsame Szene gesetzt
        {sceneIdFallback ? ` (ID: ${sceneIdFallback})` : ''}.
      </section>
    );
  }

  return (
    <section
      aria-label="Gemeinsame Szene"
      className={compact ? 'space-y-2' : 'space-y-3'}
      data-shared-scene="v1"
      data-scene-title={presentation.title}
    >
      {presentation.backdropUrl ? (
        <div className="overflow-hidden rounded-md border border-border bg-muted">
          <img
            src={presentation.backdropUrl}
            alt=""
            className={compact ? 'h-28 w-full object-cover' : 'h-40 w-full object-cover md:h-52'}
            loading="lazy"
            referrerPolicy="no-referrer"
          />
        </div>
      ) : null}

      <div className="space-y-1">
        <h2 className={compact ? 'text-lg font-semibold' : 'text-xl font-semibold'}>
          {presentation.title}
        </h2>
        {presentation.locationLabel ? (
          <p className="text-sm text-muted-foreground" data-scene-location>
            Ort: {presentation.locationLabel}
          </p>
        ) : null}
        {presentation.description ? (
          <p className="text-sm text-foreground/90" data-scene-description>
            {presentation.description}
          </p>
        ) : null}
      </div>

      {presentation.visibleActors.length > 0 ? (
        <div className="space-y-2">
          <h3 className="text-sm font-medium text-foreground">Sichtbar in der Szene</h3>
          <ul className="grid grid-cols-1 gap-2 sm:grid-cols-2" data-scene-actors>
            {presentation.visibleActors.map((actor) => (
              <li
                key={`${actor.kind}:${actor.publicId ?? actor.id ?? actor.displayName}`}
                className="flex items-center gap-2 rounded-md border border-border px-2 py-2"
              >
                <div className="h-9 w-9 shrink-0 overflow-hidden rounded-md bg-muted">
                  {actor.portraitUrl ? (
                    <img
                      src={actor.portraitUrl}
                      alt=""
                      className="h-full w-full object-cover"
                      loading="lazy"
                      referrerPolicy="no-referrer"
                    />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center text-[10px] text-muted-foreground">
                      {actor.role === 'pc' ? 'PC' : actor.role === 'npc' ? 'NPC' : '·'}
                    </div>
                  )}
                </div>
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium">{actor.displayName}</p>
                  <p className="text-[11px] uppercase tracking-wide text-muted-foreground">
                    {actor.role}
                  </p>
                </div>
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </section>
  );
}
