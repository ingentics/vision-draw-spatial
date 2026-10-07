import { stencilShape } from '../../../../../core/plugins';
import type { Point, ShapeDefinition } from '../../../../../core/plugins';
import { actorDefinition } from '../common/definition';
import { DROID_FRAME, DROID_H, DROID_W, droidFigure } from './figure';

/** Tracé de stencil d'une ligne brisée, fermée ou non. */
function stencilPath(points: Point[], closed: boolean): string {
  const at = (p: Point) => `x="${+p.x.toFixed(3)}" y="${+p.y.toFixed(3)}"`;
  return (
    '<path>' +
    points.map((p, i) => `<${i === 0 ? 'move' : 'line'} ${at(p)}/>`).join('') +
    (closed ? '<close/>' : '') +
    '</path>'
  );
}

/**
 * XML du stencil draw.io, tiré des mêmes points que le rendu : la tête en fond, puis l'embout de l'antenne, le corps et la tige ; les
 * pièces prennent le fond et la bordure de la forme, les traits la bordure.
 */
function droidStencilXml(): string {
  const [head, ...parts] = DROID_FRAME.parts;
  return (
    `<shape name="actor-droid" w="${DROID_W}" h="${DROID_H}" aspect="variable" strokewidth="inherit">` +
    `<background>${stencilPath(head!, true)}</background>` +
    '<foreground><fillstroke/>' +
    parts.map((part) => `${stencilPath(part, true)}<fillstroke/>`).join('') +
    DROID_FRAME.strokes.map((line) => `${stencilPath(line, false)}<stroke/>`).join('') +
    '</foreground></shape>'
  );
}

/** Valeur de `shape=` du droid (stencil embarqué, compressé comme draw.io). */
export const DROID_SHAPE = stencilShape(droidStencilXml());

/**
 * Droid : l'Actor (`../common/definition.ts`) avec une tête de droid de combat et une antenne à droite. Pas de droid natif dans
 * draw.io : stencil embarqué dans le style (`shape=stencil(…)`, nom `actor-droid`), dessiné à l'identique par draw.io.
 */
export const definition: ShapeDefinition = {
  id: 'actor-droid',
  kinds: ['stencil:actor-droid'],
  ...actorDefinition(droidFigure),
  swatch: () =>
    '<path d="M17.8 2.5h4.4l1 2.7l-.6 2.4l-1.2 2.9h-2.8l-1.2-2.9l-.6-2.4z"/>' +
    '<ellipse cx="24" cy="2" rx=".5" ry="1"/><path d="M23 5.8h1V3M20 10.5v7M14 13h12M15 25l5-7.5l5 7.5"/>',
  palette: {
    name: 'Droid',
    category: 'general',
    order: 111,
    keywords: ['droid', 'robot', 'bot', 'android', 'actor', 'acteur', 'agent', 'automate', 'ia', 'ai', 'uml'],
    style: `shape=${DROID_SHAPE};verticalLabelPosition=bottom;verticalAlign=top;html=1;outlineConnect=0;`,
    value: 'Droid',
    width: 30,
    height: 60,
    icon:
      '<path d="M17.8 0.6h4.4l1 2.7l-.6 2.4l-1.2 2.8h-2.8l-1.2-2.8l-.6-2.4z"/>' +
      '<ellipse cx="24" cy="0.2" rx=".5" ry="1"/><path d="M23 3.9h1V1.2M20 8.5v9M13 12h14M14 26l6-8.5l6 8.5"/>',
  },
};
