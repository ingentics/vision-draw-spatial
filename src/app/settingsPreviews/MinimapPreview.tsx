import type { BackgroundSettings, MinimapSettings } from '../../engine';
import { PreviewFrame, pathOf } from './previewParts';

/** Page dessinée dans la mini-carte, en pixels de page (sa largeur fait celle de la mini-carte). */
const PAGE = { width: 500, height: 300 };
const SHAPES = [
  { x: 20, y: 30, width: 120, height: 60 },
  { x: 300, y: 20, width: 140, height: 70 },
  { x: 160, y: 200, width: 120, height: 60 },
];
const EDGES = [
  [
    { x: 140, y: 60 },
    { x: 300, y: 55 },
  ],
  [
    { x: 80, y: 90 },
    { x: 80, y: 230 },
    { x: 160, y: 230 },
  ],
  [
    { x: 370, y: 90 },
    { x: 370, y: 230 },
    { x: 280, y: 230 },
  ],
];
/** Emprise de la vue principale. */
const VIEW = { x: 120, y: 10, width: 260, height: 170 };

/**
 * Aperçu de la mini-carte (sujet 320) : un cadre à la largeur réglée en bas à droite d'un bout de plan, formes
 * (fond blanc, contour réglé), flèches de leur couleur et emprise de la vue en couleur d'accent (`minimapLayout.ts`).
 */
export function MinimapPreview({
  minimap,
  background,
  accent,
}: {
  minimap: MinimapSettings;
  background: BackgroundSettings;
  accent: string;
}) {
  const height = (minimap.size * PAGE.height) / PAGE.width;
  // Traits à leur épaisseur dans la mini-carte (pixels CSS), quelle que soit l'échelle.
  const line = { vectorEffect: 'non-scaling-stroke' } as const;
  return (
    <PreviewFrame background={background} height={height + 40} disabled={!minimap.visible}>
      <div className="settings-preview-minimap" style={{ width: minimap.size, height }}>
        <svg viewBox={`0 0 ${PAGE.width} ${PAGE.height}`} style={{ background: background.color }}>
          {SHAPES.map((rect, i) => (
            <rect key={i} {...rect} fill="#ffffff" stroke={minimap.outlineColor} strokeWidth={0.75} {...line} />
          ))}
          {EDGES.map((points, i) => (
            <path key={i} d={pathOf(points)} fill="none" stroke={minimap.edgeColor} strokeWidth={0.75} {...line} />
          ))}
          <rect {...VIEW} fill={accent} fillOpacity={0.1} stroke={accent} strokeWidth={1.5} {...line} />
        </svg>
      </div>
    </PreviewFrame>
  );
}
