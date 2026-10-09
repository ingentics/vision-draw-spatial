import { Group } from 'three';
import {
  clamp,
  createLabel,
  cubicTo,
  orientedPath,
  polygonArc,
  roundedPolygon,
  strokeMesh,
  styleFlag,
  styleNumber,
  styleStroke,
  VERTEX_DEFAULTS,
} from '../../../../core/plugins';
import type { Point, RenderContext, ShapeDefinition, ShapeModel } from '../../../../core/plugins';

/** Fraction de la largeur par défaut de draw.io pour `size` (retrait de la tige par rapport au bord droit). */
const DEFAULT_SIZE = 0.5;

/** Coefficient des points de contrôle d'une Bézier cubique approchant un quart de cercle (ou d'ellipse). */
const QUARTER_ARC = 0.5523;

/**
 * Accolade de draw.io (`mxCurlyBracket`) : polyligne ouverte à tige verticale à `size` × largeur du bord droit, pointe
 * au milieu du bord gauche. Avec `rounded=1`, les coins sont arrondis et la pointe est faite de deux quarts d'ellipse
 * qui quittent la tige verticalement et se rejoignent horizontalement en pointe fine (étape 423) ; sans, la pointe est
 * un aller-retour anguleux. `flipH` la retourne (`orientedPath`).
 */
function bracketPath(shape: ShapeModel): Point[] {
  const { style } = shape;
  return orientedPath(shape.bounds, style, (w, h) => {
    const stem = w * (1 - clamp(styleNumber(style, 'size', DEFAULT_SIZE), 0, 1));
    const mid = h / 2;
    if (!styleFlag(style, 'rounded')) {
      return [
        { x: w, y: 0 },
        { x: stem, y: 0 },
        { x: stem, y: mid },
        { x: 0, y: mid },
        { x: stem, y: mid },
        { x: stem, y: h },
        { x: w, y: h },
      ];
    }
    const arc = polygonArc(style);
    const curve = Math.min(Math.max(arc, stem), h / 4);
    const tip = { x: 0, y: mid };
    const above = { x: stem, y: mid - curve };
    const below = { x: stem, y: mid + curve };
    const top = roundedPolygon([{ x: w, y: 0 }, { x: stem, y: 0 }, above], arc, { closed: false });
    const bottom = roundedPolygon([below, { x: stem, y: h }, { x: w, y: h }], arc, { closed: false });
    return [
      ...top,
      ...cubicTo(above, { x: stem, y: mid - curve * (1 - QUARTER_ARC) }, { x: stem * QUARTER_ARC, y: mid }, tip),
      ...cubicTo(tip, { x: stem * QUARTER_ARC, y: mid }, { x: stem, y: mid + curve * (1 - QUARTER_ARC) }, below),
      ...bottom.slice(1),
    ];
  });
}

function create(shape: ShapeModel, ctx: RenderContext): Group {
  const group = new Group();
  const stroke = styleStroke(shape.style, VERTEX_DEFAULTS.stroke);
  if (stroke) {
    const mesh = strokeMesh(bracketPath(shape), stroke.color, stroke.opacity, {
      width: stroke.width,
      closed: false,
      dash: stroke.dash,
    });
    if (mesh) group.add(mesh);
  }
  const label = createLabel(shape, ctx);
  if (label) group.add(label);
  return group;
}

/** Accolade gauche `{` (`shape=curlyBracket`) : sans fond, texte à gauche ; l'accolade droite la retourne (`flipH=1`). */
export const definition: ShapeDefinition = {
  id: 'curly-bracket-left',
  kinds: ['curlyBracket'],
  matches: (shape) => !styleFlag(shape.style, 'flipH'),
  flippable: { horizontal: true, vertical: true },
  rotatable: true,
  flat: { create },
  palette: {
    name: 'Accolade gauche',
    category: 'general',
    order: 120,
    keywords: ['accolade', 'gauche', 'curly', 'brace', 'bracket', 'left', 'crochet'],
    style:
      'shape=curlyBracket;whiteSpace=wrap;html=1;rounded=1;labelPosition=left;verticalLabelPosition=middle;align=right;verticalAlign=middle;',
    value: '',
    width: 20,
    height: 120,
    icon: '<path fill="none" d="M26 3C20 3 20 5 20 8V11C20 13 17 14 14 14C17 14 20 15 20 17V20C20 23 20 25 26 25"/>',
  },
};
