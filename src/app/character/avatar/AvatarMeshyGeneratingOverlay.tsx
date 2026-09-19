/**
 * AvatarMeshyGeneratingOverlay — full-bleed Meshy generating atmosphere.
 * Location: src/app/character/avatar/AvatarMeshyGeneratingOverlay.tsx
 *
 * Cloudy spiral CSS loader (Hakim El Hattab / CodePen kawJWE) on the same
 * #0B1220 viewport ground as AvatarSurfaceViewer. Particle CSS is module-static
 * so progress re-renders cannot thrash the document stylesheet. Unmounts when idle.
 */

import { useEffect } from 'react';
import type { MeshyAvatarPollHealth } from '../../../domains/character/avatar/meshy-avatar-job';

interface AvatarMeshyGeneratingOverlayProps {
  progress: number;
  statusLabel?: string;
  pollHealth?: MeshyAvatarPollHealth;
  /** When true, fill parent (relative host). Default absolute inset-0 for stacking. */
  fillHost?: boolean;
}

const HEALTH_COPY: Record<MeshyAvatarPollHealth, string> = {
  idle: 'Warte auf Status …',
  connected: 'Verbindung aktiv',
  waiting: 'Antwort verzögert …',
  offline: 'Keine Verbindung — versuche erneut …',
};

/**
 * Tuned for a ~4/5 portrait card (not full CodePen viewport):
 * larger ring than early compact pass; shallow Z; no box-shadow.
 */
const SPIRAL_PARTICLES = 48;
const PARTICLE_SIZE_PX = 7;
const SPIRAL_RADIUS_PX = 100;
const LAP_DURATION_S = 3.6;
/** Keep Z travel within the card so particles stay soft, not clipped giants. */
const SPIRAL_Z_PX = 180;

function buildSpiralParticleCss(): string {
  const lines: string[] = [];
  for (let i = 1; i <= SPIRAL_PARTICLES; i += 1) {
    const angle = (i / SPIRAL_PARTICLES) * 720;
    const delay = i * (LAP_DURATION_S / SPIRAL_PARTICLES);
    lines.push(
      `.avatar-meshy-spiral>i:nth-child(${i}){transform:rotate(${angle}deg) translate3d(${SPIRAL_RADIUS_PX}px,0,0);animation-delay:${delay.toFixed(4)}s}`,
    );
  }
  return lines.join('');
}

/** Injected once — never rebuilt on progress ticks (that shook the whole editor). */
const SPIRAL_STYLE = `
.avatar-meshy-atmosphere{
  position:absolute;inset:0;z-index:0;
  background:#0B1220;
  isolation:isolate;
  contain:paint;
  overflow:hidden;
  border-radius:inherit;
}
.avatar-meshy-spiral-stage{
  position:absolute;
  inset:2%;
  overflow:hidden;
  perspective:480px;
  perspective-origin:50% 45%;
  transform:translateZ(0);
  backface-visibility:hidden;
}
.avatar-meshy-spiral{
  position:absolute;
  top:44%;
  left:50%;
  width:0;height:0;
  transform:scale(1.08);
  transform-style:preserve-3d;
  pointer-events:none;
}
.avatar-meshy-spiral>i{
  display:block;
  position:absolute;
  width:${PARTICLE_SIZE_PX}px;
  height:${PARTICLE_SIZE_PX}px;
  margin:0;
  border-radius:50%;
  opacity:0;
  background:rgba(255,255,255,0.55);
  /* Soft glow without animated box-shadow (cheaper + less edge hard-clip). */
  filter:none;
  animation-name:avatar-meshy-spiral-spin;
  animation-duration:${LAP_DURATION_S}s;
  animation-iteration-count:infinite;
  animation-timing-function:ease-in-out;
  animation-fill-mode:both;
}
${buildSpiralParticleCss()}
.avatar-meshy-atmosphere-vignette{
  position:absolute;inset:0;
  background:radial-gradient(
    circle at 50% 42%,
    transparent 28%,
    rgba(11,18,32,0.25) 62%,
    rgba(11,18,32,0.85) 100%
  );
  pointer-events:none;
}
@keyframes avatar-meshy-spiral-spin{
  from{opacity:0}
  to{
    opacity:0.55;
    transform:translate3d(${-PARTICLE_SIZE_PX / 2}px,${-PARTICLE_SIZE_PX / 2}px,${SPIRAL_Z_PX}px);
  }
}
@media (prefers-reduced-motion:reduce){
  .avatar-meshy-spiral>i{
    animation:none!important;
    opacity:0.3;
    transform:rotate(0deg) translate3d(${SPIRAL_RADIUS_PX}px,0,0)!important;
  }
  .avatar-meshy-spiral>i:nth-child(odd){opacity:0.15}
}
`;

let spiralStyleMounted = false;

function ensureSpiralStyleMounted(): void {
  if (typeof document === 'undefined') return;
  const id = 'avatar-meshy-spiral-style-v2';
  const existing = document.getElementById(id);
  if (existing) {
    spiralStyleMounted = true;
    return;
  }
  // Drop prior inject so radius/style bumps apply after HMR without full reload.
  document.getElementById('avatar-meshy-spiral-style')?.remove();
  const el = document.createElement('style');
  el.id = id;
  el.textContent = SPIRAL_STYLE;
  document.head.appendChild(el);
  spiralStyleMounted = true;
}

export function AvatarMeshyGeneratingOverlay({
  progress,
  statusLabel = 'Charakter wird erzeugt…',
  pollHealth = 'idle',
  fillHost = false,
}: AvatarMeshyGeneratingOverlayProps) {
  useEffect(() => {
    ensureSpiralStyleMounted();
  }, []);

  const clamped = Number.isFinite(progress)
    ? Math.max(0, Math.min(100, Math.round(progress)))
    : 0;
  const healthTone =
    pollHealth === 'connected'
      ? 'bg-teal-400'
      : pollHealth === 'waiting'
        ? 'bg-amber-400'
        : pollHealth === 'offline'
          ? 'bg-red-400'
          : 'bg-slate-500';

  const positionClass = fillHost
    ? 'relative h-full w-full min-h-[18rem]'
    : 'absolute inset-0 z-10';

  return (
    <div
      className={`${positionClass} pointer-events-none flex flex-col items-center justify-center gap-3 overflow-hidden px-4`}
      data-avatar-meshy-generating="true"
      data-avatar-meshy-poll-health={pollHealth}
      data-avatar-meshy-atmosphere="cloudy-spiral"
      role="status"
      aria-busy="true"
      aria-label={`${statusLabel} ${clamped} Prozent. ${HEALTH_COPY[pollHealth]}`}
    >
      <div className="avatar-meshy-atmosphere" aria-hidden>
        <div className="avatar-meshy-spiral-stage">
          <div className="avatar-meshy-spiral" data-avatar-meshy-spiral="true">
            {Array.from({ length: SPIRAL_PARTICLES }, (_, idx) => (
              <i key={idx} />
            ))}
          </div>
        </div>
        <div className="avatar-meshy-atmosphere-vignette" />
      </div>

      <div className="relative z-[1] flex w-full max-w-[14rem] flex-col items-center gap-3">
        <p className="min-h-[1.25rem] text-center text-sm font-medium text-slate-100">
          {statusLabel}
        </p>
        <div className="w-full space-y-1.5">
          <div className="h-1.5 overflow-hidden rounded-full bg-white/10">
            <div
              className="h-full rounded-full bg-sky-400/90 transition-[width] duration-700 ease-out"
              style={{ width: `${clamped}%` }}
              data-avatar-meshy-generating-progress={clamped}
            />
          </div>
          <p className="min-h-[1rem] text-center text-xs tabular-nums text-slate-300">
            {clamped}%
          </p>
        </div>
        <p
          className="flex min-h-[1.25rem] items-center gap-1.5 text-center text-[11px] text-slate-400"
          data-avatar-meshy-health
          aria-live="polite"
        >
          <span
            className={`inline-block h-1.5 w-1.5 shrink-0 rounded-full ${healthTone}`}
            aria-hidden
          />
          {HEALTH_COPY[pollHealth]}
        </p>
      </div>
    </div>
  );
}
