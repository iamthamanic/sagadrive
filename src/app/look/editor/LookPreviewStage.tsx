/**
 * LookPreviewStage — Reusable Look comparison harness (#345).
 * Location: src/app/look/editor/LookPreviewStage.tsx
 *
 * Modes: Normal / PBR Neutral / Before-After / Variant Grid.
 * Shared camera presets across compares; fixtures degrade when missing.
 */
import { useEffect, useMemo, useRef, useState } from 'react';
import type { LookProfileVersion } from '../../../domains/look/types';
import type { CharacterStudioRuntime } from '../../../infrastructure/character/avatar/character-studio-runtime';
import { Button } from '../../../shared/ui/button';
import { AvatarCanvas } from '../../character/avatar/AvatarCanvas';
import type { LookEditorUiDraft } from './look-editor-draft';
import { lookPreviewAvatarFromModelUrl } from './look-preview-avatar';
import {
  getLookPreviewFixture,
  listLookPreviewFixtures,
  type LookPreviewFixtureId,
} from './look-preview-fixtures';
import {
  LOOK_PREVIEW_CAMERA_LABELS,
  LOOK_PREVIEW_CAMERAS,
  LOOK_PREVIEW_MODE_LABELS,
  LOOK_PREVIEW_MODES,
  lookPreviewCameraToAvatarFrame,
  type LookPreviewCameraId,
  type LookPreviewMode,
} from './look-preview-modes';
import { ephemeralLookVersionFromDraft } from './look-preview-version';

export type LookPreviewStageProps = {
  draft: LookEditorUiDraft;
  baseline: LookEditorUiDraft;
  versions: readonly LookProfileVersion[];
  displayName: string;
  versionLabel: string;
};

function variantCandidates(
  draft: LookEditorUiDraft,
  baseline: LookEditorUiDraft,
  versions: readonly LookProfileVersion[],
): { id: string; label: string; version: LookProfileVersion }[] {
  const draftVer = ephemeralLookVersionFromDraft(draft, 'look-preview-draft');
  const baseVer = ephemeralLookVersionFromDraft(baseline, 'look-preview-baseline');
  const fromHistory = [...versions]
    .sort((a, b) => b.version - a.version)
    .slice(0, 2)
    .map((v) => ({
      id: `v-${v.version}`,
      label: `Version ${v.version}`,
      version: v,
    }));
  return [
    { id: 'draft', label: 'Entwurf', version: draftVer },
    { id: 'baseline', label: 'Gespeichert', version: baseVer },
    ...fromHistory,
  ].slice(0, 3);
}

export function LookPreviewStage({
  draft,
  baseline,
  versions,
  displayName,
  versionLabel,
}: LookPreviewStageProps) {
  const [mode, setMode] = useState<LookPreviewMode>('normal');
  const [camera, setCamera] = useState<LookPreviewCameraId>('fullBody');
  const [fixtureId, setFixtureId] = useState<LookPreviewFixtureId>('playerHumanoid');
  const [notice, setNotice] = useState<string | null>(null);
  const [selectedVariantId, setSelectedVariantId] = useState('draft');
  const [captureBusy, setCaptureBusy] = useState(false);
  const studioRef = useRef<CharacterStudioRuntime | null>(null);
  const afterStudioRef = useRef<CharacterStudioRuntime | null>(null);

  const fixtures = useMemo(() => listLookPreviewFixtures(), []);
  const activeFixture = getLookPreviewFixture(fixtureId) ?? fixtures[0];
  const avatar = useMemo(() => {
    if (!activeFixture?.modelUrl || !activeFixture.supported) return null;
    return lookPreviewAvatarFromModelUrl(activeFixture.modelUrl);
  }, [activeFixture]);

  const variants = useMemo(
    () => variantCandidates(draft, baseline, versions),
    [draft, baseline, versions],
  );
  const selectedVariant =
    variants.find((v) => v.id === selectedVariantId) ?? variants[0];

  const applyLookToStudio = (
    studio: CharacterStudioRuntime | null,
    version: LookProfileVersion,
    asNeutral: boolean,
  ) => {
    if (!studio) return;
    const mapped = lookPreviewCameraToAvatarFrame(camera);
    studio.applyCameraFrame(mapped.frame);
    const result = asNeutral
      ? studio.restorePbrNeutralLook()
      : studio.applyLookProfile(version);
    if (result.noticeDe) setNotice(result.noticeDe);
    else if (mapped.noticeDe) setNotice(mapped.noticeDe);
    else if (activeFixture && !activeFixture.supported) setNotice(activeFixture.noticeDe);
    else setNotice(null);
  };

  useEffect(() => {
    if (mode === 'pbrNeutral') {
      applyLookToStudio(studioRef.current, selectedVariant.version, true);
      return;
    }
    if (mode === 'beforeAfter') {
      applyLookToStudio(studioRef.current, selectedVariant.version, true);
      applyLookToStudio(afterStudioRef.current, selectedVariant.version, false);
      return;
    }
    applyLookToStudio(studioRef.current, selectedVariant.version, false);
  }, [mode, camera, fixtureId, selectedVariant, activeFixture]);

  const onRuntimeReady = () => {
    if (mode === 'pbrNeutral') {
      applyLookToStudio(studioRef.current, selectedVariant.version, true);
    } else if (mode === 'beforeAfter') {
      applyLookToStudio(studioRef.current, selectedVariant.version, true);
      applyLookToStudio(afterStudioRef.current, selectedVariant.version, false);
    } else {
      applyLookToStudio(studioRef.current, selectedVariant.version, false);
    }
  };

  const captureThumbnail = () => {
    if (captureBusy) return;
    setCaptureBusy(true);
    try {
      const studio = studioRef.current;
      if (!studio) {
        setNotice('Preview noch nicht bereit — Capture übersprungen.');
        return;
      }
      const dataUrl = studio.capturePortraitDataUrl();
      if (!dataUrl) {
        setNotice('Capture während Laden nicht möglich — bitte warten.');
        return;
      }
      setNotice('Preview-Thumbnail erfasst (Hook bereit).');
    } finally {
      setCaptureBusy(false);
    }
  };

  const showSplit = mode === 'beforeAfter';
  const showGrid = mode === 'variantGrid';

  return (
    <div
      className="flex h-full min-h-0 flex-col gap-2 p-2"
      data-look-preview-stage="v1"
      data-look-preview-mode={mode}
      data-look-preview-camera={camera}
    >
      <div className="flex flex-wrap items-center gap-2">
        <p className="min-w-0 flex-1 truncate text-sm font-medium">
          {displayName || 'Look-Vorschau'}
          <span className="ml-2 text-xs font-normal text-muted-foreground">{versionLabel}</span>
        </p>
        <Button
          type="button"
          variant="outline"
          className="min-h-11"
          disabled={captureBusy}
          onClick={captureThumbnail}
          data-look-preview-capture
        >
          Thumbnail
        </Button>
      </div>

      <div
        className="flex flex-wrap gap-1"
        role="toolbar"
        aria-label="Vergleichsmodus"
        data-look-preview-modes
      >
        {LOOK_PREVIEW_MODES.map((id) => (
          <Button
            key={id}
            type="button"
            variant={mode === id ? 'default' : 'ghost'}
            className="min-h-11"
            aria-pressed={mode === id}
            data-look-preview-mode-btn={id}
            onClick={() => setMode(id)}
          >
            {LOOK_PREVIEW_MODE_LABELS[id]}
          </Button>
        ))}
      </div>

      <div
        className="flex flex-wrap gap-1"
        role="toolbar"
        aria-label="Kamerapreset"
        data-look-preview-cameras
      >
        {LOOK_PREVIEW_CAMERAS.map((id) => (
          <Button
            key={id}
            type="button"
            variant={camera === id ? 'default' : 'ghost'}
            className="min-h-11"
            aria-pressed={camera === id}
            data-look-preview-camera-btn={id}
            onClick={() => setCamera(id)}
          >
            {LOOK_PREVIEW_CAMERA_LABELS[id]}
          </Button>
        ))}
      </div>

      <div
        className="flex gap-1 overflow-x-auto pb-1"
        role="list"
        aria-label="Preview-Fixtures"
        data-look-preview-fixtures
      >
        {fixtures.map((slot) => (
          <button
            key={slot.id}
            type="button"
            role="listitem"
            className={`min-h-11 shrink-0 rounded-md border px-3 text-left text-xs ${
              fixtureId === slot.id ? 'border-primary bg-muted' : 'border-border'
            } ${slot.supported ? '' : 'opacity-70'}`}
            data-look-preview-fixture={slot.id}
            data-look-preview-fixture-supported={slot.supported ? 'true' : 'false'}
            onClick={() => {
              setFixtureId(slot.id);
              if (!slot.supported) setNotice(slot.noticeDe);
            }}
          >
            <span className="block font-medium">{slot.labelDe}</span>
            {!slot.supported ? (
              <span className="text-muted-foreground">{slot.noticeDe ?? 'Nicht verfügbar'}</span>
            ) : null}
          </button>
        ))}
      </div>

      {notice ? (
        <p className="text-xs text-muted-foreground" role="status" data-look-preview-notice>
          {notice}
        </p>
      ) : null}

      {showGrid ? (
        <div
          className="grid grid-cols-1 gap-2 sm:grid-cols-3"
          data-look-preview-variant-grid
        >
          {variants.map((cell) => (
            <button
              key={cell.id}
              type="button"
              className={`min-h-11 rounded-md border p-3 text-left ${
                selectedVariantId === cell.id ? 'border-primary' : 'border-border'
              }`}
              data-look-preview-variant={cell.id}
              onClick={() => {
                setSelectedVariantId(cell.id);
                setMode('normal');
              }}
            >
              <p className="text-sm font-medium">{cell.label}</p>
              <p className="truncate text-xs text-muted-foreground">{cell.version.displayName}</p>
              <span className="mt-2 inline-block text-xs text-muted-foreground">
                Tippen → als aktive Vorschau
              </span>
            </button>
          ))}
        </div>
      ) : null}

      <div
        className={`relative min-h-0 flex-1 overflow-hidden rounded-md border border-border bg-muted/20 ${
          showSplit ? 'grid grid-cols-1 md:grid-cols-2' : ''
        }`}
        data-look-preview-viewport
      >
        {!avatar ? (
          <div className="flex h-full min-h-[200px] items-center justify-center p-4 text-center text-sm text-muted-foreground">
            {activeFixture?.noticeDe ??
              'Keine renderbare Fixture für diesen Slot — Stage bleibt stabil.'}
          </div>
        ) : showSplit ? (
          <>
            <div className="relative min-h-[200px] border-b border-border md:border-b-0 md:border-r" data-look-preview-pane="before">
              <p className="absolute left-2 top-2 z-10 rounded bg-background/80 px-2 py-1 text-xs">
                PBR Neutral
              </p>
              <AvatarCanvas
                avatar={avatar}
                controlMode="live"
                hideMtoonToggle
                studioRuntimeRef={studioRef}
                initialCameraFrame={lookPreviewCameraToAvatarFrame(camera).frame}
                onRuntimeReady={onRuntimeReady}
                className="h-full"
              />
            </div>
            <div className="relative min-h-[200px]" data-look-preview-pane="after">
              <p className="absolute left-2 top-2 z-10 rounded bg-background/80 px-2 py-1 text-xs">
                Look (Normal)
              </p>
              <AvatarCanvas
                avatar={avatar}
                controlMode="live"
                hideMtoonToggle
                studioRuntimeRef={afterStudioRef}
                initialCameraFrame={lookPreviewCameraToAvatarFrame(camera).frame}
                onRuntimeReady={onRuntimeReady}
                className="h-full"
              />
            </div>
          </>
        ) : (
          <AvatarCanvas
            avatar={avatar}
            controlMode="live"
            hideMtoonToggle
            studioRuntimeRef={studioRef}
            initialCameraFrame={lookPreviewCameraToAvatarFrame(camera).frame}
            onRuntimeReady={onRuntimeReady}
            className="h-full min-h-[240px]"
          />
        )}
      </div>
    </div>
  );
}
