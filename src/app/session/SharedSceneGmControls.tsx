/**
 * SharedSceneGmControls — GM form to publish shared scene presentation (#301).
 * Location: src/app/session/SharedSceneGmControls.tsx
 */
import { useEffect, useState } from 'react';
import {
  SCENE_PRESENTATION_PRESETS,
  emptySharedScenePresentationDraft,
  type SharedScenePresentation,
  type SharedScenePresentationCommandInput,
  type SceneVisibleActor,
} from '../../domains/session/contracts/shared-scene-presentation';
import { Button } from '../../shared/ui/button';
import { Input } from '../../shared/ui/input';
import { Label } from '../../shared/ui/label';
import { Textarea } from '../../shared/ui/textarea';
import { SharedScenePresentationView } from './SharedScenePresentationView';

type SharedSceneGmControlsProps = {
  presentation: SharedScenePresentation | null;
  isBusy: boolean;
  error: string | null;
  onPublish: (input: SharedScenePresentationCommandInput) => Promise<boolean>;
};

function presentationToDraft(
  presentation: SharedScenePresentation | null,
): SharedScenePresentationCommandInput {
  if (!presentation) return emptySharedScenePresentationDraft();
  return {
    title: presentation.title,
    locationLabel: presentation.locationLabel,
    description: presentation.description,
    backdropUrl: presentation.backdropUrl,
    sceneId: presentation.sceneRef?.id ?? null,
    sceneRef: presentation.sceneRef,
    visibleActors: [...presentation.visibleActors],
  };
}

export function SharedSceneGmControls({
  presentation,
  isBusy,
  error,
  onPublish,
}: SharedSceneGmControlsProps) {
  const [draft, setDraft] = useState<SharedScenePresentationCommandInput>(() =>
    presentationToDraft(presentation),
  );
  const [actorName, setActorName] = useState('');
  const [actorRole, setActorRole] = useState<'pc' | 'npc' | 'creature' | 'other'>('npc');
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    setDraft(presentationToDraft(presentation));
  }, [presentation]);

  const applyPreset = (presetId: string) => {
    const preset = SCENE_PRESENTATION_PRESETS.find((p) => p.id === presetId);
    if (!preset) return;
    setDraft((prev) => ({
      ...prev,
      title: preset.title,
      locationLabel: preset.locationLabel,
      description: preset.description,
      sceneId: preset.id,
      sceneRef: { kind: 'session-local', id: preset.id },
    }));
  };

  const addActor = () => {
    const name = actorName.trim();
    if (!name) return;
    const next: SceneVisibleActor = {
      kind: actorRole === 'pc' ? 'character' : actorRole === 'creature' ? 'creature' : 'npc',
      id: null,
      publicId: null,
      displayName: name.slice(0, 80),
      portraitUrl: null,
      role: actorRole,
    };
    setDraft((prev) => ({
      ...prev,
      visibleActors: [...prev.visibleActors, next].slice(0, 24),
    }));
    setActorName('');
  };

  const removeActor = (index: number) => {
    setDraft((prev) => ({
      ...prev,
      visibleActors: prev.visibleActors.filter((_, i) => i !== index),
    }));
  };

  const publish = async () => {
    setMessage(null);
    const ok = await onPublish(draft);
    setMessage(ok ? 'Szene für alle veröffentlicht.' : 'Szene konnte nicht veröffentlicht werden.');
  };

  return (
    <div className="space-y-4" data-shared-scene-gm="v1">
      <div>
        <h4 className="mb-2 text-sm md:text-base">Gemeinsame Szene veröffentlichen</h4>
        <p className="mb-3 text-xs text-muted-foreground">
          Titel, Ort, Backdrop und sichtbare Figuren — alle Spieler sehen denselben Kontext live.
        </p>
        <div className="mb-3 grid grid-cols-2 gap-2 md:grid-cols-3">
          {SCENE_PRESENTATION_PRESETS.map((preset) => (
            <Button
              key={preset.id}
              type="button"
              variant="outline"
              size="sm"
              className="h-auto justify-start py-2 text-left text-xs"
              onClick={() => applyPreset(preset.id)}
              disabled={isBusy}
            >
              {preset.locationLabel}
            </Button>
          ))}
        </div>
      </div>

      <div className="grid gap-3">
        <div className="space-y-1">
          <Label htmlFor="scene-title">Titel</Label>
          <Input
            id="scene-title"
            value={draft.title}
            onChange={(e) => setDraft((prev) => ({ ...prev, title: e.target.value }))}
            maxLength={120}
            placeholder="z. B. Dunkler Wald"
            disabled={isBusy}
          />
        </div>
        <div className="space-y-1">
          <Label htmlFor="scene-location">Ort</Label>
          <Input
            id="scene-location"
            value={draft.locationLabel ?? ''}
            onChange={(e) =>
              setDraft((prev) => ({
                ...prev,
                locationLabel: e.target.value.trim() === '' ? null : e.target.value,
              }))
            }
            maxLength={120}
            placeholder="Kurzlabel"
            disabled={isBusy}
          />
        </div>
        <div className="space-y-1">
          <Label htmlFor="scene-description">Beschreibung</Label>
          <Textarea
            id="scene-description"
            value={draft.description ?? ''}
            onChange={(e) =>
              setDraft((prev) => ({
                ...prev,
                description: e.target.value.trim() === '' ? null : e.target.value,
              }))
            }
            rows={3}
            maxLength={500}
            placeholder="Kurzer sichtbarer Kontext"
            disabled={isBusy}
          />
        </div>
        <div className="space-y-1">
          <Label htmlFor="scene-backdrop">Backdrop-URL (http/https)</Label>
          <Input
            id="scene-backdrop"
            value={draft.backdropUrl ?? ''}
            onChange={(e) =>
              setDraft((prev) => ({
                ...prev,
                backdropUrl: e.target.value.trim() === '' ? null : e.target.value,
              }))
            }
            maxLength={2048}
            placeholder="https://…"
            disabled={isBusy}
          />
        </div>
      </div>

      <div className="space-y-2">
        <Label>Sichtbare Figuren</Label>
        <div className="flex flex-wrap gap-2">
          <Input
            value={actorName}
            onChange={(e) => setActorName(e.target.value)}
            placeholder="Name"
            className="min-w-[10rem] flex-1"
            maxLength={80}
            disabled={isBusy}
          />
          <select
            className="h-9 rounded-md border border-input bg-background px-2 text-sm"
            value={actorRole}
            onChange={(e) =>
              setActorRole(e.target.value as 'pc' | 'npc' | 'creature' | 'other')
            }
            disabled={isBusy}
            aria-label="Rollenart"
          >
            <option value="pc">PC</option>
            <option value="npc">NPC</option>
            <option value="creature">Kreatur</option>
            <option value="other">Andere</option>
          </select>
          <Button type="button" variant="secondary" size="sm" onClick={addActor} disabled={isBusy}>
            Hinzufügen
          </Button>
        </div>
        {draft.visibleActors.length > 0 ? (
          <ul className="space-y-1">
            {draft.visibleActors.map((actor, index) => (
              <li
                key={`${actor.displayName}-${index}`}
                className="flex items-center justify-between rounded-md border border-border px-2 py-1 text-sm"
              >
                <span>
                  {actor.displayName}
                  {' '}
                  <span className="text-xs text-muted-foreground">({actor.role})</span>
                </span>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => removeActor(index)}
                  disabled={isBusy}
                >
                  Entfernen
                </Button>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-xs text-muted-foreground">Keine Figuren markiert.</p>
        )}
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <Button type="button" onClick={() => void publish()} disabled={isBusy || !draft.title.trim()}>
          {isBusy ? 'Wird veröffentlicht…' : 'Szene veröffentlichen'}
        </Button>
        {message ? <p className="text-sm text-muted-foreground">{message}</p> : null}
        {error ? <p className="text-sm text-destructive">{error}</p> : null}
      </div>

      <div className="border-t border-border pt-3">
        <p className="mb-2 text-xs uppercase tracking-wide text-muted-foreground">Vorschau (live)</p>
        <SharedScenePresentationView presentation={presentation} />
      </div>
    </div>
  );
}
