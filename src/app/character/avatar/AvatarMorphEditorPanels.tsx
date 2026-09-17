/**
 * Avatar morph body/face editor — capability-driven live controls from #212 metadata.
 * Location: src/app/character/avatar/AvatarMorphEditorPanels.tsx
 *
 * Does not invent morph rules; uses AVATAR_MORPH_PARAM_META + validateAvatarMorphInput.
 */
import { useEffect, useRef, useState } from 'react';
import {
  AVATAR_MORPH_BODY_META,
  AVATAR_MORPH_FACE_META,
  BASE_BODY_SPECIES_PRESETS,
  createDefaultAvatarMorphState,
  deriveSpeciesMorphState,
  validateAvatarMorphInput,
  type AvatarMorphBodyKey,
  type AvatarMorphCapabilityFlag,
  type AvatarMorphFaceKey,
  type AvatarMorphParamMeta,
  type BaseBodySpeciesId,
  type SagaDriveAvatarMorphStateV1,
} from '../../../domains/character/avatar';
import { Button } from '../../../shared/ui/button';
import { Label } from '../../../shared/ui/label';
import { Slider } from '../../../shared/ui/slider';

interface AvatarMorphEditorPanelsProps {
  morph: SagaDriveAvatarMorphStateV1;
  onMorphChange: (next: SagaDriveAvatarMorphStateV1) => void;
  capabilities: readonly AvatarMorphCapabilityFlag[];
  disabled?: boolean;
}

function MorphSliderRow({
  meta,
  value,
  disabled,
  onChange,
}: {
  meta: AvatarMorphParamMeta;
  value: number;
  disabled?: boolean;
  onChange: (value: number) => void;
}) {
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between gap-2">
        <Label htmlFor={`morph-${meta.key}`}>{meta.labelDe}</Label>
        <button
          type="button"
          className="btn btn-ghost btn-xs min-h-11 px-3"
          disabled={disabled || value === meta.default}
          onClick={() => onChange(meta.default)}
        >
          Reset
        </button>
      </div>
      <Slider
        id={`morph-${meta.key}`}
        aria-label={meta.labelDe}
        disabled={disabled}
        value={[value]}
        min={meta.min}
        max={meta.max}
        step={meta.step}
        onValueChange={(values) => onChange(values[0] ?? meta.default)}
      />
      <div className="flex justify-between text-xs text-muted-foreground">
        <span>{meta.min}</span>
        <span>{value.toFixed(2)}</span>
        <span>{meta.max}</span>
      </div>
    </div>
  );
}

export function AvatarMorphEditorPanels({
  morph,
  onMorphChange,
  capabilities,
  disabled = false,
}: AvatarMorphEditorPanelsProps) {
  const [speciesId, setSpeciesId] = useState<BaseBodySpeciesId>('human');
  const [pendingSpecies, setPendingSpecies] = useState<BaseBodySpeciesId | null>(null);
  const debounceRef = useRef<number | null>(null);
  const [draft, setDraft] = useState(morph);

  useEffect(() => {
    setDraft(morph);
  }, [morph]);

  const bodyEnabled = capabilities.includes('morph-body-v1');
  const faceEnabled = capabilities.includes('morph-face-v1');

  const publish = (next: SagaDriveAvatarMorphStateV1) => {
    setDraft(next);
    if (debounceRef.current != null) window.clearTimeout(debounceRef.current);
    debounceRef.current = window.setTimeout(() => {
      onMorphChange(validateAvatarMorphInput(next).state);
    }, 50);
  };

  const setBody = (key: AvatarMorphBodyKey, value: number) => {
    publish({ ...draft, body: { ...draft.body, [key]: value } });
  };
  const setFace = (key: AvatarMorphFaceKey, value: number) => {
    publish({ ...draft, face: { ...draft.face, [key]: value } });
  };

  if (!bodyEnabled && !faceEnabled) {
    return (
      <div
        className="rounded-lg border border-border bg-muted/30 p-4 text-sm text-muted-foreground"
        data-testid="avatar-morph-unsupported"
        role="status"
      >
        Dieses Modell unterstützt keine Body-/Face-Morphs. Slider bleiben ausgeblendet.
      </div>
    );
  }

  return (
    <div className="space-y-6" data-testid="avatar-morph-editor">
      <section className="space-y-3 rounded-lg border border-border p-4">
        <div className="flex flex-wrap items-end gap-3">
          <label className="form-control min-w-[12rem] flex-1">
            <span className="label-text">Species-Preset</span>
            <select
              className="select select-bordered min-h-11"
              value={speciesId}
              disabled={disabled}
              onChange={(event) => setSpeciesId(event.target.value as BaseBodySpeciesId)}
              data-testid="avatar-morph-species"
            >
              {BASE_BODY_SPECIES_PRESETS.map((preset) => (
                <option key={preset.id} value={preset.id}>
                  {preset.labelDe}
                </option>
              ))}
            </select>
          </label>
          <Button
            type="button"
            variant="outline"
            className="min-h-11"
            disabled={disabled}
            onClick={() => setPendingSpecies(speciesId)}
            data-testid="avatar-morph-species-apply"
          >
            Preset anwenden…
          </Button>
        </div>
        {pendingSpecies ? (
          <div
            className="flex flex-col gap-2 rounded-md border border-amber-500/40 bg-amber-500/10 p-3 sm:flex-row sm:items-center"
            role="alertdialog"
            aria-label="Species-Preset bestätigen"
          >
            <p className="flex-1 text-sm">
              Preset überschreibt Morph-Werte. Eigene Werte behalten?
            </p>
            <div className="flex flex-wrap gap-2">
              <Button
                type="button"
                className="min-h-11"
                onClick={() => {
                  publish(deriveSpeciesMorphState(pendingSpecies));
                  setPendingSpecies(null);
                }}
              >
                Preset anwenden
              </Button>
              <Button
                type="button"
                variant="outline"
                className="min-h-11"
                onClick={() => setPendingSpecies(null)}
              >
                Eigene Werte behalten
              </Button>
            </div>
          </div>
        ) : null}
      </section>

      {bodyEnabled ? (
        <section className="space-y-4" aria-labelledby="morph-body-heading">
          <div className="flex items-center justify-between gap-2">
            <h3 id="morph-body-heading" className="font-medium">
              Körper
            </h3>
            <Button
              type="button"
              variant="ghost"
              className="min-h-11"
              disabled={disabled}
              onClick={() =>
                publish({
                  ...draft,
                  body: createDefaultAvatarMorphState().body,
                })
              }
            >
              Körper reset
            </Button>
          </div>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            {AVATAR_MORPH_BODY_META.map((meta) => (
              <MorphSliderRow
                key={meta.key}
                meta={meta}
                value={draft.body[meta.key]}
                disabled={disabled}
                onChange={(value) => setBody(meta.key, value)}
              />
            ))}
          </div>
        </section>
      ) : null}

      {faceEnabled ? (
        <section className="space-y-4" aria-labelledby="morph-face-heading">
          <div className="flex items-center justify-between gap-2">
            <h3 id="morph-face-heading" className="font-medium">
              Gesicht
            </h3>
            <Button
              type="button"
              variant="ghost"
              className="min-h-11"
              disabled={disabled}
              onClick={() =>
                publish({
                  ...draft,
                  face: createDefaultAvatarMorphState().face,
                })
              }
            >
              Gesicht reset
            </Button>
          </div>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            {AVATAR_MORPH_FACE_META.map((meta) => (
              <MorphSliderRow
                key={meta.key}
                meta={meta}
                value={draft.face[meta.key]}
                disabled={disabled}
                onChange={(value) => setFace(meta.key, value)}
              />
            ))}
          </div>
        </section>
      ) : null}

      <section className="space-y-3" aria-labelledby="morph-colors-heading">
        <h3 id="morph-colors-heading" className="font-medium">
          Farben
        </h3>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          {(
            [
              ['skin', 'Haut'],
              ['eyes', 'Augen'],
              ['hair', 'Haare'],
            ] as const
          ).map(([key, label]) => (
            <label key={key} className="flex min-h-11 items-center gap-3">
              <span className="w-16 text-sm">{label}</span>
              <input
                type="color"
                className="h-11 w-16 cursor-pointer rounded border border-border bg-transparent"
                value={draft.colors[key]}
                disabled={disabled}
                aria-label={label}
                onChange={(event) =>
                  publish({
                    ...draft,
                    colors: { ...draft.colors, [key]: event.target.value.toUpperCase() },
                  })
                }
              />
            </label>
          ))}
        </div>
      </section>

      <Button
        type="button"
        variant="destructive"
        className="min-h-11"
        disabled={disabled}
        data-testid="avatar-morph-reset-all"
        onClick={() => {
          if (window.confirm('Gesamten Avatar-Morph auf Defaults zurücksetzen?')) {
            publish(createDefaultAvatarMorphState());
          }
        }}
      >
        Avatar-Morph komplett zurücksetzen
      </Button>
    </div>
  );
}
