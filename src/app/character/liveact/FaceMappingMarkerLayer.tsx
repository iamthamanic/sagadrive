/**
 * FaceMappingMarkerLayer — imperative canvas markers + contours for Face Setup (#420).
 * Location: src/app/character/liveact/FaceMappingMarkerLayer.tsx
 *
 * Projects draft bindings via CharacterStudioRuntime; no React setState per frame.
 * Tap places the selected marker; drag near a marker moves it (orbit disabled while dragging).
 * Draws lip / eye / brow polylines when enough anchors are set.
 */

import { useEffect, useRef, type RefObject } from 'react';
import {
  SAGA_DRIVE_FACE_ANCHOR_IDS,
  type SagaDriveFaceAnchorId,
  type SagaDriveFaceAnchorTriangleBinding,
} from '../../../domains/character/avatar/face-anchor-contract';
import {
  resolveFaceMappingMarkerStatus,
  type SagaDriveFaceMappingDraftV1,
} from '../../../domains/character/avatar/face-mapping-draft-v1';
import type { CharacterStudioRuntime } from '../../../infrastructure/character/avatar/character-studio-runtime';

interface FaceMappingMarkerLayerProps {
  active: boolean;
  draftRef: RefObject<SagaDriveFaceMappingDraftV1 | null>;
  studioRuntimeRef: RefObject<CharacterStudioRuntime | null>;
  onBindingPlaced: (
    anchorId: SagaDriveFaceAnchorId,
    binding: SagaDriveFaceAnchorTriangleBinding | null,
  ) => void;
}

const STATUS_FILL: Record<string, string> = {
  missing: 'rgba(148, 163, 184, 0.85)',
  set: 'rgba(245, 158, 11, 0.95)',
  invalid: 'rgba(239, 68, 68, 0.95)',
  reviewed: 'rgba(34, 197, 94, 0.95)',
  selected: 'rgba(6, 182, 212, 0.98)',
};

const HIT_RADIUS_PX = 16;

type ScreenPt = { x: number; y: number };

function pickScreen(
  screen: Partial<Record<SagaDriveFaceAnchorId, ScreenPt>>,
  id: SagaDriveFaceAnchorId,
): ScreenPt | null {
  return screen[id] ?? null;
}

function drawPolyline(
  ctx: CanvasRenderingContext2D,
  points: readonly ScreenPt[],
  closed: boolean,
): void {
  if (points.length < 2) return;
  ctx.beginPath();
  for (let i = 0; i < points.length; i += 1) {
    const p = points[i];
    if (i === 0) ctx.moveTo(p.x, p.y);
    else ctx.lineTo(p.x, p.y);
  }
  if (closed) ctx.closePath();
  ctx.stroke();
}

function drawGuideContours(
  ctx: CanvasRenderingContext2D,
  screen: Partial<Record<SagaDriveFaceAnchorId, ScreenPt>>,
): void {
  ctx.lineWidth = 1.4;

  const mouthUpper = pickScreen(screen, 'mouthUpper');
  const mouthLower = pickScreen(screen, 'mouthLower');
  const mouthCornerLeft = pickScreen(screen, 'mouthCornerLeft');
  const mouthCornerRight = pickScreen(screen, 'mouthCornerRight');
  if (mouthUpper && mouthLower && mouthCornerLeft && mouthCornerRight) {
    ctx.strokeStyle = 'rgba(52, 211, 153, 0.9)';
    // Lip diamond so upper/lower lip lines are visible, not only dots.
    drawPolyline(ctx, [mouthUpper, mouthCornerRight, mouthLower, mouthCornerLeft], true);
    ctx.setLineDash([4, 3]);
    ctx.strokeStyle = 'rgba(52, 211, 153, 0.55)';
    drawPolyline(ctx, [mouthUpper, mouthLower], false);
    ctx.setLineDash([]);
  } else if (mouthUpper && mouthLower) {
    ctx.strokeStyle = 'rgba(52, 211, 153, 0.85)';
    drawPolyline(ctx, [mouthUpper, mouthLower], false);
  }

  const li = pickScreen(screen, 'eyeLeftInner');
  const lo = pickScreen(screen, 'eyeLeftOuter');
  const lu = pickScreen(screen, 'eyeLeftUpper');
  const ll = pickScreen(screen, 'eyeLeftLower');
  if (li && lo && lu && ll) {
    ctx.strokeStyle = 'rgba(96, 165, 250, 0.9)';
    drawPolyline(ctx, [li, lu, lo, ll], true);
  }

  const ri = pickScreen(screen, 'eyeRightInner');
  const ro = pickScreen(screen, 'eyeRightOuter');
  const ru = pickScreen(screen, 'eyeRightUpper');
  const rl = pickScreen(screen, 'eyeRightLower');
  if (ri && ro && ru && rl) {
    ctx.strokeStyle = 'rgba(96, 165, 250, 0.9)';
    drawPolyline(ctx, [ri, ru, ro, rl], true);
  }

  const bli = pickScreen(screen, 'browLeftInner');
  const blc = pickScreen(screen, 'browLeftCenter');
  const blo = pickScreen(screen, 'browLeftOuter');
  if (bli && blc && blo) {
    ctx.strokeStyle = 'rgba(251, 191, 36, 0.9)';
    drawPolyline(ctx, [bli, blc, blo], false);
  }

  const bri = pickScreen(screen, 'browRightInner');
  const brc = pickScreen(screen, 'browRightCenter');
  const bro = pickScreen(screen, 'browRightOuter');
  if (bri && brc && bro) {
    ctx.strokeStyle = 'rgba(251, 191, 36, 0.9)';
    drawPolyline(ctx, [bri, brc, bro], false);
  }

  const nose = pickScreen(screen, 'noseTip');
  const chin = pickScreen(screen, 'chin');
  const forehead = pickScreen(screen, 'forehead');
  if (nose && chin) {
    ctx.strokeStyle = 'rgba(226, 232, 240, 0.45)';
    drawPolyline(ctx, [nose, chin], false);
  }
  if (forehead && nose) {
    ctx.strokeStyle = 'rgba(226, 232, 240, 0.35)';
    drawPolyline(ctx, [forehead, nose], false);
  }
}

function projectDraftScreens(
  rt: CharacterStudioRuntime,
  draft: SagaDriveFaceMappingDraftV1,
): Partial<Record<SagaDriveFaceAnchorId, ScreenPt>> {
  const screen: Partial<Record<SagaDriveFaceAnchorId, ScreenPt>> = {};
  for (const id of SAGA_DRIVE_FACE_ANCHOR_IDS) {
    const binding = draft.anchors[id];
    if (!binding) continue;
    const world = rt.evaluateFaceMappingBindingWorld(binding);
    if (!world) continue;
    const pt = rt.projectWorldToFaceMappingCanvas(world.x, world.y, world.z);
    if (pt) screen[id] = pt;
  }
  return screen;
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

export function FaceMappingMarkerLayer({
  active,
  draftRef,
  studioRuntimeRef,
  onBindingPlaced,
}: FaceMappingMarkerLayerProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const onPlaceRef = useRef(onBindingPlaced);
  onPlaceRef.current = onBindingPlaced;

  useEffect(() => {
    if (!active) return;
    const overlay = canvasRef.current;
    const runtime = studioRuntimeRef.current;
    if (!overlay || !runtime) return;

    let raf = 0;
    let draggingId: SagaDriveFaceAnchorId | null = null;
    let dragMoved = false;
    let pointerDown: { x: number; y: number; t: number; anchorId: SagaDriveFaceAnchorId | null } | null =
      null;

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

      const screen = projectDraftScreens(rt, draft);
      drawGuideContours(ctx, screen);

      for (const id of SAGA_DRIVE_FACE_ANCHOR_IDS) {
        const pt = screen[id];
        if (!pt) continue;
        const status = resolveFaceMappingMarkerStatus(draft, id);
        const selected = draft.selectedAnchorId === id;
        ctx.beginPath();
        ctx.arc(pt.x, pt.y, selected ? 7 : 5, 0, Math.PI * 2);
        ctx.fillStyle = selected ? STATUS_FILL.selected : STATUS_FILL[status];
        ctx.fill();
        if (selected) {
          ctx.strokeStyle = 'rgba(255,255,255,0.95)';
          ctx.lineWidth = 1.5;
          ctx.stroke();
        }
      }
      raf = requestAnimationFrame(paint);
    };
    raf = requestAnimationFrame(paint);

    const canvasXY = (event: PointerEvent, rt: CharacterStudioRuntime) => {
      const rect = rt.getFaceMappingCanvasElement().getBoundingClientRect();
      return { x: event.clientX - rect.left, y: event.clientY - rect.top };
    };

    const onPointerDown = (event: PointerEvent) => {
      if (event.button !== 0) return;
      const draft = draftRef.current;
      const rt = studioRuntimeRef.current;
      if (!draft || !rt) return;
      const { x, y } = canvasXY(event, rt);
      const screen = projectDraftScreens(rt, draft);
      const near = findNearestMarker(screen, x, y, draft.selectedAnchorId);
      pointerDown = {
        x: event.clientX,
        y: event.clientY,
        t: performance.now(),
        anchorId: near ?? draft.selectedAnchorId,
      };
      dragMoved = false;
      if (near) {
        draggingId = near;
        rt.setOrbitControlsEnabled(false);
        event.preventDefault();
        event.stopPropagation();
      }
    };

    const onPointerMove = (event: PointerEvent) => {
      if (!draggingId || !pointerDown) return;
      const rt = studioRuntimeRef.current;
      if (!rt) return;
      const dx = event.clientX - pointerDown.x;
      const dy = event.clientY - pointerDown.y;
      if (Math.hypot(dx, dy) > 4) dragMoved = true;
      if (!dragMoved) return;
      const { x, y } = canvasXY(event, rt);
      const hit = rt.raycastFaceMappingAtCanvas(x, y);
      if (hit) onPlaceRef.current(draggingId, hit.binding);
    };

    const onPointerUp = (event: PointerEvent) => {
      const rt = studioRuntimeRef.current;
      const draft = draftRef.current;
      const down = pointerDown;
      pointerDown = null;
      const wasDragging = draggingId;
      draggingId = null;
      if (rt) rt.setOrbitControlsEnabled(true);

      if (!down || !rt || !draft) return;

      if (wasDragging && dragMoved) {
        // Final snap already applied during move.
        return;
      }

      // Short tap: place selected (or nearest) marker.
      const dx = event.clientX - down.x;
      const dy = event.clientY - down.y;
      if (Math.hypot(dx, dy) > 6 || performance.now() - down.t > 450) return;
      const anchorId = down.anchorId ?? draft.selectedAnchorId;
      if (!anchorId) return;
      const { x, y } = canvasXY(event, rt);
      const hit = rt.raycastFaceMappingAtCanvas(x, y);
      onPlaceRef.current(anchorId, hit?.binding ?? null);
    };

    const gl = runtime.getFaceMappingCanvasElement();
    gl.addEventListener('pointerdown', onPointerDown, true);
    window.addEventListener('pointermove', onPointerMove);
    window.addEventListener('pointerup', onPointerUp);

    return () => {
      cancelAnimationFrame(raf);
      gl.removeEventListener('pointerdown', onPointerDown, true);
      window.removeEventListener('pointermove', onPointerMove);
      window.removeEventListener('pointerup', onPointerUp);
      runtime.setOrbitControlsEnabled(true);
    };
  }, [active, draftRef, studioRuntimeRef]);

  if (!active) return null;

  return (
    <canvas
      ref={canvasRef}
      className="pointer-events-none absolute inset-0 z-[15] h-full w-full"
      data-testid="face-mapping-marker-layer"
      aria-hidden
    />
  );
}
