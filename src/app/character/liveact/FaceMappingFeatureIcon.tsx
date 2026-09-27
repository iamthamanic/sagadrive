/**
 * FaceMappingFeatureIcon — anatomical silhouette icons for Face Mapping detail/panel.
 * Location: src/app/character/liveact/FaceMappingFeatureIcon.tsx
 *
 * PDF sketch: show which Körperteil is selected and pulse the matching landmark
 * on a simple feature silhouette (eye / mouth / brow / nose / chin / forehead).
 */

import type { SagaDriveFaceAnchorId } from '../../../domains/character/avatar/face-anchor-contract';

export type FaceMappingFeatureKind =
  | 'eyeLeft'
  | 'eyeRight'
  | 'mouth'
  | 'browLeft'
  | 'browRight'
  | 'nose'
  | 'chin'
  | 'forehead';

export function resolveFaceMappingFeatureKind(anchorId: SagaDriveFaceAnchorId): FaceMappingFeatureKind {
  if (anchorId.startsWith('eyeLeft')) return 'eyeLeft';
  if (anchorId.startsWith('eyeRight')) return 'eyeRight';
  if (anchorId.startsWith('browLeft')) return 'browLeft';
  if (anchorId.startsWith('browRight')) return 'browRight';
  if (anchorId.startsWith('mouth')) return 'mouth';
  if (anchorId === 'noseTip') return 'nose';
  if (anchorId === 'chin') return 'chin';
  return 'forehead';
}

/** Landmark slot positions inside a 48×48 viewBox (silhouette + highlight). */
const EYE_SLOTS: Record<string, { x: number; y: number }> = {
  Inner: { x: 16, y: 24 },
  Outer: { x: 32, y: 24 },
  Upper: { x: 24, y: 16 },
  Lower: { x: 24, y: 32 },
};

const MOUTH_SLOTS: Record<string, { x: number; y: number }> = {
  mouthUpper: { x: 24, y: 18 },
  mouthLower: { x: 24, y: 30 },
  mouthCornerLeft: { x: 12, y: 24 },
  mouthCornerRight: { x: 36, y: 24 },
};

const BROW_SLOTS: Record<string, { x: number; y: number }> = {
  Inner: { x: 14, y: 26 },
  Center: { x: 24, y: 18 },
  Outer: { x: 34, y: 26 },
};

function eyeSlot(anchorId: SagaDriveFaceAnchorId): { x: number; y: number } | null {
  if (anchorId.includes('Inner')) return EYE_SLOTS.Inner;
  if (anchorId.includes('Outer')) return EYE_SLOTS.Outer;
  if (anchorId.includes('Upper')) return EYE_SLOTS.Upper;
  if (anchorId.includes('Lower')) return EYE_SLOTS.Lower;
  return null;
}

function browSlot(anchorId: SagaDriveFaceAnchorId): { x: number; y: number } | null {
  if (anchorId.includes('Inner')) return BROW_SLOTS.Inner;
  if (anchorId.includes('Center')) return BROW_SLOTS.Center;
  if (anchorId.includes('Outer')) return BROW_SLOTS.Outer;
  return null;
}

function highlightSlot(
  kind: FaceMappingFeatureKind,
  anchorId: SagaDriveFaceAnchorId,
): { x: number; y: number } | null {
  switch (kind) {
    case 'eyeLeft':
    case 'eyeRight':
      return eyeSlot(anchorId);
    case 'mouth':
      return MOUTH_SLOTS[anchorId] ?? null;
    case 'browLeft':
    case 'browRight':
      return browSlot(anchorId);
    case 'nose':
      return { x: 24, y: 28 };
    case 'chin':
      return { x: 24, y: 34 };
    case 'forehead':
      return { x: 24, y: 16 };
    default:
      return null;
  }
}

interface FaceMappingFeatureIconProps {
  anchorId: SagaDriveFaceAnchorId;
  /** Larger icon for detail card. */
  size?: 'sm' | 'lg';
  pulse?: boolean;
  className?: string;
}

export function FaceMappingFeatureIcon({
  anchorId,
  size = 'lg',
  pulse = false,
  className = '',
}: FaceMappingFeatureIconProps) {
  const kind = resolveFaceMappingFeatureKind(anchorId);
  const slot = highlightSlot(kind, anchorId);
  const px = size === 'lg' ? 48 : 28;

  return (
    <svg
      width={px}
      height={px}
      viewBox="0 0 48 48"
      className={className}
      aria-hidden
      data-testid="face-mapping-feature-icon"
      data-feature-kind={kind}
    >
      <rect width="48" height="48" rx="8" fill="rgba(2, 6, 23, 0.85)" />
      {kind === 'eyeLeft' || kind === 'eyeRight' ? (
        <path
          d="M10 24 C16 14, 32 14, 38 24 C32 34, 16 34, 10 24 Z"
          fill="none"
          stroke="rgba(96,165,250,0.95)"
          strokeWidth="2"
        />
      ) : null}
      {kind === 'mouth' ? (
        <path
          d="M10 24 C16 14, 32 14, 38 24 C32 34, 16 34, 10 24 Z"
          fill="none"
          stroke="rgba(52,211,153,0.95)"
          strokeWidth="2"
        />
      ) : null}
      {kind === 'browLeft' || kind === 'browRight' ? (
        <path
          d="M10 28 Q24 12 38 28"
          fill="none"
          stroke="rgba(251,191,36,0.95)"
          strokeWidth="2.5"
          strokeLinecap="round"
        />
      ) : null}
      {kind === 'nose' ? (
        <path
          d="M24 10 L18 34 Q24 38 30 34 Z"
          fill="none"
          stroke="rgba(226,232,240,0.85)"
          strokeWidth="2"
        />
      ) : null}
      {kind === 'chin' ? (
        <path
          d="M12 18 Q24 40 36 18"
          fill="none"
          stroke="rgba(226,232,240,0.85)"
          strokeWidth="2"
          strokeLinecap="round"
        />
      ) : null}
      {kind === 'forehead' ? (
        <path
          d="M10 28 Q24 10 38 28"
          fill="none"
          stroke="rgba(226,232,240,0.85)"
          strokeWidth="2"
          strokeLinecap="round"
        />
      ) : null}

      {slot ? (
        <g>
          {pulse ? (
            <circle cx={slot.x} cy={slot.y} r="7" fill="rgba(6,182,212,0.35)">
              <animate
                attributeName="r"
                values="5;9;5"
                dur="1s"
                repeatCount="indefinite"
              />
              <animate
                attributeName="opacity"
                values="0.55;0.15;0.55"
                dur="1s"
                repeatCount="indefinite"
              />
            </circle>
          ) : null}
          <circle
            cx={slot.x}
            cy={slot.y}
            r="3.5"
            fill="rgb(6,182,212)"
            stroke="white"
            strokeWidth="1.25"
            data-testid="face-mapping-feature-icon-pulse"
          />
        </g>
      ) : null}
    </svg>
  );
}
