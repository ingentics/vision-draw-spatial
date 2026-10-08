import { inflate, loopWaypoints, SETTINGS_LIMITS } from '../../engine';
import type { BackgroundSettings, ShapeSettings } from '../../engine';
import { ArrowHead, PreviewFrame, PreviewShape, pathOf } from './previewParts';

const MAX_MARGIN = SETTINGS_LIMITS['shapes.edgeLoopMargin'].max;
/** Forme en bas à gauche : la boucle (haut, droite) a la place de sa marge la plus grande. */
const SHAPE = { x: 20, y: MAX_MARGIN + 10, width: 110, height: 50 };
const VIEW = { width: SHAPE.x + SHAPE.width + MAX_MARGIN + 10, height: SHAPE.y + SHAPE.height + 20 };

/**
 * Aperçu des nouvelles formes et flèches (sujet 321) : une forme au texte de la taille réglée, et une boucle (flèche
 * vers elle-même, du haut vers la droite) tracée à la marge réglée (`loopWaypoints`), la marge en pointillé.
 */
export function LoopPreview({ shapes, background }: { shapes: ShapeSettings; background: BackgroundSettings }) {
  const from = { point: { x: SHAPE.x + SHAPE.width * 0.75, y: SHAPE.y }, side: 'n' as const };
  const to = { point: { x: SHAPE.x + SHAPE.width, y: SHAPE.y + SHAPE.height * 0.5 }, side: 'e' as const };
  const route = [from.point, ...loopWaypoints(SHAPE, from, to, shapes.edgeLoopMargin), to.point];
  return (
    <PreviewFrame background={background} height={200} zoom={1.1} viewBox={`0 0 ${VIEW.width} ${VIEW.height}`}>
      <rect {...inflate(SHAPE, shapes.edgeLoopMargin)} fill="none" stroke="#9e9e9e" strokeDasharray="2 3" />
      <PreviewShape rect={SHAPE} label="Forme" fontSize={shapes.textSize} />
      <path d={pathOf(route)} fill="none" stroke="#000000" />
      <ArrowHead points={route} color="#000000" />
    </PreviewFrame>
  );
}
