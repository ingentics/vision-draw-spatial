import type { BackgroundSettings, ShapeSettings } from '../../engine';
import { PreviewFrame } from './previewParts';

const RECT = { x: 20, y: 15, width: 160, height: 70 };

/**
 * Aperçu d'une forme non supportée (sujet 320) : le placeholder avec son fond et sa bordure en tirets, le nom de la
 * forme inconnue sous son texte (`core/shapes/placeholder.ts`).
 */
export function PlaceholderPreview({ shapes, background }: { shapes: ShapeSettings; background: BackgroundSettings }) {
  const center = RECT.x + RECT.width / 2;
  return (
    <PreviewFrame background={background} height={130} zoom={1.2} viewBox="0 0 200 100">
      <rect {...RECT} fill={shapes.placeholderFill} stroke={shapes.placeholderStroke} strokeDasharray="3 3" />
      <text x={center} y={RECT.y + RECT.height / 2 - 6} fontSize={11} textAnchor="middle" fill="#616161">
        Passerelle
      </text>
      <text x={center} y={RECT.y + RECT.height / 2 + 9} fontSize={11} textAnchor="middle" fill="#616161">
        [mxgraph.aws4.gateway]
      </text>
    </PreviewFrame>
  );
}
