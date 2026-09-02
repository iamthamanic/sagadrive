/**
 * AttributeD20Icon — Wireframe icosahedron (classic RPG d20) for attribute bonus cards in the Character Editor.
 * Location: src/components/AttributeD20Icon.tsx
 */
import { useId } from 'react';

type AttributeD20IconProps = {
  className?: string;
};

/** Pointy-top hex silhouette (icosahedron projection). */
const HEX_POINTS = '20,5 33,12 33,28 20,35 7,28 7,12';

/** Front-face equilateral triangle (apex, bottom-left, bottom-right). */
const TRI_APEX = { x: 20, y: 8 };
const TRI_BL = { x: 9.5, y: 26.5 };
const TRI_BR = { x: 30.5, y: 26.5 };

/** Nine facet spokes: each triangle vertex to three hex corners. */
const SPOKE_PATH = [
  `M${TRI_APEX.x} ${TRI_APEX.y} L20 5`,
  `M${TRI_APEX.x} ${TRI_APEX.y} L7 12`,
  `M${TRI_APEX.x} ${TRI_APEX.y} L33 12`,
  `M${TRI_BL.x} ${TRI_BL.y} L7 12`,
  `M${TRI_BL.x} ${TRI_BL.y} L7 28`,
  `M${TRI_BL.x} ${TRI_BL.y} L20 35`,
  `M${TRI_BR.x} ${TRI_BR.y} L33 12`,
  `M${TRI_BR.x} ${TRI_BR.y} L33 28`,
  `M${TRI_BR.x} ${TRI_BR.y} L20 35`,
].join(' ');

const TRIANGLE_PATH = `M${TRI_APEX.x} ${TRI_APEX.y} L${TRI_BL.x} ${TRI_BL.y} L${TRI_BR.x} ${TRI_BR.y} Z`;

const TEXT_FONT_SIZE = 10;
const TEXT_Y = 20;

export function AttributeD20Icon({ className }: AttributeD20IconProps) {
  const spokeMaskId = useId();

  return (
    <svg
      viewBox="0 0 40 40"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={`size-14 shrink-0 ${className ?? ''}`}
      aria-hidden="true"
    >
      <defs>
        <mask id={spokeMaskId}>
          <rect width="40" height="40" fill="white" />
          <rect x="10.5" y="13.5" width="19" height="13.5" rx="1.5" fill="black" />
        </mask>
      </defs>

      <polygon
        points={HEX_POINTS}
        className="stroke-gray-500/45"
        strokeWidth="1.25"
        strokeLinejoin="round"
      />

      <g mask={`url(#${spokeMaskId})`}>
        <path
          d={SPOKE_PATH}
          className="stroke-gray-500/45"
          strokeWidth="1.25"
          strokeLinecap="round"
        />
      </g>

      <path
        d={TRIANGLE_PATH}
        className="stroke-gray-500/45"
        strokeWidth="1.25"
        strokeLinejoin="round"
      />

      <text
        x="20"
        y={TEXT_Y}
        textAnchor="middle"
        dominantBaseline="middle"
        className="fill-white"
        fontSize={TEXT_FONT_SIZE}
        fontWeight="700"
        fontFamily="ui-sans-serif, system-ui, sans-serif"
      >
        20
      </text>
    </svg>
  );
}
