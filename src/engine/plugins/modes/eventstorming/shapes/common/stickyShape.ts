import type { Object3D } from 'three';
import { createLabel, markPart, styleNumber } from '../../../../../core/plugins';
import type { RenderContext, ShapeDefinition, ShapeModel } from '../../../../../core/plugins';
import { STICKY_TYPES } from '../../kinds';
import type { StickyType } from '../../kinds';
import { GROUP_PART, TITLE_LEFT, TITLE_TEXT } from '../../groups/groupLabels';
import { GROUP_TITLE } from '../../groups/stickyGroups';
import { isPivot } from '../../pivot/pivot';
import { PIVOT_MARK, pivotMark, pivotMarkRect } from '../../pivot/pivotMark';
import { STICKY_BADGE, stickyBadge, stickyBadgeRect } from '../../warnings/stickyBadge';
import { drawnBadge } from '../../warnings/stickyWarnings';
import { STICKY, labelFontSize, labelZone, showsLabel, stickyTextZone } from './stickyLayout';
import { PAPER_RADIUS, paperOutline, stickyPaper } from './stickyPaper';

/**
 * Post-it typé du mode Event storming (sujet 475) : un papier aux coins arrondis à ombre douce (`stickyPaper.ts`), le
 * label du type en gras en haut, non modifiable, et le texte du ticket (la valeur) qui remplit la zone dessous
 * (`fitText=fill`). Le label suit le type (`spatial.kind`), pas la couleur : changer le fond ne change pas le type.
 * Dans draw.io, un rectangle arrondi de la couleur du type, à ombre, sans contour.
 */

/**
 * Label du type : feutre gras (sujet 476), noir à 80 %, centré dans sa ligne (aligné en haut, il prendrait un retrait de plus), sans
 * marge, sur une ligne.
 */
function labelStyle(shape: ShapeModel, size: number): Record<string, string> {
  return {
    ...shape.style,
    fontSize: String(size),
    fontStyle: '1',
    fontFamily: STICKY.labelFont,
    fontColor: '#000000',
    textOpacity: '80',
    align: 'center',
    verticalAlign: 'middle',
    whiteSpace: 'nowrap',
    fitText: '0',
    spacing: '0',
    spacingTop: '0',
    spacingLeft: '0',
    spacingRight: '0',
    spacingBottom: '0',
  };
}

/**
 * Titre du groupe tenu par ce post-it (sujet 514), d'après l'habillage du mode : gras, à gauche, sur une ligne, au-dessus
 * du groupe ; masqué pendant son édition (partie `group`), pas pendant celle du texte du post-it.
 */
function groupTitle(shape: ShapeModel, ctx: RenderContext): Object3D | null {
  const text = shape.style[TITLE_TEXT];
  if (!text) return null;
  const { fontSize, lineHeight, gap, color } = GROUP_TITLE;
  const height = fontSize * lineHeight;
  const left = styleNumber(shape.style, TITLE_LEFT, shape.bounds.x);
  const zone = { x: left, y: shape.bounds.y - gap - height, width: shape.bounds.x + shape.bounds.width - left, height };
  const style = {
    fontSize: String(fontSize),
    fontStyle: '1',
    fontColor: color,
    align: 'left',
    verticalAlign: 'middle',
    whiteSpace: 'nowrap',
    fitText: '0',
    spacing: '0',
    html: '0',
  };
  const label = createLabel({ ...shape, style }, ctx, text, zone, { fixed: true });
  if (label) markPart(label, GROUP_PART);
  return label;
}

function createSticky(type: StickyType, shape: ShapeModel, ctx: RenderContext): Object3D {
  const group = stickyPaper(shape, type.fill);
  group.name = `shape:${type.kind}`;
  const mark = isPivot(shape);
  // Pastille d'avertissement ou de pivot à décider (sujet 519), donnée par l'habillage du mode.
  const badge = drawnBadge(shape);
  if (showsLabel(shape)) {
    // Icône du pivot (sujet 516) et pastille (sujet 519) : le label tient entre elles.
    const zone = labelZone(
      shape.bounds,
      mark ? pivotMarkRect(shape.bounds).x - PIVOT_MARK.gap : undefined,
      badge && stickyBadgeRect(shape.bounds).x + STICKY_BADGE.size + STICKY_BADGE.gap,
    );
    const size = labelFontSize(type.label, zone.width, ctx.measureText);
    // Tronqué : « … » s'il ne tient pas à 10, et jamais la mise en forme de la valeur (même texte que le label).
    // Imposé : il reste affiché pendant l'édition du texte du ticket (sujet 485).
    const label = createLabel({ ...shape, style: labelStyle(shape, size) }, ctx, type.label, zone, {
      truncate: true,
      fixed: true,
    });
    if (label) group.add(label);
  }
  const text = createLabel(shape, ctx, shape.label, stickyTextZone(shape));
  if (text) group.add(text);
  if (mark) group.add(pivotMark(shape.bounds));
  if (badge) group.add(stickyBadge(badge, shape.bounds));
  const title = groupTitle(shape, ctx);
  if (title) group.add(title);
  return group;
}

/** Définition d'un post-it typé, rangé dans la palette dans l'ordre de `STICKY_TYPES`. */
export function stickyDefinition(type: StickyType): ShapeDefinition {
  return {
    id: type.kind,
    outline: paperOutline,
    contains: () => true,
    // Couleur du type, sans contour (sujet 483) : ni Style ni Bordure dans le panneau.
    styleable: false,
    // À plat seulement : le mode n'a que la vue de dessus, et un papier n'a pas de volume.
    flat: { create: (shape, ctx) => createSticky(type, shape, ctx) },
    // Le texte du ticket s'édite dans sa zone, sous le label.
    textZone: (shape) => stickyTextZone(shape),
    palette: {
      name: type.label,
      category: 'eventstorming',
      order: STICKY_TYPES.indexOf(type) + 1,
      keywords: ['event storming', 'post-it', type.label.toLowerCase(), ...type.keywords],
      description: `Ex. : ${type.examples.join(', ')}`,
      style:
        `rounded=1;absoluteArcSize=1;arcSize=${2 * PAPER_RADIUS};whiteSpace=wrap;html=1;fillColor=${type.fill};strokeColor=none;shadow=1;fontColor=#000000;` +
        `spacing=${STICKY.margin};fitText=fill;spatial.kind=${type.kind};`,
      value: '',
      width: STICKY.size,
      height: STICKY.size,
      // Papier de la couleur du type (les huit icônes se distinguent), trait du label en haut.
      icon: `<path d="M11 3h18v22H11z" fill="${type.fill}" stroke="none"/><path d="M15 7.5h10"/>`,
    },
    swatch: () => '<path d="M10 4h20v20H10z"/>',
  };
}
