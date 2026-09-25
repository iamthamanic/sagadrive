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
  createEmptyAnchorAuthoringMeta,
  markFaceMappingAnchorManual,
  type FaceMappingAutoSessionResultV1,
  type FaceMappingDraftAuthoringMeta,
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
import { FaceMappingMarkerLayer } from './FaceMappingMarkerLayer';
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
  const draftRef = useRef<SagaDriveFaceMappingDraftV1 | null>(null);
  const authoringMetaRef = useRef<FaceMappingDraftAuthoringMeta>({});
  draftRef.current = draft;

  const closeFaceMapping = useCallback(() => {
    studioRuntimeRef?.current?.setFaceMappingAuthoringActive(false);
    setFaceMappingOpen(false);
    setDraft(null);
    setMissMessage(null);
    setAutoBusy(false);
    setAutoStatusMessage(null);
    setManualCoords({});
    setAutoCoords({});
    authoringMetaRef.current = {};
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
    authoringMetaRef.current = createEmptyAnchorAuthoringMeta(next);
    setDraft(next);
    setMissMessage(null);
    setAutoStatusMessage(null);
    setFaceMappingOpen(true);
  }, [liveAct, runtimeReady, studioRuntimeRef]);

  const runAutoMapping = useCallback(async () => {
    const runtime = studioRuntimeRef?.current;
    const current = draftRef.current;
    if (!runtime || !current || autoBusy) return;

    const protectedCount = Object.values(authoringMetaRef.current).filter(
      (m) => m && (m.source === 'manual' || m.source === 'manual_override' || m.reviewed),
    ).length;
    let replaceProtected = false;
    if (protectedCount > 0) {
      const ok = window.confirm(
        `${protectedCount} manuelle/reviewed Marker vorhanden.\n\nOK = Auto Mapping überschreibt sie (Replace).\nAbbrechen = nur leere/auto Marker füllen.`,
      );
      replaceProtected = ok;
    }

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
        const applied = applyAutoMappingToDraft(current, session, authoringMetaRef.current, {
          replaceProtected,
        });
        authoringMetaRef.current = applied.meta;
        draftRef.current = applied.draft;
        setDraft(applied.draft);
        setAutoCoords(autoCoordsFromSession(session));
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
        onSelect={onSelectAnchor}
        onClearSelected={() => {
          setDraft((prev) => {
            if (!prev?.selectedAnchorId) return prev;
            const next = clearFaceMappingDraftBinding(prev, prev.selectedAnchorId);
            draftRef.current = next;
            return next;
          });
        }}
        onReset={() => {
          setMissMessage(null);
          setAutoStatusMessage(null);
          setAutoCoords({});
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
      />
    ) : null;

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
      />
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
