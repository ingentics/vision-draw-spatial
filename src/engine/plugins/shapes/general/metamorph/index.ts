import { BufferGeometry, Color, DoubleSide, Float32BufferAttribute, Group, Mesh, MeshBasicMaterial } from 'three';
import {
  boxOutline,
  createBox,
  fillMesh,
  isoBlock,
  metamorphStateOf,
  PART_ORDER,
  spinHues,
  spinObject,
  strokeMesh,
  TOP_OFFSET,
} from '../../../../core/plugins';
import type { MetamorphState, Point, RenderContext, ShapeDefinition, ShapeModel } from '../../../../core/plugins';

/**
 * Metamorph (sujet 538) : forme à générer depuis une description, quand aucune forme ne convient. Rectangle noir et
 * blanc à angles droits, son texte (métier) tel quel, un halo arc-en-ciel tout autour qui tourne et pulse (« vou vou,
 * pause pause »), et une icône dans le coin haut-droit : loader qui tourne pendant que l'hôte génère les propositions, sinon l'étoile de l'IA (violette au brouillon, verte
 * quand les propositions sont prêtes). Reconnue par `spatial.kind=metamorph`, son état est `spatial.metamorph` (le
 * cycle est mené par le moteur, `domains/edit/metamorphs.ts`).
 */

const ACCENT = '#9673a6';
const READY = '#2e9d5b';
/** Côté de l'icône et marge au coin, en px de page. */
const ICON_SIZE = 18;
const ICON_MARGIN = 6;
/** Tours par seconde du loader. */
const SPIN_SPEED = 1;
/** Halo de 6 px tout autour : opacité au bord de la forme (nulle au bord extérieur), rayons qui portent les teintes. */
const HALO_WIDTH = 6;
const HALO_OPACITY = 0.8;
const HALO_RAYS = 120;
/** Tours par seconde de l'arc-en-ciel. */
const HALO_SPEED = 0.25;
/** Deux pulsations puis deux temps de repos, en boucle (« vou vou, pause pause ») ; au repos, le halo a la couleur du fond. */
const PULSE = { beat: 0.45, pattern: [1, 1, 0, 0] };

/** Angles droits, quel que soit le style. */
const outline = (shape: ShapeModel) => boxOutline(shape.bounds, { ...shape.style, rounded: '0' });

/** Arc de cercle centré sur l'origine, de `from` à `to` (radians, y vers le bas). */
function arc(radius: number, from: number, to: number, steps = 24): Point[] {
  return Array.from({ length: steps + 1 }, (_, i) => {
    const a = from + ((to - from) * i) / steps;
    return { x: radius * Math.cos(a), y: radius * Math.sin(a) };
  });
}

/** Étoile à quatre branches de l'IA, centrée sur l'origine, de rayon `r`. */
function star(r: number): Point[] {
  const inner = r * 0.3;
  return Array.from({ length: 8 }, (_, i) => {
    const a = -Math.PI / 2 + (i * Math.PI) / 4;
    const radius = i % 2 === 0 ? r : inner;
    return { x: radius * Math.cos(a), y: radius * Math.sin(a) };
  });
}

/**
 * Icône centrée sur l'origine (le groupe est posé au centre de l'icône, pour que le loader tourne sur lui-même) :
 * anneau ouvert aux trois quarts qui tourne pendant la génération, sinon l'étoile de l'IA.
 */
function stateIcon(state: MetamorphState, size: number): Group {
  const icon = new Group();
  icon.name = `metamorph-${state}`;
  const r = size / 2;
  if (state === 'morphing') {
    const track = strokeMesh(arc(r - 1.5, 0, 2 * Math.PI), new Color(ACCENT), 0.25, { width: 3, closed: true });
    const ring = strokeMesh(arc(r - 1.5, 0, 1.5 * Math.PI), new Color(ACCENT), 1, { width: 3, closed: false });
    for (const mesh of [track, ring]) if (mesh) icon.add(mesh);
    spinObject(icon, SPIN_SPEED);
  } else {
    icon.add(fillMesh(star(r), new Color(state === 'ready' ? READY : ACCENT), 1));
  }
  icon.traverse((child) => {
    if (child !== icon) child.renderOrder = PART_ORDER.label;
  });
  return icon;
}

/** Icône posée dans le coin haut-droit, à la hauteur `z`. */
function addStateIcon(group: Group, shape: ShapeModel, z: number): void {
  const state = metamorphStateOf(shape) ?? 'draft';
  const { x, y, width, height } = shape.bounds;
  // Icône réduite dans une forme plus petite qu'elle.
  const size = Math.min(ICON_SIZE, width - 2 * ICON_MARGIN, height - 2 * ICON_MARGIN);
  if (size <= 0) return;
  const icon = stateIcon(state, size);
  icon.position.set(x + width - ICON_MARGIN - size / 2, y + ICON_MARGIN + size / 2, z);
  group.add(icon);
}

/**
 * Halo arc-en-ciel au sol tout autour : anneau entre le bord de la forme et ce bord étendu de `HALO_WIDTH`, tracé par
 * rayons depuis le centre ; la teinte de chaque rayon est son angle, l'opacité va de `HALO_OPACITY` à 0 vers
 * l'extérieur. Les teintes tournent et pulsent (`spinHues`).
 */
function rainbowHalo(shape: ShapeModel, ctx: RenderContext): Mesh {
  const { x, y, width, height } = shape.bounds;
  const cx = x + width / 2;
  const cy = y + height / 2;
  const positions: number[] = [];
  const colors: number[] = [];
  const hues: number[] = [];
  const indices: number[] = [];
  for (let i = 0; i < HALO_RAYS; i++) {
    const angle = (i / HALO_RAYS) * 2 * Math.PI;
    const dx = Math.cos(angle);
    const dy = Math.sin(angle);
    // Distance du centre au bord d'un rectangle de demi-côtés (hw, hh) le long du rayon.
    const reach = (hw: number, hh: number) => Math.min(hw / Math.abs(dx || 1e-9), hh / Math.abs(dy || 1e-9));
    const inner = reach(width / 2, height / 2);
    const outer = reach(width / 2 + HALO_WIDTH, height / 2 + HALO_WIDTH);
    positions.push(cx + dx * inner, cy + dy * inner, 0, cx + dx * outer, cy + dy * outer, 0);
    colors.push(1, 1, 1, HALO_OPACITY, 1, 1, 1, 0);
    hues.push(i / HALO_RAYS, i / HALO_RAYS);
    const next = (i + 1) % HALO_RAYS;
    indices.push(2 * i, 2 * i + 1, 2 * next, 2 * next, 2 * i + 1, 2 * next + 1);
  }
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
  spinHues(halo, { turnsPerSecond: HALO_SPEED, background: ctx.background ?? '#ffffff', pulse: PULSE });
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
  flat: {
    create(shape, ctx) {
      const group = createBox(blackAndWhite(shape), outline(shape), ctx, DEFAULTS);
      group.name = 'shape:metamorph';
      group.add(rainbowHalo(shape, ctx));
      addStateIcon(group, shape, 0);
      return group;
    },
  },
  iso: {
    create(shape, ctx) {
      const group = block.create(blackAndWhite(shape), ctx) as Group;
      group.add(rainbowHalo(shape, ctx));
      const height = group.userData.height as number | undefined;
      addStateIcon(group, shape, height === undefined ? 0 : height + TOP_OFFSET);
      return group;
    },
  },
  palette: {
    name: 'Metamorph',
    category: 'general',
    order: 200,
    keywords: ['metamorph', 'générer', 'génération', 'nouvelle forme', 'ia'],
    description: 'Décrivez la forme voulue, elle sera générée',
    style: 'rounded=0;whiteSpace=wrap;html=1;spatial.kind=metamorph;spatial.metamorph=draft;',
    value: '',
    width: 80,
    height: 100,
    icon: '<path d="M6 4h28v20H6z"/><path d="M29 6.5l1 2.5 2.5 1-2.5 1-1 2.5-1-2.5-2.5-1 2.5-1z"/>',
    fallback: true,
  },
};
