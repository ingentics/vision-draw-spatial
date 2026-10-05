import type { Point, ShapeModel } from '../../../model/types';
import { orientedPath } from '../../../render/geometry/orient';
import { cornerRadius, rectPath, roundedRectPath } from '../../../render/geometry/paths';
import { styleNumber } from '../../../render/styleValues';
import { SPATIAL, spatialValue } from '../../../spatial';
import type { PaletteEntry, ShapeDefinition, ShapeDetail } from '../../types';
import { box } from '../box';
import { darker } from '../building';

/** Écarts des lignes par défaut de `internalStorage` (`dx`, `dy`), en px. */
const DEFAULT_DX = 20;
const DEFAULT_DY = 20;
/** `arcSize` par défaut d'un rectangle arrondi (`RECTANGLE_ROUNDING_FACTOR`), en %. */
const DEFAULT_ARC_SIZE = 15;
/** Largeur de la tranche dans la palette (`dx`), en px : fixe, quelle que soit la taille de la forme. */
export const TAG_BAND = 16;
/** Taille du mot de la tranche, réduite si la tranche ou la forme sont trop petites. */
const TAG_SIZE = 9;
/** Marge du mot dans la tranche, de chaque côté, en px. */
const TAG_MARGIN = 2;
/** Teinte du mot : celle des étiquettes de façade (fond assombri). */
const TAG_SHADE = 0.45;

/**
 * Lignes de `internalStorage` dans le cadre local `w` × `h`, comme `paintForeground` de draw.io : verticale à `dx` du
 * bord gauche, horizontale à `dy` du haut (au plus la taille, au moins le coin avec `rounded=1`).
 */
function lines(style: Record<string, string>, w: number, h: number) {
  const arc = styleNumber(style, 'arcSize', DEFAULT_ARC_SIZE) / 100;
  const corner = style.rounded === '1' ? Math.min(w * arc, h * arc) : 0;
  return {
    x: Math.max(corner, Math.min(w, styleNumber(style, 'dx', DEFAULT_DX))),
    y: Math.max(corner, Math.min(h, styleNumber(style, 'dy', DEFAULT_DY))),
  };
}

function outline(shape: ShapeModel): Point[] {
  return shape.style.rounded === '1'
    ? roundedRectPath(shape.bounds, cornerRadius(shape.style, shape.bounds))
    : rectPath(shape.bounds);
}

/** Les deux lignes de draw.io, puis le mot de la tranche (entre le bord et la verticale), écrit de bas en haut. */
function details(shape: ShapeModel, tag: string): ShapeDetail[] {
  const { bounds, style } = shape;
  const oriented = (draw: (w: number, h: number) => Point[]) => orientedPath(bounds, style, draw);
  const vertical = oriented((w, h) => {
    const { x } = lines(style, w, h);
    return [
      { x, y: 0 },
      { x, y: h },
    ];
  });
  const horizontal = oriented((w, h) => {
    const { y } = lines(style, w, h);
    return [
      { x: 0, y },
      { x: w, y },
    ];
  });
  const result: ShapeDetail[] = [
    { path: vertical, closed: false },
    { path: horizontal, closed: false },
  ];
  const text = (spatialValue(shape, SPATIAL.tag) ?? tag).trim();
  if (!text) return result;
  let band = { width: 0, length: 0 };
  // Centre de la tranche et un point au-dessus : la direction d'écriture, orientée avec la forme.
  const [center, above] = oriented((w, h) => {
    const { x } = lines(style, w, h);
    band = { width: x, length: h };
    return [
      { x: x / 2, y: h / 2 },
      { x: x / 2, y: h / 2 - 1 },
    ];
  });
  result.push({
    text,
    at: center!,
    angle: Math.atan2(above!.y - center!.y, above!.x - center!.x),
    fontSize: TAG_SIZE,
    color: darker(shape, TAG_SHADE),
    bold: true,
    fit: {
      width: Math.max(0, band.length - 2 * TAG_MARGIN),
      height: Math.max(0, band.width - 2 * TAG_MARGIN),
    },
  });
  return result;
}

/** Icône de palette : la forme et son mot dans la tranche, de bas en haut. */
const icon = (tag: string) =>
  '<path d="M4 4h32v20H4zM30 4v20"/>' +
  `<text x="33" y="14" transform="rotate(-90 33 14)" text-anchor="middle" dominant-baseline="central" ` +
  `textLength="${Math.min(16, tag.length * 3)}" lengthAdjust="spacingAndGlyphs" ` +
  `style="font-size:4.5px;font-weight:700">${tag}</text>`;

/**
 * Process à tranche étiquetée : forme native `internalStorage` de draw.io, une seule ligne (`dy=0`) à `dx` px du bord,
 * retournée à droite (`flipH=1`) : la tranche garde sa largeur quand on redimensionne. Le mot de la tranche (`tag`,
 * `spatial.tag` le remplace) est en capitales grises, écrit de bas en haut ; seul Drawio Spatial le dessine (draw.io
 * montre la tranche vide). La forme est désignée par `spatial.kind` (son `id`). Prisme du contour en iso / 3D, lignes
 * et mot sur le dessus.
 */
export function taggedProcess(
  id: string,
  tag: string,
  palette: Pick<PaletteEntry, 'name' | 'order' | 'keywords'>,
): ShapeDefinition {
  return {
    id,
    ...box(outline, { details: (shape) => details(shape, tag) }),
    contains: () => true,
    properties: [
      { type: 'toggle', key: 'rounded', label: 'Coins arrondis', section: 'border' },
      {
        type: 'text',
        key: SPATIAL.tag,
        label: 'Étiquette',
        section: 'shape',
        title: `Mot de la tranche (spatial.tag) ; vide = « ${tag} »`,
        placeholder: tag,
      },
    ],
    swatch: () => '<path d="M6 5h28v18H6zM29 5v18"/>',
    palette: {
      ...palette,
      category: 'architecture',
      style:
        'shape=internalStorage;whiteSpace=wrap;html=1;backgroundOutline=1;' +
        `dx=${TAG_BAND};dy=0;flipH=1;spacingRight=${TAG_BAND};spatial.kind=${id};`,
      value: '',
      width: 120,
      height: 60,
      icon: icon(tag),
    },
  };
}
