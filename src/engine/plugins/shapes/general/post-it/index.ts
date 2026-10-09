import { Color, Group } from 'three';
import { createBox, fillMesh, PART_ORDER, rectPath } from '../../../../core/plugins';
import type { Point, Rect, ShapeDefinition, ShapeModel } from '../../../../core/plugins';

/**
 * Post-it (sujet 411) : carré jaune sans contour, posé à plat avec une ombre douce dessous, texte noir qui remplit
 * la forme (`fitText=fill` : agrandi ou réduit, 6 au minimum, puis « … »). Reconnu par `spatial.kind=post-it` ; dans
 * draw.io, un rectangle jaune à ombre.
 */

/** Ombre : décalée vers le bas, floue, noire à 25 % au plus foncé. */
const SHADOW_OFFSET = 4;
const SHADOW_BLUR = 8;
const SHADOW_OPACITY = 0.25;
/** Couches du flou : rectangles de plus en plus étendus, dont les opacités s'additionnent vers le centre. */
const SHADOW_LAYERS = 16;
/** Bas de l'ombre élargi, haut rentré : le papier semble un peu décollé en bas. */
const SHADOW_FLARE = 2;

/** Contour de l'ombre étendu de `spread` : trapèze plus large en bas, décalé vers le bas. */
function shadowPath({ x, y, width, height }: Rect, spread: number): Point[] {
  const top = y + SHADOW_OFFSET - spread;
  const bottom = y + height + SHADOW_OFFSET + spread;
  return [
    { x: x + SHADOW_FLARE - spread, y: top },
    { x: x + width - SHADOW_FLARE + spread, y: top },
    { x: x + width + SHADOW_FLARE / 2 + spread, y: bottom },
    { x: x - SHADOW_FLARE / 2 - spread, y: bottom },
  ];
}

/** Ombre floue : couches superposées, chacune assez transparente pour qu'au centre elles donnent `SHADOW_OPACITY`. */
function shadow(bounds: Rect): Group {
  const group = new Group();
  group.name = 'shadow';
  const layer = 1 - Math.pow(1 - SHADOW_OPACITY, 1 / SHADOW_LAYERS);
  for (let i = 0; i < SHADOW_LAYERS; i++) {
    const mesh = fillMesh(shadowPath(bounds, (SHADOW_BLUR * (i + 0.5)) / SHADOW_LAYERS), new Color('#000000'), layer);
    mesh.name = 'shadow';
    // Sous le papier, sous tous les angles : dessinée juste avant son fond, dans la place libre (la 4e) de l'élément
    // précédent, au lieu d'être départagée par la profondeur (en iso, l'ombre passerait devant le papier).
    mesh.renderOrder = PART_ORDER.fill - 1;
    group.add(mesh);
  }
  return group;
}

const outline = (shape: ShapeModel) => rectPath(shape.bounds);

export const definition: ShapeDefinition = {
  id: 'post-it',
  outline,
  contains: () => true,
  // À plat au sol en iso et en 3D (pas de rendu `iso`) : un papier n'a pas de volume.
  flat: {
    create(shape, ctx) {
      // Jamais de contour, même après un style du panneau (qui n'en change que le fond).
      const paper = { ...shape, style: { ...shape.style, strokeColor: 'none' } };
      const group = createBox(paper, outline(shape), ctx, { fill: '#fff2cc', stroke: '#000000' });
      group.name = 'shape:post-it';
      group.add(shadow(shape.bounds));
      return group;
    },
  },
  palette: {
    name: 'Post-it',
    category: 'general',
    order: 102,
    keywords: ['post-it', 'postit', 'note', 'sticky', 'pense-bête', 'mémo', 'memo'],
    style:
      'rounded=0;whiteSpace=wrap;html=1;fillColor=#fff2cc;strokeColor=none;shadow=1;fontColor=#000000;spacing=8;fitText=fill;spatial.kind=post-it;',
    value: '',
    width: 160,
    height: 160,
    icon: '<path d="M11 3h18v20H11z"/><path d="M12 24.5h17" opacity="0.5"/>',
  },
  swatch: () => '<path d="M10 4h20v20H10z"/>',
};
