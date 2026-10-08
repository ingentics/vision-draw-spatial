import { useId, useState } from 'react';
import { boundsOfPoints, inflate } from '../../engine';
import type { BackgroundSettings, Rect, SelectionSettings } from '../../engine';
import { ArrowHead, PreviewFrame, PreviewShape, pathOf, sideOf } from './previewParts';

const LEFT = { x: 20, y: 25, width: 90, height: 45 };
const RIGHT = { x: 210, y: 70, width: 90, height: 45 };
const ROUTE = [sideOf(LEFT, 'e'), { x: 160, y: 47.5 }, { x: 160, y: 92.5 }, sideOf(RIGHT, 'w')];

type Selected = 'left' | 'right' | 'edge';

/**
 * Aperçu de la sélection (sujet 320) : deux formes et une flèche, l'une sélectionnée (un clic en choisit une autre).
 * Voile : le reste passe sous le voile, percé autour d'une flèche de la marge réglée ; contour : cadre en tirets de
 * la couleur d'accent, à 3 pixels de l'élément, qui défilent s'il est animé (comme `render/decorations.ts`). Les
 * poignées prennent la couleur d'accent dans les deux cas (`render/handleMeshes.ts`).
 */
export function SelectionPreview({
  selection,
  background,
}: {
  selection: SelectionSettings;
  background: BackgroundSettings;
}) {
  const [selected, setSelected] = useState<Selected>('edge');
  const mask = useId();
  const bounds = selected === 'edge' ? boundsOfPoints(ROUTE)! : selected === 'left' ? LEFT : RIGHT;
  const edge = (
    <g onClick={() => setSelected('edge')} className="settings-preview-pick">
      {/* Zone de clic plus large que le trait. */}
      <path d={pathOf(ROUTE)} fill="none" stroke="transparent" strokeWidth={10} />
      <path d={pathOf(ROUTE)} fill="none" stroke="#000000" strokeWidth={1} />
      <ArrowHead points={ROUTE} color="#000000" />
    </g>
  );
  const shape = (side: 'left' | 'right') => (
    <PreviewShape
      rect={side === 'left' ? LEFT : RIGHT}
      label={side === 'left' ? 'Client' : 'API'}
      onClick={() => setSelected(side)}
    />
  );
  return (
    <PreviewFrame
      background={background}
      height={180}
      zoom={1.3}
      viewBox="0 0 320 140"
      hint="Cliquer une forme ou la flèche pour la sélectionner."
    >
      {shape('left')}
      {shape('right')}
      {edge}
      {selection.style === 'veil' ? (
        <>
          <mask id={mask}>
            <rect x={-1000} y={-1000} width={3000} height={3000} fill="#ffffff" />
            {selected === 'edge' && (
              <path
                d={pathOf(ROUTE)}
                fill="none"
                stroke="#000000"
                strokeWidth={2 * selection.veilPadding}
                strokeLinejoin="round"
                strokeLinecap="round"
              />
            )}
          </mask>
          <rect
            x={-1000}
            y={-1000}
            width={3000}
            height={3000}
            fill={selection.veilColor}
            opacity={selection.veilOpacity}
            mask={`url(#${mask})`}
            pointerEvents="none"
          />
          {/* L'élément sélectionné, redessiné par-dessus le voile. */}
          {selected === 'edge' ? edge : shape(selected)}
        </>
      ) : (
        <rect
          {...inflate(bounds, 3)}
          fill="none"
          stroke={selection.accentColor}
          strokeWidth={1.5}
          strokeDasharray="5 3"
          vectorEffect="non-scaling-stroke"
          pointerEvents="none"
          className={selection.animated ? 'settings-preview-ants' : undefined}
          style={selection.animated ? { animationDuration: `${8 / selection.speed}s` } : undefined}
        />
      )}
      <Handles selected={selected} bounds={bounds} accent={selection.accentColor} />
    </PreviewFrame>
  );
}

/** Poignées de l'élément sélectionné : carrés blancs bordés d'accent d'une forme, disques d'accent des bouts d'une flèche. */
function Handles({ selected, bounds, accent }: { selected: Selected; bounds: Rect; accent: string }) {
  if (selected === 'edge')
    return (
      <>
        {[ROUTE[0]!, ROUTE[ROUTE.length - 1]!].map((p, i) => (
          <circle key={i} cx={p.x} cy={p.y} r={4} fill={accent} stroke="#ffffff" strokeWidth={1} pointerEvents="none" />
        ))}
      </>
    );
  const { x, y, width, height } = bounds;
  const points = [0, 0.5, 1].flatMap((u) =>
    [0, 0.5, 1].filter((v) => u !== 0.5 || v !== 0.5).map((v) => ({ x: x + u * width, y: y + v * height })),
  );
  return (
    <>
      {points.map((p, i) => (
        <rect
          key={i}
          x={p.x - 3}
          y={p.y - 3}
          width={6}
          height={6}
          fill="#ffffff"
          stroke={accent}
          strokeWidth={1}
          pointerEvents="none"
        />
      ))}
    </>
  );
}
