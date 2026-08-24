import { useEffect, useRef, type RefObject } from 'react';
import type { CharacterAvatarDto } from '../types/character.types';

interface AvatarCanvasProps {
  avatar: CharacterAvatarDto;
  canvasRef?: RefObject<HTMLCanvasElement>;
  className?: string;
}

type Vec3 = readonly [number, number, number];

type BodyPart = {
  center: Vec3;
  radiusX: number;
  radiusY: number;
  depth: number;
  color: string;
  kind: 'ellipse' | 'ear' | 'hair';
};

function hexToRgba(hex: string, alpha: number): string {
  const value = hex.replace('#', '');
  const red = Number.parseInt(value.slice(0, 2), 16);
  const green = Number.parseInt(value.slice(2, 4), 16);
  const blue = Number.parseInt(value.slice(4, 6), 16);
  return `rgba(${red}, ${green}, ${blue}, ${alpha})`;
}

function shade(hex: string, amount: number): string {
  const value = hex.replace('#', '');
  const red = Math.max(0, Math.min(255, Number.parseInt(value.slice(0, 2), 16) + amount));
  const green = Math.max(0, Math.min(255, Number.parseInt(value.slice(2, 4), 16) + amount));
  const blue = Math.max(0, Math.min(255, Number.parseInt(value.slice(4, 6), 16) + amount));
  return `rgb(${red}, ${green}, ${blue})`;
}

function clothingColor(clothing?: string): string {
  switch (clothing) {
    case 'robe':
      return '#334E78';
    case 'armor':
      return '#5D6878';
    case 'leather':
      return '#6D4C35';
    case 'noble':
      return '#684B78';
    default:
      return '#3B4B5E';
  }
}

function buildParts(avatar: CharacterAvatarDto): BodyPart[] {
  const bodyScale = 0.78 + avatar.body.size / 180;
  const heightScale = 0.78 + avatar.body.height / 180;
  const skin = avatar.colors.skin;
  const hair = avatar.colors.hair;
  const clothes = clothingColor(avatar.traits.clothing);
  const isDwarf = avatar.preset === 'fantasy-dwarf';
  const isHalfling = avatar.preset === 'fantasy-halfling';
  const isOrc = avatar.preset === 'fantasy-orc';
  const isAlien = avatar.preset === 'scifi-alien';
  const isCyborg = avatar.preset === 'scifi-cyborg';
  const shortFactor = isDwarf ? 0.86 : isHalfling ? 0.8 : 1;
  const tallFactor = isAlien ? 1.08 : avatar.preset === 'fantasy-elf' ? 1.04 : 1;
  const torsoWidth = 0.72 * bodyScale * (isOrc ? 1.12 : isDwarf ? 1.08 : 1);
  const torsoHeight = 1.1 * heightScale * shortFactor * tallFactor;
  const headY = 1.3 * heightScale * shortFactor * tallFactor;
  const headWidth = isAlien ? 0.48 : isDwarf ? 0.43 : 0.39;
  const headHeight = isAlien ? 0.55 : 0.44;

  const parts: BodyPart[] = [
    { center: [0, 0.2, 0], radiusX: torsoWidth, radiusY: torsoHeight, depth: 0.34, color: clothes, kind: 'ellipse' },
    { center: [-torsoWidth * 0.9, 0.2, 0], radiusX: 0.2 * bodyScale, radiusY: torsoHeight * 0.86, depth: 0.26, color: clothes, kind: 'ellipse' },
    { center: [torsoWidth * 0.9, 0.2, 0], radiusX: 0.2 * bodyScale, radiusY: torsoHeight * 0.86, depth: 0.26, color: clothes, kind: 'ellipse' },
    { center: [-0.29 * bodyScale, -1.08 * heightScale * shortFactor, 0], radiusX: 0.25 * bodyScale, radiusY: 0.86 * heightScale * shortFactor, depth: 0.25, color: shade(clothes, -10), kind: 'ellipse' },
    { center: [0.29 * bodyScale, -1.08 * heightScale * shortFactor, 0], radiusX: 0.25 * bodyScale, radiusY: 0.86 * heightScale * shortFactor, depth: 0.25, color: shade(clothes, -10), kind: 'ellipse' },
    { center: [0, headY, 0.02], radiusX: headWidth, radiusY: headHeight, depth: 0.34, color: skin, kind: 'ellipse' },
  ];

  if (avatar.traits.ears === 'elf-long' || avatar.traits.ears === 'orc-pointed') {
    parts.push(
      { center: [-headWidth * 1.12, headY, 0], radiusX: 0.22, radiusY: 0.12, depth: 0.08, color: skin, kind: 'ear' },
      { center: [headWidth * 1.12, headY, 0], radiusX: 0.22, radiusY: 0.12, depth: 0.08, color: skin, kind: 'ear' },
    );
  }

  if (avatar.traits.hair && avatar.traits.hair !== 'bald') {
    const hairHeight = avatar.traits.hair === 'long' ? 0.34 : avatar.traits.hair === 'wild' ? 0.28 : 0.2;
    parts.push({
      center: [0, headY + headHeight * 0.55, -0.02],
      radiusX: headWidth * 1.08,
      radiusY: hairHeight,
      depth: 0.22,
      color: hair,
      kind: 'hair',
    });
    if (avatar.traits.hair === 'long' || avatar.traits.hair === 'braided') {
      parts.push({
        center: [0, headY - 0.18, -0.18],
        radiusX: headWidth * 0.9,
        radiusY: avatar.traits.hair === 'long' ? 0.48 : 0.36,
        depth: 0.16,
        color: shade(hair, -8),
        kind: 'hair',
      });
    }
  }

  if (isCyborg) {
    parts.push({ center: [0.18, headY + 0.05, 0.31], radiusX: 0.08, radiusY: 0.08, depth: 0.03, color: '#5EE7FF', kind: 'ellipse' });
  }

  return parts;
}

export function AvatarCanvas({ avatar, canvasRef, className }: AvatarCanvasProps) {
  const localRef = useRef<HTMLCanvasElement>(null);
  const targetRef = canvasRef ?? localRef;
  const rotationRef = useRef(0);
  const zoomRef = useRef(1);
  const draggingRef = useRef(false);
  const lastXRef = useRef(0);

  useEffect(() => {
    const canvas = targetRef.current;
    if (!canvas) return;
    const context = canvas.getContext('2d');
    if (!context) return;

    let frameId = 0;
    let active = true;

    const render = () => {
      if (!active) return;
      const rect = canvas.getBoundingClientRect();
      const dpr = window.devicePixelRatio || 1;
      const width = Math.max(1, Math.round(rect.width * dpr));
      const height = Math.max(1, Math.round(rect.height * dpr));
      if (canvas.width !== width || canvas.height !== height) {
        canvas.width = width;
        canvas.height = height;
      }

      context.setTransform(dpr, 0, 0, dpr, 0, 0);
      context.clearRect(0, 0, rect.width, rect.height);

      const gradient = context.createRadialGradient(
        rect.width * 0.5,
        rect.height * 0.46,
        20,
        rect.width * 0.5,
        rect.height * 0.5,
        rect.width * 0.72,
      );
      gradient.addColorStop(0, '#1E293B');
      gradient.addColorStop(1, '#0B1220');
      context.fillStyle = gradient;
      context.fillRect(0, 0, rect.width, rect.height);

      const groundY = rect.height * 0.86;
      context.strokeStyle = 'rgba(148, 163, 184, 0.18)';
      context.lineWidth = 1;
      for (let index = -3; index <= 3; index += 1) {
        const offset = index * rect.width * 0.12;
        context.beginPath();
        context.moveTo(rect.width * 0.5 + offset * 0.2, groundY - rect.height * 0.04);
        context.lineTo(rect.width * 0.5 + offset, rect.height);
        context.stroke();
      }
      context.beginPath();
      context.ellipse(rect.width * 0.5, groundY, rect.width * 0.19, rect.height * 0.035, 0, 0, Math.PI * 2);
      context.fillStyle = 'rgba(0, 0, 0, 0.34)';
      context.fill();

      const angle = rotationRef.current;
      const scale = Math.min(rect.width, rect.height) * 0.17 * zoomRef.current;
      const sin = Math.sin(angle);
      const cos = Math.cos(angle);
      const centerX = rect.width * 0.5;
      const centerY = rect.height * 0.54;
      const parts = buildParts(avatar)
        .map((part) => {
          const [x, y, z] = part.center;
          const rotatedX = x * cos - z * sin;
          const rotatedZ = x * sin + z * cos;
          const perspective = 1 + rotatedZ * 0.09;
          return {
            ...part,
            screenX: centerX + rotatedX * scale,
            screenY: centerY - y * scale,
            rotatedZ,
            perspective,
          };
        })
        .sort((left, right) => left.rotatedZ - right.rotatedZ);

      for (const part of parts) {
        const rx = part.radiusX * scale * part.perspective;
        const ry = part.radiusY * scale * part.perspective;
        const light = Math.round(18 * Math.sin(angle + part.center[0]));
        context.save();
        context.translate(part.screenX, part.screenY);
        if (part.kind === 'ear') {
          context.rotate(part.center[0] < 0 ? -0.26 : 0.26);
          context.beginPath();
          context.moveTo(part.center[0] < 0 ? -rx : rx, 0);
          context.lineTo(part.center[0] < 0 ? rx * 0.45 : -rx * 0.45, -ry);
          context.lineTo(part.center[0] < 0 ? rx * 0.45 : -rx * 0.45, ry);
          context.closePath();
        } else {
          context.beginPath();
          context.ellipse(0, 0, rx, ry, 0, 0, Math.PI * 2);
        }
        context.fillStyle = shade(part.color, light);
        context.fill();
        context.strokeStyle = hexToRgba('#FFFFFF', 0.08);
        context.lineWidth = 1;
        context.stroke();
        context.restore();
      }

      context.fillStyle = 'rgba(226, 232, 240, 0.78)';
      context.font = '12px Inter, sans-serif';
      context.textAlign = 'center';
      context.fillText('Ziehen zum Drehen · Mausrad zum Zoomen', rect.width * 0.5, rect.height - 18);
      frameId = window.requestAnimationFrame(render);
    };

    frameId = window.requestAnimationFrame(render);
    return () => {
      active = false;
      window.cancelAnimationFrame(frameId);
    };
  }, [avatar, targetRef]);

  return (
    <canvas
      ref={targetRef}
      className={className ?? 'h-full w-full touch-none rounded-lg'}
      aria-label={`Interaktive 3D-Vorschau für ${avatar.preset}`}
      onPointerDown={(event) => {
        draggingRef.current = true;
        lastXRef.current = event.clientX;
        event.currentTarget.setPointerCapture(event.pointerId);
      }}
      onPointerMove={(event) => {
        if (!draggingRef.current) return;
        const delta = event.clientX - lastXRef.current;
        lastXRef.current = event.clientX;
        rotationRef.current += delta * 0.012;
      }}
      onPointerUp={(event) => {
        draggingRef.current = false;
        event.currentTarget.releasePointerCapture(event.pointerId);
      }}
      onPointerCancel={() => {
        draggingRef.current = false;
      }}
      onWheel={(event) => {
        event.preventDefault();
        zoomRef.current = Math.max(0.78, Math.min(1.35, zoomRef.current - event.deltaY * 0.001));
      }}
    />
  );
}
