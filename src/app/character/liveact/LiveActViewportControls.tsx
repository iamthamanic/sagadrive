/**
 * LiveActViewportControls — editor viewport chrome host for LiveAct gear + PiP (#330/#420).
 * Location: src/app/character/liveact/LiveActViewportControls.tsx
 *
 * Overlay chrome (settings / markers / PiP) sits on the canvas.
 * Face Mapping panel portals into a host below the AvatarCanvas.
 */

import { useCallback, useEffect, useRef, useState, type RefObject } from 'react';
import { createPortal } from 'react-dom';
import type { LiveActCapabilitiesV1 } from '../../../domains/character/liveact';
import {
  SAGA_DRIVE_FACE_ANCHOR_IDS,
  type SagaDriveFaceAnchorId,
  type SagaDriveFaceAnchorTriangleBinding,
  type SagaDriveFaceAnchorsManifestV1,
} from '../../../domains/character/avatar/face-anchor-contract';
import {
  clearFaceMappingDraftBinding,
  createEmptyFaceMappingDraft,
  faceMappingDraftToManifest,
  resetFaceMappingDraft,
  selectFaceMappingAnchor,
  setFaceMappingDraftBinding,
  validateFaceMappingDraft,
  type FaceMappingDraftValidationResult,
  type SagaDriveFaceMappingDraftV1,
} from '../../../domains/character/avatar/face-mapping-draft-v1';
import {
  applyAutoMappingToDraft,
  clearFaceMappingAuthoringMetaForAnchor,
  createEmptyAnchorAuthoringMeta,
  freezeFaceMappingGroundTruthReference,
  isProtectedFaceMappingAnchor,
  markAllBoundFaceMappingAnchorsAsReviewedManual,
  markFaceMappingAnchorManual,
  stringifyFaceMappingCompareExport,
  type FaceMappingAutoSessionResultV1,
  type FaceMappingDraftAuthoringMeta,
  type FaceMappingGroundTruthReferenceV1,
} from '../../../domains/character/avatar/face-mapping-auto-v1';
import type { CharacterStudioRuntime } from '../../../infrastructure/character/avatar/character-studio-runtime';
import { runFaceMappingAutoPipeline } from '../../../infrastructure/character/avatar/face-mapping-auto-pipeline';
import { createMediaPipeFaceImageLandmarker } from '../../../infrastructure/character/liveact/mediapipe-face-image-landmarker';
import { AvatarPreviewSettings } from '../avatar/AvatarPreviewSettings';
import { Button } from '../../../shared/ui/button';
import {
  FaceMappingAuthoringPanel,
  type FaceMappingAutoCoordV1,
  type FaceMappingManualCoordV1,
} from './FaceMappingAuthoringPanel';
import {
  FaceMappingMarkerLayer,
  type FaceMappingOverlayViewMode,
} from './FaceMappingMarkerLayer';
import { LiveActCameraPreview } from './LiveActCameraPreview';
import { LiveActCharacterFaceOverlay } from './LiveActCharacterFaceOverlay';
import type { UseLiveActViewportResult } from './useLiveActViewport';

function meshLabelFromBinding(binding: SagaDriveFaceAnchorTriangleBinding): string {
  const node = binding.nodeIdentity.trim() || '?';
  return `${node}/t${binding.triangleIndex}`;
}

function autoCoordsFromSession(
  session: FaceMappingAutoSessionResultV1,
): Partial<Record<SagaDriveFaceAnchorId, FaceMappingAutoCoordV1>> {
  const out: Partial<Record<SagaDriveFaceAnchorId, FaceMappingAutoCoordV1>> = {};
  for (const row of session.anchors) {
    out[row.anchorId] = {
      outcome: row.outcome,
      x: row.screenX,
      y: row.screenY,
      meshLabel: row.binding ? meshLabelFromBinding(row.binding) : row.meshNodeIdentity,
    };
  }
  return out;
}

function autoBindingsFromSession(
  session: FaceMappingAutoSessionResultV1,
): Partial<Record<SagaDriveFaceAnchorId, SagaDriveFaceAnchorTriangleBinding>> {
  const out: Partial<Record<SagaDriveFaceAnchorId, SagaDriveFaceAnchorTriangleBinding>> = {};
  for (const row of session.anchors) {
    if (row.binding && row.outcome === 'mapped') {
      out[row.anchorId] = row.binding;
    }
  }
  return out;
}

function projectManualCoords(
  runtime: CharacterStudioRuntime,
  draft: SagaDriveFaceMappingDraftV1,
): Partial<Record<SagaDriveFaceAnchorId, FaceMappingManualCoordV1>> {
  const out: Partial<Record<SagaDriveFaceAnchorId, FaceMappingManualCoordV1>> = {};
  for (const id of SAGA_DRIVE_FACE_ANCHOR_IDS) {
    const binding = draft.anchors[id];
    if (!binding) continue;
    const world = runtime.evaluateFaceMappingBindingWorld(binding, id);
    if (!world) continue;
    const screen = runtime.projectWorldToFaceMappingCanvas(world.x, world.y, world.z);
    if (!screen) continue;
    out[id] = {
      x: screen.x,
      y: screen.y,
      meshLabel: meshLabelFromBinding(binding),
    };
  }
  return out;
}

interface LiveActViewportControlsProps {
  runtimeReady: boolean;
  mtoonEnabled: boolean;
  onMtoonChange: (enabled: boolean) => void;
  liveAct: UseLiveActViewportResult;
  capabilities: LiveActCapabilitiesV1 | null;
  characterFaceMappingAvailable: boolean;
  studioRuntimeRef?: RefObject<CharacterStudioRuntime | null>;
  /** DOM host below AvatarCanvas for the Face Mapping panel. */
  faceMappingPanelHost?: HTMLElement | null;
  /**
   * Sticky strip above the canvas — gear portals here so it stays put while
   * scrolling Face Mapping / expand-dialog content.
   */
  settingsStickyHost?: HTMLElement | null;
  /** Open large face-framed 3D preview modal. */
  onExpandPreview?: () => void;
  /** Persist Face Mapping anchors on the character avatar (editor hook). */
  onFaceAnchorsCommitted?: (manifest: SagaDriveFaceAnchorsManifestV1) => void;
}

function faceMappingSaveBlockedMessage(validation: FaceMappingDraftValidationResult): string {
  if (validation.setCount === 0) {
    return 'Noch kein Punkt gesetzt — mindestens einen Face-Punkt am Mesh platzieren.';
  }
  return `${validation.invalidCount} Punkt(e) ungültig — neu setzen oder entfernen, dann speichern.`;
}

export function LiveActViewportControls({
  runtimeReady,
  mtoonEnabled,
  onMtoonChange,
  liveAct,
  capabilities,
  characterFaceMappingAvailable,
  studioRuntimeRef,
  faceMappingPanelHost = null,
  settingsStickyHost = null,
  onExpandPreview,
  onFaceAnchorsCommitted,
}: LiveActViewportControlsProps) {
  const [faceMappingOpen, setFaceMappingOpen] = useState(false);
  const [draft, setDraft] = useState<SagaDriveFaceMappingDraftV1 | null>(null);
  const [missMessage, setMissMessage] = useState<string | null>(null);
  const [autoBusy, setAutoBusy] = useState(false);
  const [autoStatusMessage, setAutoStatusMessage] = useState<string | null>(null);
  const [manualCoords, setManualCoords] = useState<
    Partial<Record<SagaDriveFaceAnchorId, FaceMappingManualCoordV1>>
  >({});
  const [autoCoords, setAutoCoords] = useState<
    Partial<Record<SagaDriveFaceAnchorId, FaceMappingAutoCoordV1>>
  >({});
  const [overlayViewMode, setOverlayViewMode] = useState<FaceMappingOverlayViewMode>('draft');
  const [groundTruthValid, setGroundTruthValid] = useState<boolean | null>(null);
  const [referenceStatus, setReferenceStatus] = useState<string | null>(null);
  const draftRef = useRef<SagaDriveFaceMappingDraftV1 | null>(null);
  const authoringMetaRef = useRef<FaceMappingDraftAuthoringMeta>({});
  const autoBindingsRef = useRef<Partial<
    Record<SagaDriveFaceAnchorId, SagaDriveFaceAnchorTriangleBinding>
  > | null>(null);
  const autoSessionTokenRef = useRef(0);
  const groundTruthReferenceRef = useRef<FaceMappingGroundTruthReferenceV1 | null>(null);
  const lastAutoSessionRef = useRef<FaceMappingAutoSessionResultV1 | null>(null);
  const faceMappingOpenRef = useRef(false);
  draftRef.current = draft;
  faceMappingOpenRef.current = faceMappingOpen;

  const closeFaceMapping = useCallback(() => {
    // Invalidate any in-flight auto session.
    autoSessionTokenRef.current += 1;
    studioRuntimeRef?.current?.setFaceMappingAuthoringActive(false);
    setFaceMappingOpen(false);
    setDraft(null);
    setMissMessage(null);
    setAutoBusy(false);
    setAutoStatusMessage(null);
    setManualCoords({});
    setAutoCoords({});
    setOverlayViewMode('draft');
    setGroundTruthValid(null);
    setReferenceStatus(null);
    autoBindingsRef.current = null;
    authoringMetaRef.current = {};
    groundTruthReferenceRef.current = null;
    lastAutoSessionRef.current = null;
  }, [studioRuntimeRef]);

  const applyFaceMapping = useCallback(() => {
    const runtime = studioRuntimeRef?.current;
    const current = draftRef.current;
    if (!runtime || !current) return;
    // An empty/invalid manifest would win over and suppress the asset sidecar anchors.
    const validation = validateFaceMappingDraft(current);
    if (!validation.ok) {
      console.warn('[face-mapping] Speichern blocked — draft not valid', validation);
      setMissMessage(faceMappingSaveBlockedMessage(validation));
      return;
    }
    const manifest = faceMappingDraftToManifest(current);
    runtime.bindFaceAnchorsManifestSession(manifest);
    // Authoring markers close; mesh overlay must take over immediately (no webcam required).
    liveAct.setFaceOverlayEnabled(true);
    onFaceAnchorsCommitted?.(manifest);
    closeFaceMapping();
    // Authoring forced debug off — turn sampling back on for the mesh overlay.
    runtime.setLiveActCharacterFaceDebugEnabled(true);
  }, [closeFaceMapping, liveAct, onFaceAnchorsCommitted, studioRuntimeRef]);

  const openFaceMapping = useCallback(() => {
    const runtime = studioRuntimeRef?.current;
    if (!runtime || !runtimeReady) return;
    liveAct.setTrackingEnabled(false);
    liveAct.setFaceOverlayEnabled(false);
    liveAct.setBonesEnabled(false);
    // Neutralize + frontal face frame (studio owns camera via applyCameraFrame('face')).
    runtime.setFaceMappingAuthoringActive(true);
    const baseline = runtime.getFaceAnchorsManifest();
    const next = createEmptyFaceMappingDraft(baseline);
    // Fail-closed: no getFaceMappingAuthoring sidecar — never invent reviewed GT.
    authoringMetaRef.current = createEmptyAnchorAuthoringMeta(next);
    autoSessionTokenRef.current = 0;
    groundTruthReferenceRef.current = null;
    lastAutoSessionRef.current = null;
    autoBindingsRef.current = null;
    setAutoCoords({});
    setGroundTruthValid(null);
    setReferenceStatus(null);
    setDraft(next);
    setMissMessage(null);
    setAutoStatusMessage(null);
    setOverlayViewMode('draft');
    setFaceMappingOpen(true);
  }, [liveAct, runtimeReady, studioRuntimeRef]);

  const runAutoMapping = useCallback(async () => {
    const runtime = studioRuntimeRef?.current;
    const seedDraft = draftRef.current;
    if (!runtime || !seedDraft || autoBusy) return;

    let protectedCount = 0;
    for (const id of SAGA_DRIVE_FACE_ANCHOR_IDS) {
      if (isProtectedFaceMappingAnchor(authoringMetaRef.current[id], seedDraft.anchors[id])) {
        protectedCount += 1;
      }
    }
    let replaceProtected = false;
    if (protectedCount > 0) {
      const ok = window.confirm(
        `${protectedCount} manuelle/reviewed Marker vorhanden.\n\nOK = Auto Mapping überschreibt sie (Replace).\nAbbrechen = nur leere/auto Marker füllen.`,
      );
      replaceProtected = ok;
    }

    autoSessionTokenRef.current += 1;
    const token = autoSessionTokenRef.current;

    // Freeze GT reference BEFORE async work — never use post-auto draft as manualScreen.
    groundTruthReferenceRef.current = freezeFaceMappingGroundTruthReference({
      draft: seedDraft,
      meta: authoringMetaRef.current,
      screenCoords: projectManualCoords(runtime, seedDraft),
    });
    setGroundTruthValid(groundTruthReferenceRef.current.validForGroundTruthComparison);
    setReferenceStatus(groundTruthReferenceRef.current.status);

    setAutoBusy(true);
    setMissMessage(null);
    setAutoStatusMessage('Auto Mapping läuft…');
    try {
      const landmarker = await createMediaPipeFaceImageLandmarker();
      if (!landmarker) {
        setAutoStatusMessage('MediaPipe IMAGE-Landmarker nicht verfügbar.');
        return;
      }
      try {
        const frame = runtime.captureFaceMappingAutoFrame();
        if (!frame) {
          setAutoStatusMessage('Character-Render für Auto Mapping fehlgeschlagen.');
          return;
        }
        const detected = landmarker.detect(frame.image);
        const session = runFaceMappingAutoPipeline({
          landmarks: detected.landmarks,
          faceCount: detected.faceCount,
          canvasWidth: frame.canvasWidth,
          canvasHeight: frame.canvasHeight,
          raycast: (x, y) => runtime.raycastFaceMappingAtCanvas(x, y),
        });

        if (
          token !== autoSessionTokenRef.current ||
          !faceMappingOpenRef.current ||
          !draftRef.current
        ) {
          setAutoStatusMessage('Auto Mapping verworfen');
          return;
        }

        const applied = applyAutoMappingToDraft(
          draftRef.current,
          session,
          authoringMetaRef.current,
          { replaceProtected },
        );
        authoringMetaRef.current = applied.meta;
        draftRef.current = applied.draft;
        setDraft(applied.draft);
        setAutoCoords(autoCoordsFromSession(session));
        autoBindingsRef.current = autoBindingsFromSession(session);
        lastAutoSessionRef.current = session;
        setOverlayViewMode('both');
        const skipNote =
          applied.skippedProtectedCount > 0
            ? ` · ${applied.skippedProtectedCount} manuelle geschützt`
            : '';
        setAutoStatusMessage(`${session.messageDe}${skipNote}`);
      } finally {
        landmarker.dispose();
      }
    } catch (error) {
      console.warn('[face-mapping-auto] failed', error);
      setAutoStatusMessage('Auto Mapping fehlgeschlagen — Details in der Konsole.');
    } finally {
      setAutoBusy(false);
    }
  }, [autoBusy, studioRuntimeRef]);

  const getCompareExportJson = useCallback(() => {
    return stringifyFaceMappingCompareExport({
      reference: groundTruthReferenceRef.current,
      autoSession: lastAutoSessionRef.current,
      draftAfter: draftRef.current ?? undefined,
      metaAfter: authoringMetaRef.current,
    });
  }, []);

  const onMarkAllReviewed = useCallback(() => {
    const current = draftRef.current;
    const runtime = studioRuntimeRef?.current;
    if (!current) return;
    const nowIso = new Date().toISOString();
    authoringMetaRef.current = markAllBoundFaceMappingAnchorsAsReviewedManual(
      authoringMetaRef.current,
      current,
      nowIso,
    );
    if (runtime) {
      groundTruthReferenceRef.current = freezeFaceMappingGroundTruthReference({
        draft: current,
        meta: authoringMetaRef.current,
        screenCoords: projectManualCoords(runtime, current),
        nowIso,
      });
      setGroundTruthValid(groundTruthReferenceRef.current.validForGroundTruthComparison);
      setReferenceStatus(groundTruthReferenceRef.current.status);
    }
  }, [studioRuntimeRef]);

  useEffect(() => {
    if (!faceMappingOpen) return;
    if (!runtimeReady) {
      closeFaceMapping();
    }
  }, [closeFaceMapping, faceMappingOpen, runtimeReady]);

  /** Keep manual screen coords in sync with draft + camera framing. */
  useEffect(() => {
    if (!faceMappingOpen || !draft) {
      setManualCoords({});
      return;
    }
    const refresh = () => {
      const runtime = studioRuntimeRef?.current;
      const current = draftRef.current;
      if (runtime && current) {
        setManualCoords(projectManualCoords(runtime, current));
      }
    };
    refresh();
    const timer = window.setInterval(refresh, 150);
    return () => window.clearInterval(timer);
  }, [draft, faceMappingOpen, studioRuntimeRef]);

  useEffect(() => {
    return () => {
      studioRuntimeRef?.current?.setFaceMappingAuthoringActive(false);
    };
  }, [studioRuntimeRef]);

  const onSelectAnchor = useCallback((anchorId: SagaDriveFaceAnchorId) => {
    setMissMessage(null);
    setDraft((prev) => {
      if (!prev) return prev;
      const next = selectFaceMappingAnchor(prev, anchorId);
      draftRef.current = next;
      return next;
    });
  }, []);

  const onBindingPlaced = useCallback(
    (anchorId: SagaDriveFaceAnchorId, binding: SagaDriveFaceAnchorTriangleBinding | null) => {
      if (!binding) {
        setMissMessage('Kein Treffer auf der Character-Oberfläche — erneut tippen oder ziehen.');
        authoringMetaRef.current = clearFaceMappingAuthoringMetaForAnchor(
          authoringMetaRef.current,
          anchorId,
        );
        return;
      }
      setMissMessage(null);
      setDraft((prev) => {
        if (!prev) return prev;
        let next = setFaceMappingDraftBinding(prev, anchorId, binding);
        if (next.selectedAnchorId !== anchorId) {
          next = selectFaceMappingAnchor(next, anchorId);
        }
        authoringMetaRef.current = markFaceMappingAnchorManual(
          authoringMetaRef.current,
          anchorId,
          authoringMetaRef.current[anchorId]?.source === 'auto',
        );
        draftRef.current = next;
        return next;
      });
    },
    [],
  );

  const mappingLive =
    characterFaceMappingAvailable ||
    Boolean(studioRuntimeRef?.current?.hasLiveActCharacterFaceMapping());
  const characterOverlayOn =
    !faceMappingOpen && liveAct.faceOverlayEnabled && runtimeReady && mappingLive;
  const inputLive =
    runtimeReady &&
    liveAct.trackingEnabled &&
    liveAct.faceDetected &&
    (liveAct.status === 'active' || liveAct.status === 'lost');
  const showPip =
    !faceMappingOpen &&
    liveAct.trackingEnabled &&
    liveAct.cameraPreviewEnabled &&
    Boolean(liveAct.previewVideo) &&
    runtimeReady;

  const draftValidation = draft ? validateFaceMappingDraft(draft) : null;
  const panelHost = faceMappingPanelHost;
  const panel =
    faceMappingOpen && draft ? (
      <FaceMappingAuthoringPanel
        draft={draft}
        missMessage={missMessage}
        autoBusy={autoBusy}
        autoStatusMessage={autoStatusMessage}
        manualCoords={manualCoords}
        autoCoords={autoCoords}
        overlayViewMode={overlayViewMode}
        onOverlayViewModeChange={setOverlayViewMode}
        onSelect={onSelectAnchor}
        onClearSelected={() => {
          setDraft((prev) => {
            if (!prev?.selectedAnchorId) return prev;
            const anchorId = prev.selectedAnchorId;
            const next = clearFaceMappingDraftBinding(prev, anchorId);
            authoringMetaRef.current = clearFaceMappingAuthoringMetaForAnchor(
              authoringMetaRef.current,
              anchorId,
            );
            draftRef.current = next;
            return next;
          });
        }}
        onReset={() => {
          setMissMessage(null);
          setAutoStatusMessage(null);
          setAutoCoords({});
          autoBindingsRef.current = null;
          lastAutoSessionRef.current = null;
          groundTruthReferenceRef.current = null;
          setGroundTruthValid(null);
          setReferenceStatus(null);
          setOverlayViewMode('draft');
          setDraft((prev) => {
            if (!prev) return prev;
            // Full clear: selection + working anchors → baseline (guides empty until rebound).
            const next = resetFaceMappingDraft(prev);
            authoringMetaRef.current = createEmptyAnchorAuthoringMeta(next);
            draftRef.current = next;
            return next;
          });
        }}
        onCancel={closeFaceMapping}
        onAutoMapping={() => {
          void runAutoMapping();
        }}
        onMarkAllReviewed={onMarkAllReviewed}
        groundTruthValid={groundTruthValid}
        referenceStatus={referenceStatus}
        getCompareExportJson={getCompareExportJson}
        getAuthoringMeta={() => authoringMetaRef.current}
      />
    ) : null;

  const settingsNode = (
    <AvatarPreviewSettings
      runtimeReady={runtimeReady}
      mtoonEnabled={mtoonEnabled}
      onMtoonChange={onMtoonChange}
      trackingEnabled={liveAct.trackingEnabled}
      onTrackingChange={liveAct.setTrackingEnabled}
      cameraPreviewEnabled={liveAct.cameraPreviewEnabled}
      onCameraPreviewChange={liveAct.setCameraPreviewEnabled}
      faceOverlayEnabled={liveAct.faceOverlayEnabled}
      onFaceOverlayChange={liveAct.setFaceOverlayEnabled}
      faceOverlayFullDetail={liveAct.faceOverlayFullDetail}
      onFaceOverlayFullDetailChange={liveAct.setFaceOverlayFullDetail}
      characterFaceMappingAvailable={characterFaceMappingAvailable}
      metricsEnabled={liveAct.metricsEnabled}
      onMetricsChange={liveAct.setMetricsEnabled}
      bonesEnabled={liveAct.bonesEnabled}
      bonesAvailable={liveAct.bonesAvailable}
      onBonesChange={liveAct.setBonesEnabled}
      capabilities={capabilities}
      inputLive={inputLive}
      diagnosticsV2Ref={liveAct.diagnosticsV2Ref}
      devices={liveAct.devices}
      selectedDeviceId={liveAct.selectedDeviceId}
      onDeviceChange={liveAct.setSelectedDeviceId}
      status={liveAct.status}
      statusMessage={liveAct.message}
      faceDetected={liveAct.faceDetected}
      headConnected={liveAct.headConnected}
      eyesConnected={liveAct.eyesConnected}
      mouthLimited={liveAct.mouthLimited}
      canCalibrate={liveAct.canCalibrate}
      onCalibrate={() => {
        void liveAct.calibrateNeutral();
      }}
      canAdvanceCalibration={liveAct.canAdvanceCalibration}
      calibrationAdvanceLabelDe={liveAct.calibrationAdvanceLabelDe}
      onAdvanceCalibration={liveAct.advanceCalibration}
      calibrationCountdownSec={liveAct.calibrationCountdownSec}
      calibrationStepPhase={liveAct.calibrationStepPhase}
      canStartCalibrationHold={liveAct.canStartCalibrationHold}
      canRetryCalibrationHold={liveAct.canRetryCalibrationHold}
      calibrationStepPeaks={liveAct.calibrationStepPeaks}
      onStartCalibrationHold={liveAct.startCalibrationHold}
      onRetryCalibrationHold={liveAct.retryCalibrationHold}
      canCopyCalibrationAudit={liveAct.canCopyCalibrationAudit}
      calibrationPeakFrames={liveAct.calibrationPeakFrames}
      getCalibrationAuditJson={liveAct.getCalibrationAuditJson}
      calibrationMessage={liveAct.calibrationMessage}
      hasNeutralBaseline={liveAct.hasNeutralBaseline}
      hasRangeCalibration={liveAct.hasRangeCalibration}
      canMotionTest={liveAct.canMotionTest}
      onMotionTest={liveAct.startMotionTest}
      motionTestStatus={liveAct.motionTestStatus}
      motionTestMessage={liveAct.motionTestMessage}
      motionTestStepPhase={liveAct.motionTestStepPhase}
      motionTestCountdownSec={liveAct.motionTestCountdownSec}
      motionTestStepPeaks={liveAct.motionTestStepPeaks}
      motionTestStepIndex={liveAct.motionTestStepIndex}
      canStartMotionTestHold={liveAct.canStartMotionTestHold}
      canRetryMotionTestHold={liveAct.canRetryMotionTestHold}
      canAdvanceMotionTest={liveAct.canAdvanceMotionTest}
      motionTestAdvanceLabelDe={liveAct.motionTestAdvanceLabelDe}
      onStartMotionTestHold={liveAct.startMotionTestHold}
      onRetryMotionTestHold={liveAct.retryMotionTestHold}
      onAdvanceMotionTest={liveAct.advanceMotionTest}
      canCopyMotionTestAudit={liveAct.canCopyMotionTestAudit}
      motionTestPeakFrames={liveAct.motionTestPeakFrames}
      getMotionTestAuditJson={liveAct.getMotionTestAuditJson}
      faceMappingOpen={faceMappingOpen}
      onOpenFaceMapping={openFaceMapping}
      onExpandPreview={onExpandPreview}
      stickyHost={Boolean(settingsStickyHost)}
    />
  );

  return (
    <>
      <LiveActCharacterFaceOverlay
        enabled={characterOverlayOn}
        metricsEnabled={liveAct.metricsEnabled}
        fullDetail={liveAct.faceOverlayFullDetail}
        studioRuntimeRef={studioRuntimeRef}
        debugHandleRef={liveAct.characterFaceDebugHandleRef}
        diagnosticsV2Ref={liveAct.diagnosticsV2Ref}
      />
      {studioRuntimeRef ? (
        <FaceMappingMarkerLayer
          active={faceMappingOpen}
          draftRef={draftRef}
          studioRuntimeRef={studioRuntimeRef}
          autoBindingsRef={autoBindingsRef}
          viewMode={overlayViewMode}
          editingAllowed={!autoBusy}
          onSelectAnchor={onSelectAnchor}
          onBindingPlaced={onBindingPlaced}
        />
      ) : null}
      {faceMappingOpen ? (
        <div
          className="pointer-events-auto absolute inset-x-3 bottom-3 z-30 flex items-center gap-2 rounded-md border border-white/15 bg-slate-950/95 p-2 shadow-lg backdrop-blur-sm"
          data-testid="face-mapping-viewport-actions"
        >
          <p className="min-w-0 flex-1 px-1 text-[10px] leading-snug text-slate-400">
            Speichern hält die Punkte am Mesh (Face Overlay). Webcam-Tracking ist getrennt — danach Charakter speichern.
          </p>
          <Button
            type="button"
            size="sm"
            variant="outline"
            className="h-8 shrink-0 border-white/15 text-[11px]"
            onClick={closeFaceMapping}
            data-testid="face-mapping-viewport-cancel"
          >
            Abbrechen
          </Button>
          <Button
            type="button"
            size="sm"
            className="h-8 shrink-0 bg-primary text-white hover:bg-accent hover:text-accent-foreground"
            onClick={applyFaceMapping}
            disabled={!draftValidation?.ok}
            title={
              draftValidation && !draftValidation.ok
                ? faceMappingSaveBlockedMessage(draftValidation)
                : undefined
            }
            data-testid="face-mapping-viewport-save"
          >
            Speichern
          </Button>
        </div>
      ) : null}
      {panelHost && panel ? createPortal(panel, panelHost) : null}
      {settingsStickyHost ? createPortal(settingsNode, settingsStickyHost) : settingsNode}
      <LiveActCameraPreview
        video={liveAct.previewVideo}
        status={liveAct.status}
        visible={showPip}
        faceOverlayEnabled={liveAct.faceOverlayEnabled}
        metricsEnabled={liveAct.metricsEnabled}
        fullDetail={liveAct.faceOverlayFullDetail}
        diagnosticsRef={liveAct.diagnosticsRef}
        diagnosticsV2Ref={liveAct.diagnosticsV2Ref}
        hasNeutralBaseline={liveAct.hasNeutralBaseline}
        hasRangeCalibration={liveAct.hasRangeCalibration}
        calibrationRunning={liveAct.calibrationStatus === 'running'}
        calibrationMessage={liveAct.calibrationMessage}
        canAdvanceCalibration={liveAct.canAdvanceCalibration}
        calibrationAdvanceLabelDe={liveAct.calibrationAdvanceLabelDe}
        onAdvanceCalibration={liveAct.advanceCalibration}
        calibrationCountdownSec={liveAct.calibrationCountdownSec}
        calibrationStepPhase={liveAct.calibrationStepPhase}
        canStartCalibrationHold={liveAct.canStartCalibrationHold}
        canRetryCalibrationHold={liveAct.canRetryCalibrationHold}
        calibrationStepPeaks={liveAct.calibrationStepPeaks}
        onStartCalibrationHold={liveAct.startCalibrationHold}
        onRetryCalibrationHold={liveAct.retryCalibrationHold}
        canCopyCalibrationAudit={liveAct.canCopyCalibrationAudit}
        calibrationPeakFrames={liveAct.calibrationPeakFrames}
        getCalibrationAuditJson={liveAct.getCalibrationAuditJson}
        motionTestRunning={liveAct.motionTestStatus === 'running'}
        motionTestMessage={liveAct.motionTestMessage}
        canAdvanceMotionTest={liveAct.canAdvanceMotionTest}
        motionTestAdvanceLabelDe={liveAct.motionTestAdvanceLabelDe}
        onAdvanceMotionTest={liveAct.advanceMotionTest}
        motionTestCountdownSec={liveAct.motionTestCountdownSec}
        motionTestStepPhase={liveAct.motionTestStepPhase}
        motionTestStepIndex={liveAct.motionTestStepIndex}
        canStartMotionTestHold={liveAct.canStartMotionTestHold}
        canRetryMotionTestHold={liveAct.canRetryMotionTestHold}
        motionTestStepPeaks={liveAct.motionTestStepPeaks}
        onStartMotionTestHold={liveAct.startMotionTestHold}
        onRetryMotionTestHold={liveAct.retryMotionTestHold}
        canCopyMotionTestAudit={liveAct.canCopyMotionTestAudit}
        motionTestPeakFrames={liveAct.motionTestPeakFrames}
        getMotionTestAuditJson={liveAct.getMotionTestAuditJson}
      />
    </>
  );
}
