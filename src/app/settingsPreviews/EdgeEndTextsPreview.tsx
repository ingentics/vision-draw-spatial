import { edgeTextLayout } from '../../engine';
import type { BackgroundSettings, EdgeEnd, ShapeSettings } from '../../engine';
import { ArrowHead, PreviewFrame, PreviewShape, pathOf, sideOf } from './previewParts';

const SOURCE = { x: 15, y: 35, width: 70, height: 40 };
const TARGET = { x: 215, y: 35, width: 70, height: 40 };
const ROUTE = [sideOf(SOURCE, 'e'), sideOf(TARGET, 'w')];
const TEXTS: Record<EdgeEnd, string> = { start: '1', end: '0..n' };

/**
 * Aperçu des textes de début et de fin (sujet 321) : une flèche avec ses deux textes, placés comme à leur création
 * (`edgeTextLayout` : contre leur bout, aux écarts réglés de la forme et du trait), de la taille et de la couleur
 * réglées.
 */
export function EdgeEndTextsPreview({ shapes, background }: { shapes: ShapeSettings; background: BackgroundSettings }) {
  const gap = { along: shapes.edgeEndTextGapAlong, across: shapes.edgeEndTextGapAcross };
  return (
    <PreviewFrame background={background} height={160} zoom={1.6} viewBox="0 0 300 110">
      <PreviewShape rect={SOURCE} label="Client" />
      <PreviewShape rect={TARGET} label="Commande" />
      <path d={pathOf(ROUTE)} fill="none" stroke="#000000" />
      <ArrowHead points={ROUTE} color="#000000" />
      {(['start', 'end'] as const).map((end) => {
        const { placement, align, verticalAlign } = edgeTextLayout(ROUTE, end, false, gap);
        const tip = end === 'start' ? ROUTE[0]! : ROUTE[ROUTE.length - 1]!;
        return (
          <text
            key={end}
            x={tip.x + placement.offset.x}
            y={tip.y + placement.offset.y}
            fontSize={shapes.edgeEndTextSize}
            fill={shapes.edgeEndTextColor}
            textAnchor={align === 'left' ? 'start' : align === 'right' ? 'end' : 'middle'}
            dominantBaseline={
              verticalAlign === 'bottom' ? 'text-after-edge' : verticalAlign === 'top' ? 'text-before-edge' : 'central'
            }
          >
            {TEXTS[end]}
          </text>
        );
      })}
    </PreviewFrame>
  );
}
