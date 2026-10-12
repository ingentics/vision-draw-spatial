import { BufferGeometry, DoubleSide, Float32BufferAttribute, Mesh, MeshBasicMaterial } from 'three';
import type { Group } from 'three';
import { center, createBox, generationStateOf, isoBlock, PART_ORDER, spinHues } from '../../../../core/plugins';
import { blobOutline, outerRing } from './blob';
import type { RenderContext, ShapeDefinition, ShapeGeneration, ShapeModel } from '../../../../core/plugins';

/**
 * Metamorph (sujets 538, 539) : forme à générer depuis une description, quand aucune forme ne convient. Blob (contour
 * relevé sur une image de référence, `blob.ts`) noir et blanc, son texte (métier) tel quel. Son état se lit à son
 * halo : aucun au brouillon ; pendant la génération, un halo gris qui tourne et pulse (« vou vou, pause pause ») ;
 * quand les propositions attendent un choix, le même en arc-en-ciel. Reconnue par `spatial.kind=metamorph`, son état
 * est `spatial.metamorph` (`GENERATION` : le cycle est mené par le moteur, `domains/edit/generatedShapes.ts`).
 */

/**
 * Forme générée par l'hôte (sujet 545) : état `spatial.metamorph` (`draft`, `morphing` pendant la génération,
 * `ready`), instructions `spatial.metamorphInstructions` (attribut de l'objet).
 */
const GENERATION: ShapeGeneration = {
  title: 'Metamorph',
  stateKey: 'spatial.metamorph',
  states: { draft: 'draft', pending: 'morphing', ready: 'ready' },
  instructionsKey: 'spatial.metamorphInstructions',
};

/** Halo de 6 px tout autour : opacité au bord de la forme, nulle au bord extérieur. */
const HALO_WIDTH = 6;
const HALO_OPACITY = 0.8;
/** Tours par seconde des teintes. */
const HALO_SPEED = 0.25;
/** Deux pulsations puis deux temps de repos, en boucle (« vou vou, pause pause ») ; au repos, le halo a la couleur du fond. */
const PULSE = { beat: 0.45, pattern: [1, 1, 0, 0] };

const outline = (shape: ShapeModel) => blobOutline(shape.bounds);

/**
 * Halo au sol tout autour : anneau entre le contour et ce contour poussé de `HALO_WIDTH` vers l'extérieur ; la teinte
 * de chaque point est son angle autour du centre, l'opacité va de `HALO_OPACITY` à 0 vers l'extérieur. Les teintes
 * tournent et pulsent (`spinHues`) : en gris pendant la génération, en arc-en-ciel quand les propositions sont prêtes.
 * Aucun halo au brouillon.
 */
function stateHalo(shape: ShapeModel, ctx: RenderContext): Mesh | undefined {
  const state = generationStateOf(shape, GENERATION);
  if (state !== 'pending' && state !== 'ready') return undefined;
  const middle = center(shape.bounds);
  const ring = outerRing(outline(shape), HALO_WIDTH);
  const positions: number[] = [];
  const colors: number[] = [];
  const hues: number[] = [];
  const indices: number[] = [];
  ring.forEach(({ inner, outer }, i) => {
    const hue = (Math.atan2(inner.y - middle.y, inner.x - middle.x) / (2 * Math.PI) + 1) % 1;
    positions.push(inner.x, inner.y, 0, outer.x, outer.y, 0);
    colors.push(1, 1, 1, HALO_OPACITY, 1, 1, 1, 0);
    hues.push(hue, hue);
    const next = (i + 1) % ring.length;
    indices.push(2 * i, 2 * i + 1, 2 * next, 2 * next, 2 * i + 1, 2 * next + 1);
  });
  const geometry = new BufferGeometry();
  geometry.setAttribute('position', new Float32BufferAttribute(positions, 3));
  geometry.setAttribute('color', new Float32BufferAttribute(colors, 4));
  geometry.setAttribute('hue', new Float32BufferAttribute(hues, 1));
  geometry.setIndex(indices);
  const material = new MeshBasicMaterial({
    vertexColors: true,
    transparent: true,
    depthWrite: false,
    side: DoubleSide,
  });
  const halo = new Mesh(geometry, material);
  halo.name = 'metamorph-halo';
  // Sous la forme, comme une ombre : dans la place libre de l'élément précédent.
  halo.renderOrder = PART_ORDER.fill - 1;
  spinHues(halo, {
    turnsPerSecond: HALO_SPEED,
    background: ctx.background ?? '#ffffff',
    pulse: PULSE,
    gray: state === 'pending',
  });
  return halo;
}

/** Noir et blanc, bordure noire de 1 px, quel que soit le style. */
const blackAndWhite = (shape: ShapeModel): ShapeModel => ({
  ...shape,
  style: { ...shape.style, fillColor: '#ffffff', strokeColor: '#000000', strokeWidth: '1', dashed: '0', rounded: '0' },
});

const DEFAULTS = { fill: '#ffffff', stroke: '#000000' };
const block = isoBlock(outline, DEFAULTS);

export const definition: ShapeDefinition = {
  id: 'metamorph',
  outline,
  // Son aspect dit ce qu'elle est : ni Style ni Bordure.
  styleable: false,
  generation: GENERATION,
  flat: {
    create(shape, ctx) {
      const group = createBox(blackAndWhite(shape), outline(shape), ctx, DEFAULTS);
      group.name = 'shape:metamorph';
      const halo = stateHalo(shape, ctx);
      if (halo) group.add(halo);
      return group;
    },
  },
  iso: {
    create(shape, ctx) {
      const group = block.create(blackAndWhite(shape), ctx) as Group;
      const halo = stateHalo(shape, ctx);
      if (halo) group.add(halo);
      return group;
    },
  },
  palette: {
    name: 'Metamorph',
    category: 'general',
    order: 200,
    keywords: ['metamorph', 'générer', 'génération', 'nouvelle forme', 'ia'],
    description: 'Décrivez la forme voulue, elle sera générée',
    style:
      'rounded=0;whiteSpace=wrap;html=1;verticalLabelPosition=bottom;verticalAlign=top;spatial.kind=metamorph;spatial.metamorph=draft;',
    value: '',
    width: 60,
    height: 60,
    icon: '<path d="M19.1 3L19.9 3.1L20.6 3.6L21.5 3.9L23.5 3.7L24.2 3.9L24.7 4.4L25.1 5L25.7 6.9L26.3 8L27.1 9L28.8 9.9L29.2 10.3L29.6 10.8L29.8 11.3L29.7 12L29.5 12.7L28.8 13.4L28.4 14.1L28.3 15.5L28.7 16.7L30.4 19.3L30.9 20.5L31 21.3L30.8 22.4L30.6 23.1L30.1 23.6L29.3 23.9L26.7 23.6L25.4 23.7L24 24L22.5 24.6L20.8 24.9L18.9 24.9L17.2 24.4L14.3 22.9L13.5 22.7L11.6 22.7L10.9 22.6L9.9 22L9.3 21.2L9 20.1L9 19.3L9.2 18.4L9.7 17.3L11 15.8L11.8 14.3L12.3 13.1L12.7 11.7L12.7 10.1L11.9 7.5L11.9 6.8L12.1 5.9L12.7 5.2L13.8 4.8L16.5 4.8L17.4 4.3L18.3 3.3Z"/>',
    fallback: true,
  },
};
