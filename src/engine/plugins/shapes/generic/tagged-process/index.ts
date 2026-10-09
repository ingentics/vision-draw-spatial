import { spatialValue, styleFlag, styleNumber, boxOutline, orientation, clamp } from '../../../../core/plugins';
import type {
  PaletteEntry,
  Point,
  SceneRenderer,
  ShapeDefinition,
  ShapeDetail,
  ShapeModel,
} from '../../../../core/plugins';
import type { Group } from 'three';
import { box } from '../box';
import { TAG, darker, facadeTag, tagOf, tagSize } from '../building';

/** Écarts des lignes par défaut de `internalStorage` (`dx`, `dy`), en px. */
const DEFAULT_DX = 20;
const DEFAULT_DY = 20;
/**
 * `arcSize` par défaut d'un rectangle arrondi (`RECTANGLE_ROUNDING_FACTOR`), en %. Pour les lignes, draw.io le lit
 * toujours en % et ignore `absoluteArcSize` (contrairement au contour, `cornerRadius`) : on fait de même.
 */
const DEFAULT_ARC_SIZE = 15;
/** Largeur de la tranche dans la palette (`dx`), en px : fixe, quelle que soit la taille de la forme. */
const TAG_BAND = 16;
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
  const corner = styleFlag(style, 'rounded') ? Math.min(w * arc, h * arc) : 0;
  return {
    x: clamp(styleNumber(style, 'dx', DEFAULT_DX), corner, w),
    y: clamp(styleNumber(style, 'dy', DEFAULT_DY), corner, h),
  };
}

function outline(shape: ShapeModel): Point[] {
  return boxOutline(shape.bounds, shape.style);
}

/** Mot de la tranche : `spatial.tag`, sinon celui de la forme ; vide = aucun. */
const wordOf = (shape: ShapeModel, tag: string) => (spatialValue(shape, TAG) ?? tag).trim();

/**
 * Les deux lignes de draw.io, puis le mot de la tranche (entre le bord et la verticale), écrit de bas en haut ;
 * exporté pour comparer les lignes à draw.io (`shapesFixture`).
 */
export function taggedDetails(shape: ShapeModel, tag: string): ShapeDetail[] {
  const { bounds, style } = shape;
  const oriented = orientation(bounds, style);
  const { width: w, height: h } = oriented;
  const { x, y } = lines(style, w, h);
  const result: ShapeDetail[] = [
    {
      path: [
        { x, y: 0 },
        { x, y: h },
      ].map(oriented.map),
      closed: false,
    },
    {
      path: [
        { x: 0, y },
        { x: w, y },
      ].map(oriented.map),
      closed: false,
    },
  ];
  const text = wordOf(shape, tag);
  if (!text) return result;
  // Mot au centre de la tranche, écrit vers le haut du cadre local, orienté avec la forme.
  const up = oriented.direction({ x: 0, y: -1 });
  result.push({
    text,
    at: oriented.map({ x: x / 2, y: h / 2 }),
    angle: Math.atan2(up.y, up.x),
    fontSize: TAG_SIZE,
    color: darker(shape, TAG_SHADE),
    bold: true,
    fit: {
      width: Math.max(0, h - 2 * TAG_MARGIN),
      height: Math.max(0, x - 2 * TAG_MARGIN),
    },
  });
  return result;
}

/**
 * Rendu iso / 3D : prisme du contour, lignes et mot de la tranche sur le dessus (comme en 2D), et le mot aussi en
 * façade, en bas à droite de chaque face (comme l'étiquette des bâtiments ; coupé par le réglage des étiquettes de
 * façade). Sans volume (pas de fond), le rendu à plat.
 */
function isoTagged(tag: string): SceneRenderer {
  const block = box(outline, { details: (shape) => taggedDetails(shape, tag) }).iso!;
  return {
    create(shape, ctx) {
      const group = block.create(shape, ctx) as Group;
      const height = group.userData.height as number | undefined;
      const text = height !== undefined && wordOf(shape, tag) && tagOf(shape, ctx, tag);
      if (text) facadeTag(group, shape, ctx, text, tagSize(height));
      return group;
    },
  };
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
 * et mot sur le dessus, mot aussi en façade.
 */
export function taggedProcess(
  id: string,
  tag: string,
  palette: Pick<PaletteEntry, 'name' | 'order' | 'keywords'>,
): ShapeDefinition {
  return {
    id,
    ...box(outline, { details: (shape) => taggedDetails(shape, tag) }),
    iso: isoTagged(tag),
    contains: () => true,
    properties: [
      { type: 'toggle', key: 'rounded', label: 'Coins arrondis', section: 'border' },
      {
        type: 'text',
        key: TAG,
        live: true,
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
