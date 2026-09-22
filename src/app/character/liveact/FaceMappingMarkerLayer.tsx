/**
 * FaceMappingMarkerLayer — imperative canvas markers for Face Setup (#420).
 * Location: src/app/character/liveact/FaceMappingMarkerLayer.tsx
 *
 * Projects draft bindings via CharacterStudioRuntime; no React setState per frame.
 * Short pointer taps on the WebGL canvas raycast the selected marker onto the mesh.
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

      for (const id of SAGA_DRIVE_FACE_ANCHOR_IDS) {
        const binding = draft.anchors[id];
        if (!binding) continue;
        const world = rt.evaluateFaceMappingBindingWorld(binding);
        if (!world) continue;
        const screen = rt.projectWorldToFaceMappingCanvas(world.x, world.y, world.z);
        if (!screen) continue;
        const status = resolveFaceMappingMarkerStatus(draft, id);
        const selected = draft.selectedAnchorId === id;
        ctx.beginPath();
        ctx.arc(screen.x, screen.y, selected ? 7 : 5, 0, Math.PI * 2);
        ctx.fillStyle = selected ? STATUS_FILL.selected : STATUS_FILL[status];
        ctx.fill();
        if (selected) {
          ctx.strokeStyle = 'rgba(255,255,255,0.9)';
          ctx.lineWidth = 1.5;
          ctx.stroke();
        }
      }
      raf = requestAnimationFrame(paint);
    };
    raf = requestAnimationFrame(paint);

    const onPointerDown = (event: PointerEvent) => {
      if (event.button !== 0) return;
      const draft = draftRef.current;
      const rt = studioRuntimeRef.current;
      if (!draft?.selectedAnchorId || !rt) return;
      const startX = event.clientX;
      const startY = event.clientY;
      const startT = performance.now();
      const anchorId = draft.selectedAnchorId;

      const onUp = (up: PointerEvent) => {
        window.removeEventListener('pointerup', onUp);
        const dx = up.clientX - startX;
        const dy = up.clientY - startY;
        if (Math.hypot(dx, dy) > 6 || performance.now() - startT > 450) return;
        const rect = rt.getFaceMappingCanvasElement().getBoundingClientRect();
        const hit = rt.raycastFaceMappingAtCanvas(up.clientX - rect.left, up.clientY - rect.top);
        onPlaceRef.current(anchorId, hit?.binding ?? null);
      };
      window.addEventListener('pointerup', onUp);
    };

    const gl = runtime.getFaceMappingCanvasElement();
    gl.addEventListener('pointerdown', onPointerDown);

    return () => {
      cancelAnimationFrame(raf);
      gl.removeEventListener('pointerdown', onPointerDown);
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
