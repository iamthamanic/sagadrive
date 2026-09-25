/**
 * FaceMappingMarkerLayer — labeled markers + smooth guides + drag for Face Setup.
 * Location: src/app/character/liveact/FaceMappingMarkerLayer.tsx
 *
 * Projects draft bindings via CharacterStudioRuntime; no React setState per frame.
 * Smooth eye/mouth contours + brow curves from domain guide geometry.
 * Selected marker pulses; overlay owns pointer events so orbit cannot steal drags.
 * Valid hit only — leave last binding (drag updates only on allowlisted raycast hits).
 * View mode: draft (amber) / auto ghost (cyan) / both (#421 compare).
 */

import { useEffect, useRef, type RefObject } from 'react';
import {
  SAGA_DRIVE_FACE_ANCHOR_IDS,
  type SagaDriveFaceAnchorId,
  type SagaDriveFaceAnchorTriangleBinding,
} from '../../../domains/character/avatar/face-anchor-contract';
import {
  FACE_MAPPING_ANCHOR_SHORT_DE,
  resolveFaceMappingMarkerStatus,
  type SagaDriveFaceMappingDraftV1,
} from '../../../domains/character/avatar/face-mapping-draft-v1';
import { buildFaceMappingGuidePaths } from '../../../domains/character/avatar/face-mapping-guide-geometry';
import type { CharacterStudioRuntime } from '../../../infrastructure/character/avatar/character-studio-runtime';

export type FaceMappingOverlayViewMode = 'draft' | 'auto' | 'both';

interface FaceMappingMarkerLayerProps {
  active: boolean;
  draftRef: RefObject<SagaDriveFaceMappingDraftV1 | null>;
  studioRuntimeRef: RefObject<CharacterStudioRuntime | null>;
  /** Last Auto Mapping triangle bindings (ghost layer; camera-stable). */
  autoBindingsRef?: RefObject<
    Partial<Record<SagaDriveFaceAnchorId, SagaDriveFaceAnchorTriangleBinding>> | null
  >;
  /** What to draw on the 3D overlay. */
  viewMode?: FaceMappingOverlayViewMode;
  /** When false, pan/select only — no draft place/drag (e.g. while autoBusy). */
  editingAllowed?: boolean;
  onSelectAnchor: (anchorId: SagaDriveFaceAnchorId) => void;
  onBindingPlaced: (
    anchorId: SagaDriveFaceAnchorId,
    binding: SagaDriveFaceAnchorTriangleBinding | null,
  ) => void;
}

const STATUS_FILL: Record<string, string> = {
  missing: 'rgba(148, 163, 184, 0.9)',
  set: 'rgba(245, 158, 11, 0.95)',
  invalid: 'rgba(239, 68, 68, 0.95)',
  reviewed: 'rgba(34, 197, 94, 0.95)',
  selected: 'rgba(6, 182, 212, 0.98)',
};

const AUTO_FILL = 'rgba(6, 182, 212, 0.35)';
const AUTO_STROKE = 'rgba(6, 182, 212, 0.95)';

const GUIDE_STROKE: Record<string, string> = {
  eyeLeft: 'rgba(96, 165, 250, 0.95)',
  eyeRight: 'rgba(96, 165, 250, 0.95)',
  mouth: 'rgba(52, 211, 153, 0.95)',
  browLeft: 'rgba(251, 191, 36, 0.95)',
  browRight: 'rgba(251, 191, 36, 0.95)',
};

/** Generous hit target so points (and nearby labels) are easy to grab. */
const HIT_RADIUS_PX = 36;
const DOT_RADIUS = 7;
const DOT_RADIUS_SELECTED = 10;
const DRAG_THRESHOLD_PX = 4;

type ScreenPt = { x: number; y: number };

function drawGuidePaths(
  ctx: CanvasRenderingContext2D,
  screen: Partial<Record<SagaDriveFaceAnchorId, ScreenPt>>,
  alpha = 1,
): void {
  const paths = buildFaceMappingGuidePaths(screen);
  ctx.lineWidth = 1.75;
  ctx.lineJoin = 'round';
  ctx.lineCap = 'round';
  ctx.globalAlpha = alpha;
  for (const path of paths) {
    if (path.points.length < 2) continue;
    ctx.beginPath();
    ctx.strokeStyle = GUIDE_STROKE[path.kind] ?? 'rgba(226, 232, 240, 0.7)';
    for (let i = 0; i < path.points.length; i += 1) {
      const p = path.points[i];
      if (i === 0) ctx.moveTo(p.x, p.y);
      else ctx.lineTo(p.x, p.y);
    }
    if (path.closed) ctx.closePath();
    ctx.stroke();
  }
  ctx.globalAlpha = 1;
}

function drawLabel(
  ctx: CanvasRenderingContext2D,
  text: string,
  x: number,
  y: number,
  selected: boolean,
  tone: 'draft' | 'auto' = 'draft',
): void {
  ctx.font = selected
    ? 'bold 11px ui-sans-serif, system-ui, sans-serif'
    : '10px ui-sans-serif, system-ui, sans-serif';
  ctx.textBaseline = 'middle';
  const padX = 4;
  const padY = 2;
  const metrics = ctx.measureText(text);
  const boxW = metrics.width + padX * 2;
  const boxH = 14 + padY;
  const labelX = x + 12;
  const labelY = y - boxH / 2 + (tone === 'auto' ? 12 : 0);
  ctx.fillStyle =
    tone === 'auto'
      ? 'rgba(8, 145, 178, 0.88)'
      : selected
        ? 'rgba(8, 145, 178, 0.92)'
        : 'rgba(15, 23, 42, 0.82)';
  ctx.fillRect(labelX, labelY, boxW, boxH);
  ctx.strokeStyle =
    tone === 'auto'
      ? 'rgba(165, 243, 252, 0.9)'
      : selected
        ? 'rgba(255,255,255,0.85)'
        : 'rgba(255,255,255,0.25)';
  ctx.lineWidth = 1;
  ctx.strokeRect(labelX, labelY, boxW, boxH);
  ctx.fillStyle = '#ffffff';
  ctx.fillText(text, labelX + padX, labelY + boxH / 2);
}

function drawModeBanner(
  ctx: CanvasRenderingContext2D,
  width: number,
  viewMode: FaceMappingOverlayViewMode,
): void {
  const modeHint =
    viewMode === 'draft'
      ? 'Ansicht: Draft (amber) — editierbar'
      : viewMode === 'auto'
        ? 'Ansicht: Auto (cyan) — nur Vorschlag'
        : 'Ansicht: Beide — amber=Draft · cyan=Auto';
  const text = `Face Mapping — ${modeHint} · Scroll=Zoom · Leer ziehen=Pan`;
  ctx.font = '11px ui-sans-serif, system-ui, sans-serif';
  const pad = 8;
  const h = 26;
  ctx.fillStyle = 'rgba(8, 145, 178, 0.88)';
  ctx.fillRect(0, 0, width, h);
  ctx.fillStyle = '#ffffff';
  ctx.textBaseline = 'middle';
  ctx.fillText(text, pad, h / 2, width - pad * 2);
}

function projectBindingsScreens(
  rt: CharacterStudioRuntime,
  bindings: Partial<Record<SagaDriveFaceAnchorId, SagaDriveFaceAnchorTriangleBinding>>,
): Partial<Record<SagaDriveFaceAnchorId, ScreenPt>> {
  const screen: Partial<Record<SagaDriveFaceAnchorId, ScreenPt>> = {};
  for (const id of SAGA_DRIVE_FACE_ANCHOR_IDS) {
    const binding = bindings[id];
    if (!binding) continue;
    const world = rt.evaluateFaceMappingBindingWorld(binding, id);
    if (!world) continue;
    const pt = rt.projectWorldToFaceMappingCanvas(world.x, world.y, world.z);
    if (pt) screen[id] = pt;
  }
  return screen;
}

function projectDraftScreens(
  rt: CharacterStudioRuntime,
  draft: SagaDriveFaceMappingDraftV1,
): Partial<Record<SagaDriveFaceAnchorId, ScreenPt>> {
  const bindings: Partial<Record<SagaDriveFaceAnchorId, SagaDriveFaceAnchorTriangleBinding>> = {};
  for (const id of SAGA_DRIVE_FACE_ANCHOR_IDS) {
    const binding = draft.anchors[id];
    if (binding) bindings[id] = binding;
  }
  return projectBindingsScreens(rt, bindings);
}

function findNearestMarker(
  screen: Partial<Record<SagaDriveFaceAnchorId, ScreenPt>>,
  x: number,
  y: number,
  preferId: SagaDriveFaceAnchorId | null,
): SagaDriveFaceAnchorId | null {
  if (preferId) {
    const preferred = screen[preferId];
    if (preferred && Math.hypot(preferred.x - x, preferred.y - y) <= HIT_RADIUS_PX) {
      return preferId;
    }
  }
  let best: SagaDriveFaceAnchorId | null = null;
  let bestDist = HIT_RADIUS_PX;
  for (const id of SAGA_DRIVE_FACE_ANCHOR_IDS) {
    const pt = screen[id];
    if (!pt) continue;
    const d = Math.hypot(pt.x - x, pt.y - y);
    if (d <= bestDist) {
      bestDist = d;
      best = id;
    }
  }
  return best;
}

function drawAutoGhosts(
  ctx: CanvasRenderingContext2D,
  screen: Partial<Record<SagaDriveFaceAnchorId, ScreenPt>>,
  withLabels: boolean,
): void {
  for (const id of SAGA_DRIVE_FACE_ANCHOR_IDS) {
    const pt = screen[id];
    if (!pt) continue;
    ctx.beginPath();
    ctx.arc(pt.x, pt.y, DOT_RADIUS + 1, 0, Math.PI * 2);
    ctx.fillStyle = AUTO_FILL;
    ctx.fill();
    ctx.strokeStyle = AUTO_STROKE;
    ctx.lineWidth = 2;
    ctx.setLineDash([3, 3]);
    ctx.stroke();
    ctx.setLineDash([]);
    if (withLabels) {
      drawLabel(ctx, `A·${FACE_MAPPING_ANCHOR_SHORT_DE[id]}`, pt.x, pt.y, false, 'auto');
    }
  }
}

export function FaceMappingMarkerLayer({
  active,
  draftRef,
  studioRuntimeRef,
  autoBindingsRef,
  viewMode = 'draft',
  editingAllowed: editingAllowedProp = true,
  onSelectAnchor,
  onBindingPlaced,
}: FaceMappingMarkerLayerProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const onPlaceRef = useRef(onBindingPlaced);
  onPlaceRef.current = onBindingPlaced;
  const onSelectRef = useRef(onSelectAnchor);
  onSelectRef.current = onSelectAnchor;
  const viewModeRef = useRef(viewMode);
  viewModeRef.current = viewMode;
  const editingAllowedPropRef = useRef(editingAllowedProp);
  editingAllowedPropRef.current = editingAllowedProp;

  useEffect(() => {
    if (!active) return;
    const overlay = canvasRef.current;
    const runtime = studioRuntimeRef.current;
    if (!overlay || !runtime) return;

    runtime.setOrbitControlsEnabled(true);

    let raf = 0;
    let draggingId: SagaDriveFaceAnchorId | null = null;
    let dragMoved = false;
    let grabbedExisting = false;
    let panning = false;
    let panLast: { x: number; y: number } | null = null;
    let pointerDown: {
      x: number;
      y: number;
      t: number;
      anchorId: SagaDriveFaceAnchorId | null;
      button: number;
    } | null = null;

    const paint = () => {
      const draft = draftRef.current;
      const rt = studioRuntimeRef.current;
      const ctx = overlay.getContext('2d');
      if (!ctx || !rt || !draft) {
        raf = requestAnimationFrame(paint);
        return;
      }
      const host = rt.getFaceMappingCanvasElement();
      const width = Math.max(1, Math.round(host.clientWidth));
      const height = Math.max(1, Math.round(host.clientHeight));
      if (overlay.width !== width || overlay.height !== height) {
        overlay.width = width;
        overlay.height = height;
      }
      ctx.clearRect(0, 0, width, height);

      const mode = viewModeRef.current;
      drawModeBanner(ctx, width, mode);

      const draftScreen = projectDraftScreens(rt, draft);
      const autoBindings = autoBindingsRef?.current ?? null;
      const autoScreen =
        autoBindings && Object.keys(autoBindings).length > 0
          ? projectBindingsScreens(rt, autoBindings)
          : {};

      const showDraft = mode === 'draft' || mode === 'both';
      const showAuto = mode === 'auto' || mode === 'both';

      if (showDraft) {
        drawGuidePaths(ctx, draftScreen, mode === 'both' ? 0.85 : 1);
      } else if (showAuto) {
        drawGuidePaths(ctx, autoScreen, 0.75);
      }

      if (showAuto) {
        drawAutoGhosts(ctx, autoScreen, mode === 'auto');
      }

      const pulse = 0.5 + 0.5 * Math.sin(performance.now() / 220);

      if (showDraft) {
        for (const id of SAGA_DRIVE_FACE_ANCHOR_IDS) {
          const pt = draftScreen[id];
          if (!pt || draft.selectedAnchorId === id) continue;
          const status = resolveFaceMappingMarkerStatus(draft, id);
          ctx.beginPath();
          ctx.arc(pt.x, pt.y, DOT_RADIUS, 0, Math.PI * 2);
          ctx.fillStyle = STATUS_FILL[status];
          ctx.fill();
          ctx.strokeStyle = 'rgba(15, 23, 42, 0.65)';
          ctx.lineWidth = 1;
          ctx.stroke();
          drawLabel(ctx, FACE_MAPPING_ANCHOR_SHORT_DE[id], pt.x, pt.y, false, 'draft');
        }

        const selectedId = draft.selectedAnchorId;
        if (selectedId) {
          const pt = draftScreen[selectedId];
          if (pt) {
            const ringR = DOT_RADIUS_SELECTED + 4 + pulse * 5;
            ctx.beginPath();
            ctx.arc(pt.x, pt.y, ringR, 0, Math.PI * 2);
            ctx.strokeStyle = `rgba(6, 182, 212, ${0.25 + pulse * 0.45})`;
            ctx.lineWidth = 2.5;
            ctx.stroke();
            ctx.beginPath();
            ctx.arc(pt.x, pt.y, DOT_RADIUS_SELECTED + 3, 0, Math.PI * 2);
            ctx.strokeStyle = 'rgba(255,255,255,0.55)';
            ctx.lineWidth = 2;
            ctx.stroke();
            ctx.beginPath();
            ctx.arc(pt.x, pt.y, DOT_RADIUS_SELECTED + pulse * 1.5, 0, Math.PI * 2);
            ctx.fillStyle = STATUS_FILL.selected;
            ctx.fill();
            ctx.strokeStyle = 'rgba(255,255,255,0.95)';
            ctx.lineWidth = 2;
            ctx.stroke();
            drawLabel(ctx, FACE_MAPPING_ANCHOR_SHORT_DE[selectedId], pt.x, pt.y, true, 'draft');
          }
        }
      }

      raf = requestAnimationFrame(paint);
    };
    raf = requestAnimationFrame(paint);

    const canvasXY = (event: PointerEvent, rt: CharacterStudioRuntime) => {
      const host = rt.getFaceMappingCanvasElement();
      const rect = host.getBoundingClientRect();
      return {
        x: event.clientX - rect.left,
        y: event.clientY - rect.top,
      };
    };

    const editingAllowed = () =>
      editingAllowedPropRef.current && viewModeRef.current !== 'auto';

    const onPointerDown = (event: PointerEvent) => {
      const draft = draftRef.current;
      const rt = studioRuntimeRef.current;
      if (!draft || !rt) return;

      if (event.button === 1 || event.button === 2) {
        panning = true;
        panLast = { x: event.clientX, y: event.clientY };
        pointerDown = {
          x: event.clientX,
          y: event.clientY,
          t: performance.now(),
          anchorId: null,
          button: event.button,
        };
        try {
          overlay.setPointerCapture(event.pointerId);
        } catch {
          // optional
        }
        event.preventDefault();
        event.stopPropagation();
        return;
      }

      if (event.button !== 0) return;

      // Auto-only: pan only — no draft edits.
      if (!editingAllowed()) {
        panning = true;
        panLast = { x: event.clientX, y: event.clientY };
        pointerDown = {
          x: event.clientX,
          y: event.clientY,
          t: performance.now(),
          anchorId: null,
          button: 0,
        };
        try {
          overlay.setPointerCapture(event.pointerId);
        } catch {
          // optional
        }
        event.preventDefault();
        event.stopPropagation();
        return;
      }

      const { x, y } = canvasXY(event, rt);
      const screen = projectDraftScreens(rt, draft);
      const near = findNearestMarker(screen, x, y, draft.selectedAnchorId);
      pointerDown = {
        x: event.clientX,
        y: event.clientY,
        t: performance.now(),
        anchorId: near ?? draft.selectedAnchorId,
        button: 0,
      };
      dragMoved = false;
      grabbedExisting = Boolean(near);
      draggingId = near;
      panning = false;
      panLast = near ? null : { x: event.clientX, y: event.clientY };
      rt.setOrbitControlsEnabled(!near);
      if (near) {
        onSelectRef.current(near);
        try {
          overlay.setPointerCapture(event.pointerId);
        } catch {
          // optional
        }
      } else {
        try {
          overlay.setPointerCapture(event.pointerId);
        } catch {
          // optional
        }
      }
      event.preventDefault();
      event.stopPropagation();
    };

    const onPointerMove = (event: PointerEvent) => {
      const rt = studioRuntimeRef.current;
      if (!rt || !pointerDown) return;

      if (panning && panLast && !draggingId) {
        const dx = event.clientX - panLast.x;
        const dy = event.clientY - panLast.y;
        panLast = { x: event.clientX, y: event.clientY };
        if (Math.hypot(dx, dy) > 0) {
          dragMoved = true;
          rt.panFaceMappingCamera(dx, dy);
        }
        event.preventDefault();
        return;
      }

      if (!draggingId) {
        if (pointerDown.button === 0 && panLast && !grabbedExisting) {
          const dx0 = event.clientX - pointerDown.x;
          const dy0 = event.clientY - pointerDown.y;
          if (Math.hypot(dx0, dy0) > DRAG_THRESHOLD_PX) {
            panning = true;
            dragMoved = true;
            const dx = event.clientX - panLast.x;
            const dy = event.clientY - panLast.y;
            panLast = { x: event.clientX, y: event.clientY };
            rt.panFaceMappingCamera(dx, dy);
            event.preventDefault();
          }
        }
        return;
      }

      if (!editingAllowed()) return;

      const dx = event.clientX - pointerDown.x;
      const dy = event.clientY - pointerDown.y;
      if (Math.hypot(dx, dy) > DRAG_THRESHOLD_PX) dragMoved = true;
      if (!dragMoved) return;
      const { x, y } = canvasXY(event, rt);
      const hit = rt.raycastFaceMappingAtCanvas(x, y);
      if (hit) onPlaceRef.current(draggingId, hit.binding);
      event.preventDefault();
    };

    const onPointerUp = (event: PointerEvent) => {
      const rt = studioRuntimeRef.current;
      const draft = draftRef.current;
      const down = pointerDown;
      const wasDragging = draggingId;
      const wasGrab = grabbedExisting;
      const moved = dragMoved;
      const wasPanning = panning;
      pointerDown = null;
      draggingId = null;
      grabbedExisting = false;
      dragMoved = false;
      panning = false;
      panLast = null;

      try {
        if (overlay.hasPointerCapture(event.pointerId)) {
          overlay.releasePointerCapture(event.pointerId);
        }
      } catch {
        // ignore
      }

      if (rt) rt.setOrbitControlsEnabled(true);

      if (!down || !rt || !draft) return;

      if (wasPanning || (down.button !== 0 && moved)) {
        event.preventDefault();
        event.stopPropagation();
        return;
      }

      if (!editingAllowed()) {
        event.preventDefault();
        event.stopPropagation();
        return;
      }

      if (wasDragging && moved) {
        event.preventDefault();
        event.stopPropagation();
        return;
      }

      const dx = event.clientX - down.x;
      const dy = event.clientY - down.y;
      if (Math.hypot(dx, dy) > 8 || performance.now() - down.t > 500) return;

      if (wasGrab && wasDragging && !moved) {
        onSelectRef.current(wasDragging);
        event.preventDefault();
        event.stopPropagation();
        return;
      }

      const anchorId = draft.selectedAnchorId;
      if (!anchorId || wasGrab || moved) return;
      const { x, y } = canvasXY(event, rt);
      const hit = rt.raycastFaceMappingAtCanvas(x, y);
      onPlaceRef.current(anchorId, hit?.binding ?? null);
      event.preventDefault();
      event.stopPropagation();
    };

    const onContextMenu = (event: Event) => {
      event.preventDefault();
    };

    overlay.addEventListener('pointerdown', onPointerDown);
    overlay.addEventListener('pointermove', onPointerMove);
    overlay.addEventListener('pointerup', onPointerUp);
    overlay.addEventListener('pointercancel', onPointerUp);
    overlay.addEventListener('contextmenu', onContextMenu);

    const onWheel = (event: WheelEvent) => {
      event.preventDefault();
      event.stopPropagation();
      runtime.dollyFaceMappingCamera(event.deltaY);
    };
    overlay.addEventListener('wheel', onWheel, { passive: false });

    return () => {
      cancelAnimationFrame(raf);
      overlay.removeEventListener('pointerdown', onPointerDown);
      overlay.removeEventListener('pointermove', onPointerMove);
      overlay.removeEventListener('pointerup', onPointerUp);
      overlay.removeEventListener('pointercancel', onPointerUp);
      overlay.removeEventListener('contextmenu', onContextMenu);
      overlay.removeEventListener('wheel', onWheel);
    };
  }, [active, autoBindingsRef, draftRef, studioRuntimeRef]);

  if (!active) return null;

  return (
    <canvas
      ref={canvasRef}
      className="pointer-events-auto absolute inset-0 z-[15] h-full w-full touch-none cursor-crosshair"
      data-testid="face-mapping-marker-layer"
      data-view-mode={viewMode}
      aria-hidden
    />
  );
}
